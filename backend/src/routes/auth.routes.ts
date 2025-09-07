import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { AuthService } from '../services/auth.service.js';
import { ZoomService } from '../services/zoom.service.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import config from '../config/index.js';
import prisma from '../utils/prisma.js';

const authRoutes = new Hono();

/**
 * POST /auth/register
 * Register a new user
 */
authRoutes.post('/register', async (c) => {
  try {
    const { email, password, name } = await c.req.json();

    if (!email || !password) {
      throw new HTTPException(400, { message: 'Email and password are required' });
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new HTTPException(400, { message: 'Invalid email format' });
    }

    const result = await AuthService.register({ email, password, name });

    return c.json({
      success: true,
      message: 'User registered successfully',
      user: result.user,
      tokens: result.tokens,
    });
  } catch (error: any) {
    if (error instanceof HTTPException) {
      throw error;
    }
    console.error('Registration error:', error);
    throw new HTTPException(500, { message: 'Registration failed' });
  }
});

/**
 * POST /auth/login
 * Login user
 */
authRoutes.post('/login', async (c) => {
  try {
    const { email, password } = await c.req.json();

    if (!email || !password) {
      throw new HTTPException(400, { message: 'Email and password are required' });
    }

    const result = await AuthService.login({ email, password });

    return c.json({
      success: true,
      message: 'Login successful',
      user: result.user,
      tokens: result.tokens,
    });
  } catch (error: any) {
    if (error instanceof HTTPException) {
      throw error;
    }
    console.error('Login error:', error);
    throw new HTTPException(500, { message: 'Login failed' });
  }
});

/**
 * POST /auth/refresh
 * Refresh access token
 */
authRoutes.post('/refresh', async (c) => {
  try {
    const { refreshToken } = await c.req.json();

    if (!refreshToken) {
      throw new HTTPException(400, { message: 'Refresh token is required' });
    }

    const tokens = await AuthService.refreshToken(refreshToken);

    return c.json({
      success: true,
      message: 'Token refreshed successfully',
      tokens,
    });
  } catch (error: any) {
    if (error instanceof HTTPException) {
      throw error;
    }
    console.error('Token refresh error:', error);
    throw new HTTPException(500, { message: 'Token refresh failed' });
  }
});

/**
 * GET /auth/me
 * Get current user profile
 */
authRoutes.get('/me', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId');
    const user = await AuthService.getUserById(userId);

    return c.json({
      success: true,
      user,
    });
  } catch (error: any) {
    if (error instanceof HTTPException) {
      throw error;
    }
    console.error('Get profile error:', error);
    throw new HTTPException(500, { message: 'Failed to fetch profile' });
  }
});

/**
 * PUT /auth/profile
 * Update user profile
 */
authRoutes.put('/profile', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId');
    const { name, email } = await c.req.json();

    const user = await AuthService.updateProfile(userId, { name, email });

    return c.json({
      success: true,
      message: 'Profile updated successfully',
      user,
    });
  } catch (error: any) {
    if (error instanceof HTTPException) {
      throw error;
    }
    console.error('Profile update error:', error);
    throw new HTTPException(500, { message: 'Failed to update profile' });
  }
});

/**
 * DELETE /auth/account
 * Delete user account
 */
authRoutes.delete('/account', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId');
    await AuthService.deleteAccount(userId);

    return c.json({
      success: true,
      message: 'Account deleted successfully',
    });
  } catch (error: any) {
    if (error instanceof HTTPException) {
      throw error;
    }
    console.error('Account deletion error:', error);
    throw new HTTPException(500, { message: 'Failed to delete account' });
  }
});

/**
 * GET /auth/zoom
 * Get Zoom OAuth authorization URL
 */
authRoutes.get('/zoom', authMiddleware, async (c) => {
  try {
    const authUrl = ZoomService.getAuthorizationUrl();

    return c.json({
      success: true,
      authUrl,
      message: 'Redirect user to this URL for Zoom authorization',
    });
  } catch (error: any) {
    console.error('Zoom auth URL error:', error);
    throw new HTTPException(500, { message: 'Failed to generate authorization URL' });
  }
});

/**
 * GET /auth/zoom/callback
 * Handle Zoom OAuth callback
 */
