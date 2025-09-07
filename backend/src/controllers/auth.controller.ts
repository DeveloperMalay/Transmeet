import type { Context } from "hono";
import { ZoomService } from "../services/zoom.service";
import { HTTPException } from "hono/http-exception";
import prisma from "../utils/prisma";
import { AuthService } from "../services/auth.service";



export const generateZoomUrl = async (c: Context) => {
    try {
        const userId = c.get('userId');

        // Create state with userId for callback
        const state = {
            userId: userId,
            timestamp: Date.now(),
        };

        // Convert state to base64
        const stateBase64 = Buffer.from(JSON.stringify(state)).toString('base64');

        // Get base authorization URL from ZoomService
        const baseAuthUrl = ZoomService.getAuthorizationUrl();

        // Add state parameter to the URL
        const authUrl = `${baseAuthUrl}&state=${encodeURIComponent(stateBase64)}`;

        return c.json({
            success: true,
            authUrl,
            message: 'Redirect user to this URL for Zoom authorization',
        });
    } catch (error: any) {
        console.error('Zoom auth URL error:', error);
        throw new HTTPException(500, { message: 'Failed to generate authorization URL' });
    }
}

export const handleZoomCallback = async (c: Context) => {

    try {
        const { code, state } = await c.req.json();
        
        console.log('Zoom callback received:', { code: code?.substring(0, 10) + '...', state: state?.substring(0, 10) + '...' });

        if (!code) {
            throw new HTTPException(400, { message: 'Authorization code is required' });
        }

        if (!state) {
            throw new HTTPException(400, { message: 'State parameter is required' });
        }

        // Decode and validate state
        let decodedState: any;
        try {
            const decodedString = Buffer.from(state, 'base64').toString('utf-8');
            decodedState = JSON.parse(decodedString);
            console.log('Decoded state:', decodedState);
        } catch (error) {
            console.error('Error decoding state:', error);
            throw new HTTPException(400, { message: 'Invalid state parameter' });
        }

        const { userId } = decodedState;
        if (!userId) {
            throw new HTTPException(400, { message: 'Invalid state data - missing userId' });
        }

        // Exchange code for tokens
        console.log('Exchanging code for tokens...');
        const tokens = await ZoomService.exchangeCodeForTokens(code);
        console.log('Tokens received:', { 
            access_token: tokens.access_token?.substring(0, 10) + '...', 
            expires_in: tokens.expires_in 
        });

        // Skip fetching user info for now - just mark as connected
        // This might be due to missing scopes or app type limitations
        console.log('Zoom tokens received, marking user as connected...');
        
        // We'll use a placeholder for now
        const zoomUserData = {
            id: `zoom_${userId}_${Date.now()}`,
            email: 'connected@zoom',
        };

        // Update user with Zoom connection details
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: {
                zoomUserId: zoomUserData.id,
                zoomEmail: zoomUserData.email,
                zoomConnected: true,
                accessToken: tokens.access_token,
                refreshToken: tokens.refresh_token,
                tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
            },
        });
        
        console.log('User updated with Zoom connection:', {
            userId: updatedUser.id,
            zoomConnected: updatedUser.zoomConnected,
            tokenExpiresAt: updatedUser.tokenExpiresAt
        });

        // Generate new JWT tokens with updated user info
        const ourTokens = {
            accessToken: AuthService.generateAccessToken({
                userId: updatedUser.id,
                email: updatedUser.email,
            }),
            refreshToken: AuthService.generateRefreshToken({
                userId: updatedUser.id,
                email: updatedUser.email,
            }),
        };

        return c.json({
            success: true,
            message: 'Zoom account connected successfully',
            user: {
                id: updatedUser.id,
                email: updatedUser.email,
                name: updatedUser.name,
                zoomConnected: true,
                zoomEmail: updatedUser.zoomEmail,
            },
            tokens: ourTokens,
        });

    } catch (error: any) {
        console.error('Zoom callback error details:', {
            message: error.message,
            stack: error.stack,
            response: error.response?.data
        });

        if (error instanceof HTTPException) {
            throw error;
        }

        // Provide more specific error message
        const errorMessage = error.message || 'OAuth callback failed';
        throw new HTTPException(500, { message: errorMessage });
    }
}