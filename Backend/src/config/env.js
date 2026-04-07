import dotenv from 'dotenv';

dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';

const assertRequired = key => {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
};

if (isProduction) {
  [
    'MONGO_URI',
    'JWT_ACCESS_SECRET',
    'JWT_REFRESH_SECRET',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'GOOGLE_CALLBACK_URL',
    'GITHUB_CLIENT_ID',
    'GITHUB_CLIENT_SECRET',
    'GITHUB_CALLBACK_URL',
  ].forEach(assertRequired);
}

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 4001),
  mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/contextos-auth',
  appOrigin: process.env.APP_ORIGIN || 'http://localhost:3000',
  apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:4001',

  jwtAccessSecret:
    process.env.JWT_ACCESS_SECRET || 'dev-access-secret-change-me',
  jwtRefreshSecret:
    process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-me',
  jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',

  accessCookieName: process.env.ACCESS_COOKIE_NAME || 'accessToken',
  refreshCookieName: process.env.REFRESH_COOKIE_NAME || 'refreshToken',
  cookieSecure: process.env.COOKIE_SECURE === 'true',
  cookieSameSite: process.env.COOKIE_SAME_SITE || 'lax',
  cookieDomain: process.env.COOKIE_DOMAIN || undefined,

  smtpHost: process.env.SMTP_HOST,
  smtpPort: Number(process.env.SMTP_PORT || 587),
  smtpSecure: process.env.SMTP_SECURE === 'true',
  smtpUser: process.env.SMTP_USER,
  smtpPass: process.env.SMTP_PASS,
  mailFrom: process.env.MAIL_FROM || 'ContextOS <noreply@contextos.io>',

  googleClientId: process.env.GOOGLE_CLIENT_ID || 'disabled-google-client-id',
  googleClientSecret:
    process.env.GOOGLE_CLIENT_SECRET || 'disabled-google-client-secret',
  googleCallbackUrl:
    process.env.GOOGLE_CALLBACK_URL ||
    'http://localhost:4001/api/v1/auth/oauth/google/callback',
  githubClientId: process.env.GITHUB_CLIENT_ID || 'disabled-github-client-id',
  githubClientSecret:
    process.env.GITHUB_CLIENT_SECRET || 'disabled-github-client-secret',
  githubCallbackUrl:
    process.env.GITHUB_CALLBACK_URL ||
    'http://localhost:4001/api/v1/auth/oauth/github/callback',

  oauthSuccessRedirect:
    process.env.OAUTH_SUCCESS_REDIRECT || 'http://localhost:3000/auth/success',
  oauthFailureRedirect:
    process.env.OAUTH_FAILURE_REDIRECT || 'http://localhost:3000/auth/failure',
};