authRoutes.get('/zoom/callback', async (c) => {
  try {
    const code = c.req.query('code');
    const error = c.req.query('error');
    const state = c.req.query('state'); // Can be used for CSRF protection

    if (error) {
      console.error('Zoom OAuth error:', error);
      
      // Redirect to frontend with error
      const redirectUrl = `${config.frontend.url}/auth/zoom/callback?error=${encodeURIComponent(error)}`;
      return c.redirect(redirectUrl);
    }

    if (!code) {
      throw new HTTPException(400, { message: 'Authorization code is required' });
    }

    // Exchange code for tokens
    const tokens = await ZoomService.exchangeCodeForTokens(code);

    // Get user information from Zoom
    const zoomService = ZoomService.getInstance();
    
    // Create a temporary access token to get user info
    const tempUserId = 'temp';
    
    // Get Zoom user info using the access token directly
    try {
      const response = await fetch('https://api.zoom.us/v2/users/me', {
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user info from Zoom');
      }

      const zoomUserData = await response.json();

      // Create or update user in our database
      const user = await AuthService.createOrUpdateUserFromZoom(zoomUserData, tokens);

      // Generate our JWT tokens
      const ourTokens = {
        accessToken: AuthService.generateAccessToken({
          userId: user.id,
          email: user.email,
        }),
        refreshToken: AuthService.generateRefreshToken({
          userId: user.id,
          email: user.email,
        }),
      };

      // Redirect to frontend with success
      const redirectUrl = `${config.frontend.url}/auth/zoom/callback?success=true&token=${ourTokens.accessToken}&refresh=${ourTokens.refreshToken}`;
      return c.redirect(redirectUrl);

    } catch (userInfoError: any) {
      console.error('Failed to get user info:', userInfoError);
      const redirectUrl = `${config.frontend.url}/auth/zoom/callback?error=${encodeURIComponent('Failed to get user information')}`;
      return c.redirect(redirectUrl);
    }

  } catch (error: any) {
    console.error('Zoom callback error:', error);
    
    if (error instanceof HTTPException) {
      const redirectUrl = `${config.frontend.url}/auth/zoom/callback?error=${encodeURIComponent(error.message)}`;
      return c.redirect(redirectUrl);
    }

    const redirectUrl = `${config.frontend.url}/auth/zoom/callback?error=${encodeURIComponent('OAuth callback failed')}`;
    return c.redirect(redirectUrl);
  }
});

/**
 * POST /auth/zoom/disconnect
 * Disconnect Zoom account
 */
authRoutes.post('/zoom/disconnect', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId');

    // Clear Zoom authentication data
    await prisma.user.update({
      where: { id: userId },
      data: {
        zoomUserId: null,
        zoomEmail: null,
        accessToken: null,
        refreshToken: null,
        tokenExpiresAt: null,
      },
    });

    return c.json({
      success: true,
      message: 'Zoom account disconnected successfully',
    });
  } catch (error: any) {
    console.error('Zoom disconnect error:', error);
    throw new HTTPException(500, { message: 'Failed to disconnect Zoom account' });
  }
});

/**
 * GET /auth/zoom/status
 * Check Zoom authentication status
 */
authRoutes.get('/zoom/status', authMiddleware, async (c) => {
  try {
    const user = c.get('user');

    const isConnected = !!user.zoomUserId;
    let tokenValid = false;

    if (isConnected) {
      // Check if we have user data with token expiration
      const userWithTokens = await prisma.user.findUnique({
        where: { id: user.id },
        select: {
          tokenExpiresAt: true,
          accessToken: true,
        },
      });

      tokenValid = !!(
        userWithTokens?.accessToken &&
        userWithTokens?.tokenExpiresAt &&
        userWithTokens.tokenExpiresAt > new Date()
      );
    }

    return c.json({
      success: true,
      zoom: {
        connected: isConnected,
        tokenValid,
        email: user.zoomUserId ? user.email : null,
      },
    });
  } catch (error: any) {
    console.error('Zoom status check error:', error);
    throw new HTTPException(500, { message: 'Failed to check Zoom status' });
  }
});

/**
 * POST /auth/logout
 * Logout user (client-side token invalidation)
 */
authRoutes.post('/logout', authMiddleware, async (c) => {
  // Since we're using stateless JWT tokens, logout is primarily client-side
  // The client should delete the stored tokens
  // In a production app, you might want to maintain a blacklist of tokens
  
  return c.json({
    success: true,
    message: 'Logged out successfully',
  });
});

export default authRoutes;