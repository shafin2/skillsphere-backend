# SkillSphere Backend

Authentication backend using Node.js, Express, MongoDB Atlas, JWT, bcrypt, Nodemailer, and Google OAuth.

## Setup
1. Copy `.env.example` to `.env` and fill in values.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run in development:
   ```bash
   npm run dev
   ```

## Environment Variables
See `.env.example` for all required variables.

## Routes
- POST `/auth/signup`
- POST `/auth/login`
- GET  `/auth/google`
- GET  `/auth/google/callback`
- POST `/auth/logout`
- POST `/auth/forgot-password`
- POST `/auth/reset-password`
- GET  `/auth/me`

## Notes
- Access token returned in JSON on login/signup and via redirect param on Google callback.
- Refresh token is stored as an httpOnly cookie and hashed in DB.
- Passwords are hashed with bcrypt (saltRounds=10).
- Reset password emails sent via Gmail SMTP (Nodemailer). 