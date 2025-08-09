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

### Authentication
- POST `/auth/signup`
- POST `/auth/login`
- GET  `/auth/google`
- GET  `/auth/google/callback`
- POST `/auth/logout`
- POST `/auth/forgot-password`
- POST `/auth/reset-password`
- GET  `/auth/me`

### Bookings
- GET  `/bookings` - Get user's bookings
- POST `/bookings` - Create new booking
- PUT  `/bookings/:id/confirm` - Confirm booking (mentor only)
- PUT  `/bookings/:id/reject` - Reject booking (mentor only)
- DELETE `/bookings/:id` - Cancel booking

### Chat (Stream Chat Integration)
- GET  `/chat/token` - Get Stream Chat authentication token
- POST `/chat/create-channel` - Create chat channel for confirmed booking

## Chat System
Real-time chat is available for confirmed bookings between learners and mentors using Stream Chat.

### Setup Stream Chat
1. Sign up at [getstream.io](https://getstream.io/)
2. Create a new app and get your API key, secret, and app ID
3. Add these to your `.env` file:
   ```
   STREAM_API_KEY=your_stream_api_key
   STREAM_API_SECRET=your_stream_api_secret
   STREAM_APP_ID=your_stream_app_id
   ```

### How it works
- Chat is only available for bookings with `confirmed` status
- Each booking gets a unique channel: `booking_{bookingId}`
- Both mentor and learner must be participants in the booking to access the chat
- Frontend calls `/chat/create-channel` with `bookingId` to get/create the channel
- Users get authenticated with Stream using tokens from `/chat/token`

## Notes
- Access token returned in JSON on login/signup and via redirect param on Google callback.
- Refresh token is stored as an httpOnly cookie and hashed in DB.
- Passwords are hashed with bcrypt (saltRounds=10).
- Reset password emails sent via Gmail SMTP (Nodemailer).
- Stream Chat handles real-time messaging, file uploads, and message history. 