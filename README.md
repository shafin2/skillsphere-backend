# SkillSphere Backend

A comprehensive Node.js backend API for the SkillSphere mentorship platform with authentication, real-time communication, AI integration, and video calling capabilities.

## 🎬 Demo & Documentation

- **📽️ Demo Video**: https://drive.google.com/file/d/1mrdzr9AZ5E7I8HA-htDbmMoEWoYcw31A/view?usp=sharing
- **📋 Project Overview**: https://drive.google.com/file/d/16Witm9olrkMVHqs1Ns4QVyLJSklqjdKp/view?pli=1

## Features

- ✅ **Authentication System**: JWT-based auth with Google OAuth integration
- ✅ **Role-based Authorization**: Learner, Mentor, and Admin access control
- ✅ **Real-time Messaging**: Stream Chat integration with secure channels
- ✅ **Video Calling**: Agora RTC integration for session calls
- ✅ **AI Integration**: Google Gemini for recommendations and insights
- ✅ **Session Management**: Complete booking and session lifecycle
- ✅ **Transcript System**: Automatic session transcription and analysis
- ✅ **Email Notifications**: Automated email system with templates
- ✅ **Database Seeding**: Sample data generation for development

## Tech Stack

- **Node.js 18+** - Runtime environment
- **Express.js** - Web application framework
- **MongoDB Atlas** - Cloud database with Mongoose ODM
- **JWT** - JSON Web Token authentication
- **Stream Chat** - Real-time messaging infrastructure
- **Agora RTC** - Video/audio communication
- **Google Gemini AI** - AI-powered recommendations
- **Nodemailer** - Email delivery system
- **bcrypt** - Password hashing

## Project Structure

```
backend/
├── config/
│   ├── db.js              # MongoDB connection
│   ├── passport.js        # Google OAuth strategy
│   ├── stream.js          # Stream Chat client
│   └── agora.js          # Agora video configuration
├── controllers/
│   ├── authController.js  # Authentication logic
│   ├── bookingController.js # Session booking management
│   ├── sessionController.js # Live session handling
│   ├── aiController.js    # AI-powered features
│   ├── mentorController.js # Mentor-specific operations
│   ├── adminController.js # Admin dashboard features
│   └── transcriptController.js # Session transcripts
├── middleware/
│   ├── authMiddleware.js  # JWT verification
│   └── errorHandler.js   # Global error handling
├── models/
│   ├── User.js           # User schema with roles
│   ├── Booking.js        # Session booking model
│   ├── Session.js        # Live session model
│   ├── Transcript.js     # Session transcript model
│   └── Feedback.js       # Session feedback model
├── routes/
│   ├── authRoutes.js     # Authentication endpoints
│   ├── bookingRoutes.js  # Booking management
│   ├── chatRoutes.js     # Real-time messaging
│   ├── sessionRoutes.js  # Session operations
│   ├── callRoutes.js     # Video call integration
│   ├── aiRoutes.js       # AI-powered features
│   ├── mentorRoutes.js   # Mentor directory
│   ├── adminRoutes.js    # Admin dashboard
│   ├── profileRoutes.js  # User profile management
│   ├── transcriptRoutes.js # Transcript access
│   └── feedbackRoutes.js # Session feedback
├── services/
│   └── transcriptService.js # Transcript processing
├── utils/
│   ├── generateTokens.js # JWT token utilities
│   └── sendEmail.js      # Email template system
├── seed/
│   ├── adminSeed.js      # Admin user seeding
│   └── mentorSeed.js     # Sample mentor data
├── app.js               # Express app configuration
├── server.js            # Server startup
└── seed.js             # Database seeding script
```

## Environment Setup

1. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

2. Configure your environment variables:
```env
# Database
MONGODB_URI=mongodb://localhost:27017/skillsphere

# JWT Secrets
ACCESS_TOKEN_SECRET=your_access_token_secret_here
REFRESH_TOKEN_SECRET=your_refresh_token_secret_here

# Client URL
CLIENT_URL=http://localhost:5173

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Stream Chat Configuration
STREAM_API_KEY=your_stream_api_key
STREAM_API_SECRET=your_stream_api_secret
STREAM_APP_ID=your_stream_app_id

# Agora Video Call Configuration
AGORA_APP_ID=your_agora_app_id
AGORA_APP_CERTIFICATE=your_agora_app_certificate

# AI Configuration
GEMINI_API_KEY=your_gemini_api_key
ASSEMBLYAI_API_KEY=your_assemblyai_api_key
```

