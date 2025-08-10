const express = require('express');
const router = express.Router();
const transcriptController = require('../controllers/transcriptController');
const { protect } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(protect);

// Start transcript recording
router.post('/:sessionId/start', transcriptController.startTranscript);

// Add entry to transcript
router.post('/:sessionId/entry', transcriptController.addTranscriptEntry);

// Stop transcript recording
router.post('/:sessionId/stop', transcriptController.stopTranscript);

// Get transcript
router.get('/:sessionId', transcriptController.getTranscript);

module.exports = router;
