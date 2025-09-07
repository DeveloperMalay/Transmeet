import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { AuthService } from '../services/auth.service.js';
import { ZoomService } from '../services/zoom.service.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import config from '../config/index.js';
import prisma from '../utils/prisma.js';
import { generateZoomUrl, handleZoomCallback } from "../controllers/auth.controller.js";

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
      requiresVerification: result.requiresVerification,
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
 * POST /auth/verify-otp
 * Verify OTP for email verification
 */
authRoutes.post('/verify-otp', authMiddleware, async (c) => {
  try {
    const { userId, otp } = await c.req.json();

    if (!userId || !otp) {
      throw new HTTPException(400, { message: 'User ID and OTP are required' });
    }

    const result = await AuthService.verifyOTP(userId, otp);

    return c.json({
      success: true,
      message: 'Email verified successfully',
      user: result.user,
      tokens: result.tokens,
    });
  } catch (error: any) {
    if (error instanceof HTTPException) {
      throw error;
    }
    console.error('OTP verification error:', error);
    throw new HTTPException(500, { message: 'OTP verification failed' });
  }
});

/**
 * POST /auth/resend-otp
 * Resend OTP for email verification
 */
authRoutes.post('/resend-otp', authMiddleware, async (c) => {
  try {
    const { userId } = await c.req.json();

    if (!userId) {
      throw new HTTPException(400, { message: 'User ID is required' });
    }

    await AuthService.resendOTP(userId);

    return c.json({
      success: true,
      message: 'OTP sent successfully',
    });
  } catch (error: any) {
    if (error instanceof HTTPException) {
      throw error;
    }
    console.error('OTP resend error:', error);
    throw new HTTPException(500, { message: 'Failed to resend OTP' });
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
// authRoutes.delete('/account', authMiddleware, async (c) => {
//   try {
//     const userId = c.get('userId');
//     await AuthService.deleteAccount(userId);

//     return c.json({
//       success: true,
//       message: 'Account deleted successfully',
//     });
//   } catch (error: any) {
//     if (error instanceof HTTPException) {
//       throw error;
//     }
//     console.error('Account deletion error:', error);
//     throw new HTTPException(500, { message: 'Failed to delete account' });
//   }
// });

/**
 * GET /auth/zoom
 * Generate Zoom OAuth authorization URL with state
 */
authRoutes.get('/zoom', authMiddleware, generateZoomUrl);

/**
 * POST /auth/zoom/callback
 * Handle Zoom OAuth callback from frontend
 */
authRoutes.post('/zoom/callback', authMiddleware, handleZoomCallback);

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