## Development

```bash
# Install dependencies
npm install

# Start development server (with nodemon)
npm run dev

# Start production server
npm start

# Seed database with sample data
npm run seed

# Seed admin users only
npm run seed:admin

# Seed mentor data only
npm run seed:mentors
```

## API Routes

### Authentication (`/auth`)
- `POST /auth/signup` - Create new user account
- `POST /auth/login` - Authenticate user
- `GET /auth/google` - Initiate Google OAuth
- `GET /auth/google/callback` - Handle Google OAuth callback
- `POST /auth/logout` - Sign out user
- `POST /auth/forgot-password` - Request password reset
- `POST /auth/reset-password` - Reset password with token
- `GET /auth/me` - Get current user info

### Bookings (`/bookings`)
- `GET /bookings` - Get user's bookings (learner) or booking requests (mentor)
- `POST /bookings` - Create new session booking
- `PUT /bookings/:id/confirm` - Confirm booking (mentor only)
- `PUT /bookings/:id/reject` - Reject booking (mentor only)
- `DELETE /bookings/:id` - Cancel booking

### Sessions (`/sessions`)
- `GET /sessions/:bookingId` - Get session details
- `POST /sessions/:sessionId/join` - Join video session
- `PUT /sessions/:sessionId/start` - Start session timer
- `PUT /sessions/:sessionId/end` - End session and save duration
- `GET /sessions/my-conversations` - Get chat conversations

### Real-time Chat (`/chat`)
- `GET /chat/token` - Get Stream Chat authentication token
- `POST /chat/channel/:bookingId` - Create/get chat channel for booking
- `GET /chat/channels` - Get user's accessible channels

### Video Calls (`/call`)
- `POST /call/join/:sessionId` - Join video call session
- `POST /call/token` - Get Agora RTC token
- `PUT /call/end/:sessionId` - End video call

### AI Features (`/ai`)
- `POST /ai/chat` - Chat with AI learning assistant
- `GET /ai/mentor-recommendations` - Get personalized mentor suggestions
- `POST /ai/session-summary` - Generate session summary
- `GET /ai/learning-insights` - Get learning progress insights

### Mentors (`/mentors`)
- `GET /mentors` - Get approved mentors with filters
- `GET /mentors/:id` - Get mentor profile details
- `GET /mentors/:id/availability` - Get mentor's available time slots
- `GET /mentors/:id/feedback` - Get mentor's feedback and ratings

### User Profile (`/profile`)
- `GET /profile/me` - Get current user profile
- `PUT /profile/me` - Update user profile
- `POST /profile/avatar` - Upload profile avatar
- `PUT /profile/availability` - Update mentor availability (mentors only)

### Transcripts (`/transcript`)
- `GET /transcript/:bookingId` - Get session transcript
- `POST /transcript/:sessionId/generate` - Generate transcript from audio
- `GET /transcript/search` - Search transcript content

### Feedback (`/feedback`)
- `POST /feedback` - Submit session feedback
- `GET /feedback/mentor/:mentorId` - Get mentor's feedback summary
- `GET /feedback/session/:sessionId` - Get session feedback

### Admin (`/admin`) *Protected Routes*
- `GET /admin/dashboard` - Get admin dashboard analytics
- `GET /admin/mentors/pending` - Get pending mentor applications
- `PUT /admin/mentors/:id/approve` - Approve mentor application
- `PUT /admin/mentors/:id/reject` - Reject mentor application
- `GET /admin/users` - Get all users with filters
- `GET /admin/sessions` - Get all sessions with analytics
- `GET /admin/feedback` - Get feedback analytics

## Authentication Flow

### JWT Token System
- **Access Token**: Short-lived (15 minutes), sent in response body
- **Refresh Token**: Long-lived (7 days), stored as httpOnly cookie
- **Automatic Refresh**: Frontend automatically refreshes tokens on 401

### User Roles & Permissions
```javascript
// User roles and their permissions
const roles = {
  learner: ['book_sessions', 'view_mentors', 'chat_with_mentors'],
  mentor: ['accept_bookings', 'conduct_sessions', 'view_analytics'],
  admin: ['approve_mentors', 'view_all_data', 'moderate_content']
}
```

