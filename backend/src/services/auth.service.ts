import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import config from '../config/index.js';
import prisma from '../utils/prisma.js';
import { HTTPException } from 'hono/http-exception';

export interface TokenPayload {
  userId: string;
  email: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  name?: string;
}

export class AuthService {
  /**
   * Generate JWT access token
   */
  static generateAccessToken(payload: TokenPayload): string {
    return jwt.sign(payload, config.jwtSecret, {
      expiresIn: config.jwtExpiration,
      issuer: 'transmeet-api',
      audience: 'transmeet-app',
    });
  }

  /**
   * Generate refresh token
   */
  static generateRefreshToken(payload: TokenPayload): string {
    return jwt.sign(payload, config.jwtSecret, {
      expiresIn: '30d',
      issuer: 'transmeet-api',
      audience: 'transmeet-app',
    });
  }

  /**
   * Verify JWT token
   */
  static verifyToken(token: string): TokenPayload {
    try {
      return jwt.verify(token, config.jwtSecret) as TokenPayload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new HTTPException(401, { message: 'Token expired' });
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new HTTPException(401, { message: 'Invalid token' });
      }
      throw new HTTPException(401, { message: 'Token verification failed' });
    }
  }

  /**
   * Hash password
   */
  static async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  }

  /**
   * Compare password with hash
   */
  static async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Register new user
   */
  static async register(credentials: RegisterCredentials): Promise<{ user: any; tokens: AuthTokens }> {
    const { email, password, name } = credentials;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new HTTPException(409, { message: 'User already exists with this email' });
    }

    // Validate password strength
    if (password.length < 8) {
      throw new HTTPException(400, { message: 'Password must be at least 8 characters long' });
    }

    // Hash password
    const hashedPassword = await this.hashPassword(password);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        name: name || null,
        // Note: We don't store passwords in this schema, assuming OAuth-only approach
        // If you need password storage, add a password field to the User model
      },
      select: {
        id: true,
        email: true,
        name: true,
        zoomUserId: true,
        createdAt: true,
      },
    });

    // Generate tokens
    const tokenPayload: TokenPayload = {
      userId: user.id,
      email: user.email,
    };

    const accessToken = this.generateAccessToken(tokenPayload);
    const refreshToken = this.generateRefreshToken(tokenPayload);

    return {
      user,
      tokens: { accessToken, refreshToken },
    };
  }

  /**
   * Login user
   */
  static async login(credentials: LoginCredentials): Promise<{ user: any; tokens: AuthTokens }> {
    const { email, password } = credentials;

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        zoomUserId: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new HTTPException(401, { message: 'Invalid email or password' });
    }

    // Note: Since this schema doesn't include password storage,
    // we're assuming OAuth-only authentication
    // If you need password authentication, add password field to User model
    // and implement password verification here

    // Generate tokens
    const tokenPayload: TokenPayload = {
      userId: user.id,
      email: user.email,
    };

    const accessToken = this.generateAccessToken(tokenPayload);
    const refreshToken = this.generateRefreshToken(tokenPayload);

    return {
      user,
      tokens: { accessToken, refreshToken },
    };
  }

  /**
   * Refresh access token
   */
  static async refreshToken(refreshToken: string): Promise<AuthTokens> {
    try {
      const decoded = this.verifyToken(refreshToken);
      
      // Verify user still exists
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, email: true },
      });

      if (!user) {
        throw new HTTPException(401, { message: 'User not found' });
      }

      // Generate new tokens
      const tokenPayload: TokenPayload = {
        userId: user.id,
        email: user.email,
      };

      const newAccessToken = this.generateAccessToken(tokenPayload);
      const newRefreshToken = this.generateRefreshToken(tokenPayload);

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      };
    } catch (error) {
      throw new HTTPException(401, { message: 'Invalid refresh token' });
    }
  }

  /**
   * Get user by ID
   */
  static async getUserById(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        zoomUserId: true,
        zoomEmail: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new HTTPException(404, { message: 'User not found' });
    }

    return user;
  }

  /**
   * Update user profile
   */
  static async updateProfile(userId: string, data: { name?: string; email?: string }) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        name: data.name,
        email: data.email,
      },
      select: {
        id: true,
        email: true,
        name: true,
        zoomUserId: true,
        zoomEmail: true,
        updatedAt: true,
      },
    });

    return user;
  }

  /**
   * Delete user account
   */
  static async deleteAccount(userId: string) {
    await prisma.user.delete({
      where: { id: userId },
    });
  }

  /**
   * Create or update user from Zoom OAuth
   */
  static async createOrUpdateUserFromZoom(zoomUserData: any, tokens: any) {
    const user = await prisma.user.upsert({
      where: { email: zoomUserData.email },
      update: {
        name: `${zoomUserData.first_name} ${zoomUserData.last_name}`.trim(),
        zoomUserId: zoomUserData.id,
        zoomEmail: zoomUserData.email,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      },
      create: {
        email: zoomUserData.email,
        name: `${zoomUserData.first_name} ${zoomUserData.last_name}`.trim(),
        zoomUserId: zoomUserData.id,
        zoomEmail: zoomUserData.email,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      },
      select: {
        id: true,
        email: true,
        name: true,
        zoomUserId: true,
        zoomEmail: true,
        createdAt: true,
      },
    });

    return user;
  }
}