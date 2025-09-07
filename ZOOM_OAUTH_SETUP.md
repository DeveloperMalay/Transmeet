# Zoom OAuth Setup Guide

## Overview
This guide explains how to set up Zoom OAuth for the Transmeet application. The OAuth flow allows users to connect their Zoom accounts to access meeting data, transcripts, and recordings.

## Prerequisites
1. A Zoom account
2. Access to Zoom App Marketplace
3. Both frontend and backend servers running

## Zoom App Configuration

### 1. Create a Zoom OAuth App
1. Go to [Zoom App Marketplace](https://marketplace.zoom.us/)
2. Click on "Develop" → "Build App"
3. Choose "OAuth" as the app type
4. Fill in the app information:
   - App Name: Transmeet (or your preferred name)
   - Short Description: Meeting intelligence platform
   - Company Name: Your company name

### 2. Configure OAuth Settings
In your Zoom App settings, configure the following:

#### Redirect URL
```
http://localhost:3000/zoom-callback
```
For production, use:
```
https://yourdomain.com/zoom-callback
```

#### Scopes Required
Add the following scopes to your app:
- `user:read` - Read user profile information
- `meeting:read` - Read meeting information
- `recording:read` - Read recording information

#### App Credentials
After creating the app, you'll receive:
- Client ID
- Client Secret
- Verification Token (for webhooks)

## Environment Configuration

### Backend (.env file)
```env
# Zoom OAuth Configuration
ZOOM_ACCOUNT_ID="your-zoom-account-id"
ZOOM_CLIENT_ID="your-zoom-client-id"
ZOOM_CLIENT_SECRET="your-zoom-client-secret"
ZOOM_SECRET_TOKEN="your-zoom-secret-token"
ZOOM_VERIFICATION_TOKEN="your-zoom-verification-token"
ZOOM_REDIRECT_URI="http://localhost:3000/zoom-callback"
```

### Frontend (.env.local file)
```env
NEXT_PUBLIC_API_URL=http://localhost:4000
```

## OAuth Flow Architecture

### 1. Authorization Request
```
User clicks "Connect with Zoom"
    ↓
Frontend requests auth URL from backend
GET /api/auth/zoom
    ↓
Backend generates URL with state parameter
    ↓
User redirected to Zoom OAuth page
```

### 2. User Authorization
```
User authorizes app on Zoom
    ↓
Zoom redirects to frontend callback
/zoom-callback?code=xxx&state=yyy
```

### 3. Token Exchange
```
Frontend callback page receives code & state
    ↓
Sends to backend for validation
POST /api/auth/zoom/callback
    ↓
Backend validates state
    ↓
Exchanges code for access tokens
    ↓
Fetches user info from Zoom
    ↓
Updates database with Zoom connection
    ↓
Returns new JWT tokens
```

### 4. Connection Complete
```
Frontend updates user state
    ↓
Redirects to dashboard
```

## File Structure

### Frontend
- `/app/connect-zoom/page.tsx` - Zoom connection page
- `/app/zoom-callback/page.tsx` - OAuth callback handler
- `/store/authStore.ts` - Authentication state management
- `/lib/api.ts` - API client with Zoom endpoints

### Backend
- `/src/routes/auth.routes.ts` - Authentication routes
- `/src/controllers/auth.controller.ts` - OAuth handlers
- `/src/services/zoom.service.ts` - Zoom API integration
- `/src/config/index.ts` - Configuration management

## Security Considerations

### State Parameter
The OAuth flow uses a state parameter to prevent CSRF attacks:
1. Backend generates a base64-encoded state with userId and timestamp
2. State is validated on callback to ensure it matches
3. Prevents unauthorized callback requests

### Token Storage
- Access tokens are stored encrypted in the database
- Refresh tokens are used to maintain long-term access
- Tokens are automatically refreshed when expired

### CORS Configuration
Ensure your backend CORS settings allow requests from your frontend domain:
```typescript
cors: {
  origin: ['http://localhost:3000'],
  credentials: true,
}
```

## Testing the Flow

### Local Development
1. Start the backend server:
   ```bash
   cd backend
   bun run dev
   ```

2. Start the frontend server:
   ```bash
   cd frontend
   npm run dev
   ```

3. Navigate to `/connect-zoom` in your browser
4. Click "Connect with Zoom"
5. Authorize the app on Zoom
6. Verify successful connection and redirect to dashboard

### Troubleshooting

#### Common Issues
1. **Invalid redirect URI**: Ensure the redirect URI in Zoom app settings matches exactly with your environment variable
2. **CORS errors**: Check backend CORS configuration
3. **State validation failure**: Ensure both frontend and backend are using the same state encoding/decoding
4. **Token expiration**: Implement token refresh logic in the Zoom service

#### Debug Steps
1. Check browser console for errors
2. Check network tab for API responses
3. Verify environment variables are loaded correctly
4. Check backend logs for OAuth errors

## Production Deployment

### Checklist
- [ ] Update ZOOM_REDIRECT_URI to production URL
- [ ] Use HTTPS for all URLs
- [ ] Store secrets securely (e.g., AWS Secrets Manager)
- [ ] Enable rate limiting on OAuth endpoints
- [ ] Implement proper error logging
- [ ] Set up monitoring for OAuth failures
- [ ] Test the complete flow in production

### Environment Variables
Ensure all Zoom-related environment variables are set in your production environment:
- Vercel: Add via dashboard
- Heroku: Use config vars
- AWS: Use Parameter Store or Secrets Manager

## Support
For issues with Zoom OAuth, check:
- [Zoom OAuth Documentation](https://marketplace.zoom.us/docs/guides/auth/oauth)
- [Zoom API Reference](https://marketplace.zoom.us/docs/api-reference/introduction)
- Application logs for specific error messages