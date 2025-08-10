const express = require('express');
const router = express.Router();
const { RtcTokenBuilder, RtcRole } = require('agora-access-token');
const Booking = require('../models/Booking');
const { protect } = require('../middleware/authMiddleware');

router.post('/generate-token', protect, async (req, res) => {
  try {
    const { bookingId } = req.body;
    
    if (!bookingId) {
      return res.status(400).json({ error: 'Booking ID is required' });
    }

    const booking = await Booking.findById(bookingId);

    if (!booking || booking.status !== 'confirmed') {
      return res.status(400).json({ error: 'Booking not confirmed' });
    }

    // Check if the user is either the learner or mentor of this booking
    if (![booking.learnerId.toString(), booking.mentorId.toString()].includes(req.user.id.toString())) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const appID = process.env.AGORA_APP_ID;
    const appCertificate = process.env.AGORA_APP_CERTIFICATE;
    
    if (!appID || !appCertificate) {
      return res.status(500).json({ error: 'Agora configuration missing' });
    }

    const channelName = `booking_${bookingId}`;
    const role = RtcRole.PUBLISHER;
    const expirationTimeInSeconds = 60 * 60; // 1 hour
    const privilegeExpiredTs = Math.floor(Date.now() / 1000) + expirationTimeInSeconds;

    const token = RtcTokenBuilder.buildTokenWithUid(
      appID, 
      appCertificate, 
      channelName, 
      0, // uid (0 means any uid can use this token)
      role, 
      privilegeExpiredTs
    );

    res.json({ 
      token, 
      channelName, 
      uid: req.user.id,
      appId: appID
    });
  } catch (err) {
    console.error('Token generation error:', err);
    res.status(500).json({ error: 'Failed to generate token' });
  }
});

module.exports = router;
