const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const client = require('../config/stream');
const Booking = require('../models/Booking');

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

// Create chat channel after booking confirmation
router.post('/create-channel', protect, async (req, res) => {
  try {
    const { bookingId } = req.body;
    
    if (!bookingId) {
      return res.status(400).json({ error: 'Booking ID is required' });
    }

    const booking = await Booking.findById(bookingId).populate('mentorId learnerId');
    
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    
    if (booking.status !== 'confirmed') {
      return res.status(400).json({ error: 'Booking not confirmed' });
    }
    
    // Ensure current user is part of the booking
    const userIdStr = req.user.id.toString();
    const mentorIdStr = booking.mentorId._id.toString();
    const learnerIdStr = booking.learnerId._id.toString();
    
    if (![learnerIdStr, mentorIdStr].includes(userIdStr)) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    const channelId = `booking_${bookingId}`;
    
    // First, upsert users to Stream Chat to ensure they exist
    await client.upsertUsers([
      {
        id: mentorIdStr,
        name: booking.mentorId.name,
        user_type: 'mentor'
      },
      {
        id: learnerIdStr,
        name: booking.learnerId.name,
        user_type: 'learner'
      }
    ]);
    
    // Create or get the channel
    const channel = client.channel('messaging', channelId, {
      members: [mentorIdStr, learnerIdStr],
      created_by_id: userIdStr,
      name: `Chat for booking with ${booking.mentorId.name} and ${booking.learnerId.name}`
    });
    
    await channel.create();
    
    res.json({ 
      channelId,
      mentor: {
        id: mentorIdStr,
        name: booking.mentorId.name
      },
      learner: {
        id: learnerIdStr,
        name: booking.learnerId.name
      }
    });
  } catch (err) {
    console.error('Error creating chat channel:', err);
    res.status(500).json({ error: 'Failed to create channel' });
  }
});

module.exports = router; 