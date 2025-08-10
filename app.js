const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const passport = require('passport');
require('dotenv').config();

// Initialize passport strategies
require('./config/passport');

const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const profileRoutes = require('./routes/profileRoutes');
const mentorRoutes = require('./routes/mentorRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const chatRoutes = require('./routes/chatRoutes');
const sessionRoutes = require('./routes/sessionRoutes');
const callRoutes = require('./routes/callRoutes');
const transcriptRoutes = require('./routes/transcriptRoutes');
const feedbackRoutes = require('./routes/feedbackRoutes');
const aiRoutes = require('./routes/aiRoutes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true
}));

app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use(morgan('dev'));
app.use(passport.initialize());

app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'skillsphere-backend' });
});

app.use('/auth', authRoutes);
app.use('/admin', adminRoutes);
app.use('/profile', profileRoutes);
app.use('/mentors', mentorRoutes);
app.use('/bookings', bookingRoutes);
app.use('/chat', chatRoutes);
app.use('/sessions', sessionRoutes);
app.use('/call', callRoutes);
app.use('/transcript', transcriptRoutes);
app.use('/feedback', feedbackRoutes);
app.use('/ai', aiRoutes);

// Central error handler
app.use(errorHandler);

module.exports = app; 