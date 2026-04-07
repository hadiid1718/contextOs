# ContextOS Auth Service (Module 1)

Authentication and User Management microservice for ContextOS.

## Tech Stack

- Node.js + Express.js
- MongoDB + Mongoose
- Passport.js (Google OAuth2 + GitHub OAuth2)
- JWT access (15m) + refresh (7d) tokens in httpOnly cookies
- Zod validation
- Nodemailer for email verification and password reset
- express-rate-limit for auth route protection

## File Structure

```text
auth-service/
  .env.example
  package.json
  README.md
  src/
    app.js
    server.js
    config/
      db.js
      env.js
      passport.js
    controllers/
      auth.controller.js
      oauth.controller.js
    middleware/
      auth.middleware.js
      error.middleware.js
      rateLimit.middleware.js
      rbac.middleware.js
      validate.middleware.js
    models/
      PasswordResetToken.js
      RefreshToken.js
      User.js
      VerificationToken.js
    routes/
      auth.routes.js
      index.js
      oauth.routes.js
    utils/
      appError.js
      asyncHandler.js
      cookie.js
      hash.js
      mailer.js
      token.js
    validators/
      auth.schemas.js
```

## Routes

Base prefix: `/api/v1/auth`

- `POST /register` - Register user with bcrypt-hashed password (12 rounds)
- `POST /login` - Login, issue access + refresh cookies
- `POST /refresh` - Rotate refresh token and issue new cookie pair
- `POST /logout` - Revoke refresh token and clear cookies
- `GET /me` - Get current authenticated user (requires access token)
- `GET /verify-email/:token` - Verify email via time-limited token
- `POST /resend-verification` - Resend verification email
- `POST /forgot-password` - Send password reset email (time-limited token)
- `POST /reset-password` - Reset password and revoke active sessions

OAuth routes:

- `GET /api/v1/auth/oauth/google`
- `GET /api/v1/auth/oauth/google/callback`
- `GET /api/v1/auth/oauth/github`
- `GET /api/v1/auth/oauth/github/callback`

## RBAC

Supported roles:

- `owner`
- `admin`
- `member`
- `viewer`

Middleware:

- `requireAuth` validates JWT access token from bearer or cookie
- `requireRole(...roles)` enforces role hierarchy

## Run Locally

1. Copy `.env.example` to `.env` and fill all values.
2. Install dependencies:
   - `npm install`
3. Run service:
   - `npm run dev`

Health check:

- `GET /health`
