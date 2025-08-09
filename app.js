const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const passport = require('passport');
require('dotenv').config();

// Initialize passport strategies
require('./config/passport');

const authRoutes = require('./routes/authRoutes');
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

// Central error handler
app.use(errorHandler);

module.exports = app; 