import { Context, Next } from 'hono';
import { HTTPException } from 'hono/http-exception';
import jwt from 'jsonwebtoken';
import config from '../config/index.js';
import prisma from '../utils/prisma.js';

export interface JWTPayload {
  userId: string;
  email: string;
  iat?: number;
  exp?: number;
}

declare module 'hono' {
  interface ContextVariableMap {
    user: {
      id: string;
      email: string;
      name: string | null;
      zoomUserId: string | null;
    };
    userId: string;
  }
}

export const authMiddleware = async (c: Context, next: Next) => {
  try {
    // Get token from Authorization header
    const authHeader = c.req.header('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new HTTPException(401, { message: 'Access token required' });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify JWT token
    let decoded: JWTPayload;
    try {
      decoded = jwt.verify(token, config.jwtSecret) as JWTPayload;
    } catch (jwtError) {
      if (jwtError instanceof jwt.TokenExpiredError) {
        throw new HTTPException(401, { message: 'Token expired' });
      } else if (jwtError instanceof jwt.JsonWebTokenError) {
        throw new HTTPException(401, { message: 'Invalid token' });
      } else {
        throw new HTTPException(401, { message: 'Token verification failed' });
      }
    }

    // Fetch user from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
        zoomUserId: true,
      },
    });

    if (!user) {
      throw new HTTPException(401, { message: 'User not found' });
    }

    // Set user context
    c.set('user', user);
    c.set('userId', user.id);

    await next();
  } catch (error) {
    if (error instanceof HTTPException) {
      throw error;
    }
    
    console.error('Auth middleware error:', error);
    throw new HTTPException(500, { message: 'Internal server error' });
  }
};

export const optionalAuthMiddleware = async (c: Context, next: Next) => {
  try {
    const authHeader = c.req.header('authorization');
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      try {
        const decoded = jwt.verify(token, config.jwtSecret) as JWTPayload;
        
        const user = await prisma.user.findUnique({
          where: { id: decoded.userId },
          select: {
            id: true,
            email: true,
            name: true,
            zoomUserId: true,
          },
        });

        if (user) {
          c.set('user', user);
          c.set('userId', user.id);
        }
      } catch (jwtError) {
        // Silently fail for optional auth
        console.log('Optional auth failed:', jwtError.message);
      }
    }

    await next();
  } catch (error) {
    console.error('Optional auth middleware error:', error);
    await next(); // Continue even if auth fails
  }
};

export const requireZoomAuth = async (c: Context, next: Next) => {
  const user = c.get('user');
  
  if (!user.zoomUserId) {
    throw new HTTPException(403, { 
      message: 'Zoom authentication required',
      cause: 'ZOOM_AUTH_REQUIRED'
    });
  }

  await next();
};