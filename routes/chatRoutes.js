const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const client = require('../config/stream');
const Booking = require('../models/Booking');

// Conditionally import Session model to avoid errors if collection doesn't exist
let Session;
try {
  Session = require('../models/Session');
} catch (error) {
  console.log('Session model not available yet, sessions will be created as needed');
}

// Get chat token for authenticated user
router.get('/token', protect, async (req, res) => {
  try {
    const userId = req.user.id.toString();
    
    // Ensure user exists in Stream Chat
    await client.upsertUser({
      id: userId,
      name: req.user.name,
      email: req.user.email,
      user_type: req.user.roles && req.user.roles.includes('mentor') ? 'mentor' : 'learner'
    });
    
    const token = client.createToken(userId);
    res.json({ 
      token, 
      userId: req.user.id,
      userName: req.user.name 
    });
  } catch (err) {
    console.error('Error generating chat token:', err);
    res.status(500).json({ error: 'Failed to generate token' });
  }
});

// Create or access chat channel for a booking
router.post('/channel/:bookingId', protect, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const userId = req.user.id.toString();
    
    if (!bookingId) {
      return res.status(400).json({ error: 'Booking ID is required' });
    }

    // First, get the booking details
    const booking = await Booking.findById(bookingId).populate('mentorId learnerId');
    
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    
    if (booking.status !== 'confirmed') {
      return res.status(400).json({ error: 'Booking not confirmed' });
    }
    
    // Ensure current user is part of the booking
    const mentorIdStr = booking.mentorId._id.toString();
    const learnerIdStr = booking.learnerId._id.toString();
    
    if (![learnerIdStr, mentorIdStr].includes(userId)) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Try to find session if Session model is available
    let session = null;
    if (Session) {
      try {
        session = await Session.findOne({ bookingId })
          .populate('mentorId', 'fullName avatar')
          .populate('learnerId', 'fullName avatar');
      } catch (error) {
        console.log('Session lookup failed, falling back to booking-based chat');
      }
    }
    
    // Use session chat room if available, otherwise create booking-based channel
    const channelId = session ? session.chatRoomId : `booking_${bookingId}`;
    
    // Ensure users exist in Stream Chat
    await client.upsertUsers([
      {
        id: mentorIdStr,
        name: booking.mentorId.fullName || booking.mentorId.name,
        user_type: 'mentor',
        avatar: booking.mentorId.avatar
      },
      {
        id: learnerIdStr,
        name: booking.learnerId.fullName || booking.learnerId.name,
        user_type: 'learner',
        avatar: booking.learnerId.avatar
      }
    ]);
    
    // Create or get the channel
    const channel = client.channel('messaging', channelId, {
      members: [mentorIdStr, learnerIdStr],
      created_by_id: userId,
      name: `Session: ${booking.mentorId.fullName || booking.mentorId.name} & ${booking.learnerId.fullName || booking.learnerId.name}`,
      session_date: booking.date,
      session_time: booking.time,
      booking_id: bookingId
    });
    
    await channel.create();
    
    res.json({ 
      channelId,
      session: session ? {
        id: session._id,
        videoRoomId: session.videoRoomId,
        status: session.status
      } : null,
      mentor: {
        id: mentorIdStr,
        name: booking.mentorId.fullName || booking.mentorId.name,
        avatar: booking.mentorId.avatar
      },
      learner: {
        id: learnerIdStr,
        name: booking.learnerId.fullName || booking.learnerId.name,
        avatar: booking.learnerId.avatar
      }
    });
    
  } catch (err) {
    console.error('Error accessing chat channel:', err);
    res.status(500).json({ error: 'Failed to access channel' });
  }
});

module.exports = router; 