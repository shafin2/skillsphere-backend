const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  getSession,
  getMyConversations,
  joinSession,
  leaveSession,
  saveTranscript,
  getTranscript,
  updateNotes
} = require('../controllers/sessionController');

// Get session details for a booking
router.get('/:bookingId', protect, getSession);

// Get all conversations for logged-in user
router.get('/conversations/my', protect, getMyConversations);

// Join a session (for video call)
router.post('/:sessionId/join', protect, joinSession);

// Leave a session
router.post('/:sessionId/leave', protect, leaveSession);

// Save transcript
router.post('/:sessionId/transcript', protect, saveTranscript);

// Get transcript
router.get('/:sessionId/transcript', protect, getTranscript);

// Update session notes
router.put('/:sessionId/notes', protect, updateNotes);

module.exports = router;
