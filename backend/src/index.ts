import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { HTTPException } from 'hono/http-exception';

// Import configuration and utilities
import config, { validateConfig } from './config/index.js';
import prisma from './utils/prisma.js';

// Import route handlers
import authRoutes from './routes/auth.routes.js';
import meetingRoutes from './routes/meeting.routes.js';
import transcriptRoutes from './routes/transcript.routes.js';
import recordingRoutes from './routes/recording.routes.js';

// Import services for initialization
import { NotificationService } from './services/notification.service.js';

// Validate environment configuration
try {
  validateConfig();
  console.log('✅ Environment configuration validated');
} catch (error: any) {
  console.error('❌ Configuration validation failed:', error.message);
  process.exit(1);
}

const app = new Hono();

// CORS configuration
app.use('*', cors({
  origin: config.cors.origin,
  credentials: config.cors.credentials,
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// Logger middleware
app.use('*', logger());

// Health check endpoint
app.get('/health', async (c) => {
  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`;
    
    // Test notification services (optional)
    const notificationService = NotificationService.getInstance();
    const emailTest = await notificationService.testEmailConfiguration();
    const slackTest = await notificationService.testSlackConfiguration();

    return c.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'connected',
        email: emailTest ? 'connected' : 'disconnected',
        slack: slackTest ? 'connected' : 'disconnected',
      },
      version: '1.0.0',
    });
  } catch (error: any) {
    console.error('Health check failed:', error);
    return c.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
    }, 503);
  }
});

// Root endpoint
app.get('/', (c) => {
  return c.json({
    message: 'Transmeet API - Meeting Intelligence Platform',
    version: '1.0.0',
    environment: config.nodeEnv,
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      meetings: '/api/meetings',
      transcripts: '/api/transcripts',
      recordings: '/api/recordings',
    },
  });
});

// API routes
app.route('/api/auth', authRoutes);
app.route('/api/meetings', meetingRoutes);
app.route('/api/transcripts', transcriptRoutes);
app.route('/api/recordings', recordingRoutes);

// Global error handler
app.onError((err, c) => {
  console.error('Global error handler:', err);

  if (err instanceof HTTPException) {
    return c.json({
      success: false,
      error: err.message,
      status: err.status,
    }, err.status);
  }

  return c.json({
    success: false,
    error: 'Internal server error',
    message: config.nodeEnv === 'development' ? err.message : 'Something went wrong',
  }, 500);
});

// 404 handler
app.notFound((c) => {
  return c.json({
    success: false,
    error: 'Not found',
    message: 'The requested endpoint does not exist',
    availableEndpoints: [
      'GET /',
      'GET /health',
      'POST /api/auth/login',
      'POST /api/auth/register',
      'GET /api/auth/zoom',
      'GET /api/meetings',
      'POST /api/meetings/sync',
      'GET /api/transcripts/search',
    ],
  }, 404);
});

// Graceful shutdown handler
const gracefulShutdown = async (signal: string) => {
  console.log(`\n🔄 Received ${signal}, starting graceful shutdown...`);
  
  try {
    await prisma.$disconnect();
    console.log('✅ Database disconnected');
    
    console.log('✅ Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
};

// Register shutdown handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start server
const port = config.port;

console.log('🚀 Starting Transmeet API Server...');
console.log(`📡 Port: ${port}`);
console.log(`🌍 Environment: ${config.nodeEnv}`);
console.log(`🔗 Frontend URL: ${config.frontend.url}`);
console.log(`🎥 Zoom OAuth Redirect: ${config.zoom.redirectUri}`);

serve({
  fetch: app.fetch,
  port,
}, () => {
  console.log(`\n✅ Server is running on port ${port}`);
  console.log(`🔗 Health check: http://localhost:${port}/health`);
  console.log(`📖 API docs: http://localhost:${port}/`);
  console.log(`\n🎉 Transmeet API is ready to handle requests!`);
});