### Google OAuth Integration
```javascript
// OAuth flow
GET /auth/google → Google consent → /auth/google/callback → JWT tokens
```

## Real-time Communication

### Stream Chat Integration
```javascript
// Channel creation for confirmed bookings
const channelId = `booking_${bookingId}`
const channel = client.channel('messaging', channelId, {
  members: [mentorId, learnerId],
  session_date: booking.date,
  session_time: booking.time
})
```

### Agora Video Calls
```javascript
// Video session management
const session = {
  videoRoomId: `session_${bookingId}_${timestamp}`,
  chatRoomId: `booking_${bookingId}`,
  participants: [mentor, learner]
}
```

## AI Integration

### Google Gemini Features
- **Mentor Recommendations**: Analyzes learner profile and suggests matching mentors
- **Session Insights**: Generates post-session summaries and action items
- **Learning Assistant**: Provides contextual help and answers questions
- **Progress Analysis**: Tracks learning patterns and suggests improvements

```javascript
// AI-powered mentor matching
const recommendations = await genAI.generateContent(`
  Learner Profile: ${learnerData}
  Available Mentors: ${mentorData}
  Suggest 3 best matches with reasons...
`)
```

## Database Schema

### Core Models

**User Model**
```javascript
{
  name: String,
  email: String,
  roles: ['learner', 'mentor', 'admin'],
  isApproved: Boolean,
  skills: [String],
  availability: Object,
  profile: {
    bio: String,
    avatar: String,
    experience: String,
    hourlyRate: Number
  }
}
```

**Booking Model**
```javascript
{
  mentorId: ObjectId,
  learnerId: ObjectId,
  date: Date,
  time: String,
  duration: Number,
  status: ['pending', 'confirmed', 'completed', 'cancelled'],
  message: String,
  sessionNotes: String
}
```

**Session Model**
```javascript
{
  bookingId: ObjectId,
  chatRoomId: String,
  videoRoomId: String,
  status: ['scheduled', 'active', 'completed'],
  startedAt: Date,
  endedAt: Date,
  duration: Number,
  recordingUrl: String
}
```

## Security Features

- **Password Hashing**: bcrypt with salt rounds 10
- **JWT Security**: Access/refresh token rotation
- **Role-based Access**: Middleware protection for sensitive routes
- **Input Validation**: Request validation and sanitization
- **Rate Limiting**: API rate limiting (ready for implementation)
- **CORS Configuration**: Secure cross-origin requests

## Error Handling

```javascript
// Global error handler middleware
app.use((error, req, res, next) => {
  const status = error.statusCode || 500
  const message = error.message || 'Something went wrong!'
  res.status(status).json({ 
    success: false, 
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  })
})
```

## Database Seeding

The application includes comprehensive seeding for development:

```bash
# Seed everything (users, mentors, bookings, sessions)
npm run seed

# Seed only admin users
npm run seed:admin

# Seed only mentors with sample data
npm run seed:mentors
```

## Testing & Development

### Sample Data
- **Admin Users**: Pre-configured admin accounts
- **Sample Mentors**: 20+ mentors across different skills
- **Mock Sessions**: Complete booking and session history
- **Realistic Data**: Names, skills, availability, and feedback

### Development Workflow
1. Start MongoDB (local or Atlas)
2. Run `npm run seed` for sample data
3. Start server with `npm run dev`
4. API available at `http://localhost:5000`

## Production Deployment

### Environment Checklist
- [ ] MongoDB Atlas connection string
- [ ] JWT secrets (generate strong secrets)
- [ ] Google OAuth credentials
- [ ] Stream Chat API keys
- [ ] Agora video credentials
- [ ] Gmail SMTP configuration
- [ ] AI API keys (Gemini, AssemblyAI)

### Performance Considerations
- **Database Indexing**: Optimized queries for mentors, bookings, sessions
- **Caching Strategy**: Ready for Redis integration
- **File Upload**: Configured for cloud storage (ready)
- **Error Monitoring**: Structured error logging

## Next Steps

The SkillSphere backend is production-ready with comprehensive features!

For advanced features:
1. **Payment Integration**: Add Stripe for session payments
2. **Mobile App API**: Extend for React Native/Flutter apps
3. **Analytics Dashboard**: Enhanced admin analytics
4. **Notification System**: Push notifications for mobile
5. **Content Management**: File upload and resource sharing 