import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import config from '../config/index.js';
import prisma from '../utils/prisma.js';
import { HTTPException } from 'hono/http-exception';
import { NotificationService } from './notification.service.js';

export interface TokenPayload {
  userId: string;
  email: string;
  emailVerified: boolean;
  zoomConnected: boolean;
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
   * Generate 6-digit OTP
   */
  static generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

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
      const decoded = jwt.verify(token, config.jwtSecret, {
        issuer: 'transmeet-api',
        audience: 'transmeet-app',
      }) as TokenPayload;
      return decoded;
    } catch (error) {
      throw new HTTPException(401, { message: 'Invalid or expired token' });
    }
  }

  /**
   * Hash password
   */
  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }

  /**
   * Verify password
   */
  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Register new user
   */
  static async register(credentials: RegisterCredentials): Promise<{ user: any; tokens: AuthTokens }> {
    const { email, password, name } = credentials;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new HTTPException(400, { message: 'User with this email already exists' });
    }

    // Validate password
    if (password.length < 8) {
      throw new HTTPException(400, { message: 'Password must be at least 8 characters long' });
    }

    // Hash password
    const hashedPassword = await this.hashPassword(password);

    // Generate OTP
    const otp = this.generateOTP();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: name || null,
        otp,
        otpExpiresAt,
        emailVerified: false,
      },
      select: {
        id: true,
        email: true,
        name: true,
        emailVerified: true,
        zoomConnected: true,
        createdAt: true,
      },
    });

    // Send OTP email
    try {
      await NotificationService.sendEmail({
        to: email,
        subject: 'Verify your Transmeet account',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Welcome to Transmeet!</h2>
            <p>Please verify your email address by entering the following code:</p>
            <div style="background: #f0f0f0; padding: 20px; text-align: center; margin: 20px 0;">
              <h1 style="color: #2563eb; letter-spacing: 5px; margin: 0;">${otp}</h1>
            </div>
            <p style="color: #666;">This code will expire in 10 minutes.</p>
            <p style="color: #666;">If you didn't create an account with Transmeet, please ignore this email.</p>
          </div>
        `,
      });
    } catch (error) {
      console.error('Failed to send OTP email:', error);
      // Continue anyway - user can request resend
    }

    // Generate tokens
    const tokenPayload: TokenPayload = {
      userId: user.id,
      email: user.email,
      emailVerified: user.emailVerified,
      zoomConnected: user.zoomConnected,
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
  static async login(credentials: LoginCredentials): Promise<{ user: any; tokens: AuthTokens; requiresVerification: boolean }> {
    const { email, password } = credentials;

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        password: true,
        name: true,
        emailVerified: true,
        zoomConnected: true,
        createdAt: true,
      },
    });

    if (!user || !user.password) {
      throw new HTTPException(401, { message: 'Invalid email or password' });
    }

    // Verify password
    const isValidPassword = await this.verifyPassword(password, user.password);
    if (!isValidPassword) {
      throw new HTTPException(401, { message: 'Invalid email or password' });
    }

    // If email not verified, generate new OTP
    if (!user.emailVerified) {
      const otp = this.generateOTP();
      const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

      await prisma.user.update({
        where: { id: user.id },
        data: { otp, otpExpiresAt },
      });

      // Send OTP email
      try {
        await NotificationService.sendEmail({
          to: email,
          subject: 'Verify your Transmeet account',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #333;">Verify your email</h2>
              <p>Please verify your email address by entering the following code:</p>
              <div style="background: #f0f0f0; padding: 20px; text-align: center; margin: 20px 0;">
                <h1 style="color: #2563eb; letter-spacing: 5px; margin: 0;">${otp}</h1>
              </div>
              <p style="color: #666;">This code will expire in 10 minutes.</p>
            </div>
          `,
        });
      } catch (error) {
        console.error('Failed to send OTP email:', error);
      }
    }

    // Generate tokens
    const tokenPayload: TokenPayload = {
      userId: user.id,
      email: user.email,
      emailVerified: user.emailVerified,
      zoomConnected: user.zoomConnected,
    };

    const accessToken = this.generateAccessToken(tokenPayload);
    const refreshToken = this.generateRefreshToken(tokenPayload);

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      tokens: { accessToken, refreshToken },
      requiresVerification: !user.emailVerified,
    };
  }

  /**
   * Verify OTP
   */
  static async verifyOTP(userId: string, otp: string): Promise<{ user: any; tokens: AuthTokens }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        otp: true,
        otpExpiresAt: true,
        emailVerified: true,
        zoomConnected: true,
      },
    });

    if (!user) {
      throw new HTTPException(404, { message: 'User not found' });
    }

    if (user.emailVerified) {
      throw new HTTPException(400, { message: 'Email already verified' });
    }

    if (!user.otp || !user.otpExpiresAt) {
      throw new HTTPException(400, { message: 'No OTP found. Please request a new one.' });
    }

    if (new Date() > user.otpExpiresAt) {
      throw new HTTPException(400, { message: 'OTP has expired. Please request a new one.' });
    }

    if (user.otp !== otp) {
      throw new HTTPException(400, { message: 'Invalid OTP' });
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        emailVerified: true,
        otp: null,
        otpExpiresAt: null,
      },
      select: {
        id: true,
        email: true,
        name: true,
        emailVerified: true,
        zoomConnected: true,
        createdAt: true,
      },
    });

    // Generate new tokens with updated status
    const tokenPayload: TokenPayload = {
      userId: updatedUser.id,
      email: updatedUser.email,
      emailVerified: updatedUser.emailVerified,
      zoomConnected: updatedUser.zoomConnected,
    };

    const accessToken = this.generateAccessToken(tokenPayload);
    const refreshToken = this.generateRefreshToken(tokenPayload);

    return {
      user: updatedUser,
      tokens: { accessToken, refreshToken },
    };
  }

  /**
   * Resend OTP
   */
  static async resendOTP(userId: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        emailVerified: true,
      },
    });

    if (!user) {
      throw new HTTPException(404, { message: 'User not found' });
    }

    if (user.emailVerified) {
      throw new HTTPException(400, { message: 'Email already verified' });
    }

    // Generate new OTP
    const otp = this.generateOTP();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.user.update({
      where: { id: userId },
      data: { otp, otpExpiresAt },
    });

    // Send OTP email
    try {
      await NotificationService.sendEmail({
        to: user.email,
        subject: 'Verify your Transmeet account',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Verify your email</h2>
            <p>Please verify your email address by entering the following code:</p>
            <div style="background: #f0f0f0; padding: 20px; text-align: center; margin: 20px 0;">
              <h1 style="color: #2563eb; letter-spacing: 5px; margin: 0;">${otp}</h1>
            </div>
            <p style="color: #666;">This code will expire in 10 minutes.</p>
          </div>
        `,
      });
    } catch (error) {
      console.error('Failed to send OTP email:', error);
      throw new HTTPException(500, { message: 'Failed to send OTP email' });
    }
  }

  /**
   * Refresh access token
   */
  static async refreshToken(refreshToken: string): Promise<AuthTokens> {
    try {
      const decoded = this.verifyToken(refreshToken);
      
      // Verify user still exists and get updated status
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { 
          id: true, 
          email: true,
          emailVerified: true,
          zoomConnected: true,
        },
      });

      if (!user) {
        throw new HTTPException(401, { message: 'User not found' });
      }

      // Generate new tokens with updated status
      const tokenPayload: TokenPayload = {
        userId: user.id,
        email: user.email,
        emailVerified: user.emailVerified,
        zoomConnected: user.zoomConnected,
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
  static async getUserById(userId: string): Promise<any> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        emailVerified: true,
        zoomConnected: true,
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
  static async updateProfile(userId: string, data: { name?: string; email?: string }): Promise<any> {
    const { name, email } = data;

    // If email is being updated, check if it's already taken
    if (email) {
      const existingUser = await prisma.user.findFirst({
        where: {
          email,
          id: { not: userId },
        },
      });

      if (existingUser) {
        throw new HTTPException(400, { message: 'Email is already in use' });
      }
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(name && { name }),
        ...(email && { email }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        emailVerified: true,
        zoomConnected: true,
        zoomEmail: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return user;
  }
}