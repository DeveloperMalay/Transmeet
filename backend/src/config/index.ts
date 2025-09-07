export const config = {
  // Server Configuration
  port: parseInt(process.env.PORT || '4000'),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Database
  databaseUrl: process.env.DATABASE_URL!,
  
  // JWT Configuration
  jwtSecret: process.env.JWT_SECRET!,
  jwtExpiration: process.env.JWT_EXPIRATION || '7d',
  
  // Zoom OAuth Configuration
  zoom: {
    accountId: process.env.ZOOM_ACCOUNT_ID!,
    clientId: process.env.ZOOM_CLIENT_ID!,
    clientSecret: process.env.ZOOM_CLIENT_SECRET!,
    secretToken: process.env.ZOOM_SECRET_TOKEN!,
    verificationToken: process.env.ZOOM_VERIFICATION_TOKEN!,
    redirectUri: process.env.ZOOM_REDIRECT_URI!,
    baseUrl: 'https://api.zoom.us/v2',
    authUrl: 'https://zoom.us/oauth',
  },
  
  // OpenAI Configuration
  openai: {
    apiKey: process.env.OPENAI_API_KEY!,
    model: process.env.OPENAI_MODEL || 'gpt-4',
    maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '2000'),
  },
  
  // Slack Configuration
  slack: {
    botToken: process.env.SLACK_BOT_TOKEN!,
    signingSecret: process.env.SLACK_SIGNING_SECRET,
  },
  
  // Email Configuration
  email: {
    host: process.env.EMAIL_HOST!,
    port: parseInt(process.env.EMAIL_PORT || '587'),
    user: process.env.EMAIL_USER!,
    pass: process.env.EMAIL_PASS!,
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER!,
  },
  
  // Frontend Configuration
  frontend: {
    url: process.env.FRONTEND_URL || 'http://localhost:3000',
  },
  
  // CORS Configuration
  cors: {
    origin: [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      process.env.FRONTEND_URL,
    ].filter(Boolean),
    credentials: true,
  },
  
  // File Upload Configuration
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '50000000'), // 50MB
    allowedTypes: ['audio/*', 'video/*', 'application/pdf'],
  },
  
  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '900000'), // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX || '100'), // limit each IP to 100 requests per windowMs
  },
};

// Validation function to ensure all required environment variables are set
export const validateConfig = () => {
  const requiredEnvVars = [
    'DATABASE_URL',
    'JWT_SECRET',
    'ZOOM_ACCOUNT_ID',
    'ZOOM_CLIENT_ID',
    'ZOOM_CLIENT_SECRET',
    'ZOOM_REDIRECT_URI',
    'OPENAI_API_KEY',
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }
};

export default config;