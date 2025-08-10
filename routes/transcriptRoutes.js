const express = require('express');
const router = express.Router();
const Transcript = require('../models/Transcript');
const Booking = require('../models/Booking');
const transcriptService = require('../services/transcriptService');
const { protect } = require('../middleware/authMiddleware');
const multer = require('multer');

// Configure multer for audio file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept audio files
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Only audio files are allowed'), false);
    }
  }
});

// Start recording/transcript session for a booking
router.post('/start-session', protect, async (req, res) => {
  try {
    console.log('Starting transcript session...');
    const { bookingId } = req.body;

    if (!bookingId) {
      console.log('Missing booking ID');
      return res.status(400).json({ error: 'Booking ID is required' });
    }

    console.log('Looking for booking:', bookingId);
    // Verify booking exists and user is participant
    const booking = await Booking.findById(bookingId)
      .populate('learnerId', 'fullName')
      .populate('mentorId', 'fullName');

    if (!booking) {
      console.log('Booking not found');
      return res.status(400).json({ error: 'Booking not found' });
    }

    if (booking.status !== 'confirmed') {
      console.log('Booking not confirmed, status:', booking.status);
      return res.status(400).json({ error: 'Booking not confirmed' });
    }

    console.log('Checking user authorization...');
    if (![booking.learnerId._id.toString(), booking.mentorId._id.toString()].includes(req.user.id.toString())) {
      console.log('User not authorized');
      return res.status(403).json({ error: 'Not authorized' });
    }

    console.log('Checking for existing transcript...');
    // Check if transcript already exists for this booking
    const existingTranscript = await Transcript.findOne({ bookingId });
    if (existingTranscript) {
      console.log('Existing transcript found');
      return res.json({ 
        sessionId: existingTranscript.sessionId,
        transcriptId: existingTranscript._id,
        message: 'Session already exists'
      });
    }

    // Generate unique session ID
    const sessionId = `session_${bookingId}_${Date.now()}`;
    console.log('Creating new transcript session:', sessionId);

    // Create transcript record
    const transcript = await transcriptService.createTranscriptRecord(
      bookingId,
      sessionId,
      {
        id: booking.learnerId._id,
        name: booking.learnerId.fullName
      },
      {
        id: booking.mentorId._id,
        name: booking.mentorId.fullName
      }
    );

    console.log('Transcript session created successfully');
    res.json({
      sessionId,
      transcriptId: transcript._id,
      message: 'Transcript session started'
    });

  } catch (error) {
    console.error('Error starting transcript session:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ error: 'Failed to start transcript session', details: error.message });
  }
});

// Upload and transcribe audio file
router.post('/upload-audio/:sessionId', protect, upload.single('audio'), async (req, res) => {
  try {
    const { sessionId } = req.params;

    if (!req.file) {
      return res.status(400).json({ error: 'Audio file is required' });
    }

    // Find transcript record
    const transcript = await Transcript.findOne({ sessionId })
      .populate('bookingId');

    if (!transcript) {
      return res.status(404).json({ error: 'Transcript session not found' });
    }

    // Verify user is participant
    if (![transcript.participants.learner.userId.toString(), transcript.participants.mentor.userId.toString()].includes(req.user.id.toString())) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Upload audio to AssemblyAI
    const audioUrl = await transcriptService.uploadAudio(req.file.buffer, req.file.originalname);

    // Start transcription with webhook
    const webhookUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/transcript/webhook`;
    const transcriptionResult = await transcriptService.startTranscription(audioUrl, webhookUrl);

    // Update transcript record
    transcript.audioFile = {
      url: audioUrl,
      filename: req.file.originalname,
      size: req.file.size
    };
    transcript.assemblyAI = {
      transcriptId: transcriptionResult.id,
      status: 'processing'
    };

    await transcript.save();

    res.json({
      message: 'Audio uploaded and transcription started',
      transcriptId: transcript._id,
      assemblyAiId: transcriptionResult.id,
      status: 'processing'
    });

  } catch (error) {
    console.error('Error uploading audio:', error);
    res.status(500).json({ error: error.message || 'Failed to upload audio' });
  }
});

// Webhook endpoint for AssemblyAI completion
router.post('/webhook', async (req, res) => {
  try {
    const { transcript_id, status } = req.body;

    console.log(`Received webhook for transcript ${transcript_id} with status ${status}`);

    if (status === 'completed') {
      await transcriptService.processCompletedTranscription(transcript_id);
    } else if (status === 'error') {
      await Transcript.updateOne(
        { 'assemblyAI.transcriptId': transcript_id },
        { 'assemblyAI.status': 'error' }
      );
    }

    res.json({ received: true });

  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Get transcript by booking ID
router.get('/booking/:bookingId', protect, async (req, res) => {
  try {
    const { bookingId } = req.params;

    const transcript = await Transcript.findOne({ bookingId })
      .populate('bookingId')
      .populate('participants.learner.userId', 'fullName avatar')
      .populate('participants.mentor.userId', 'fullName avatar');

    if (!transcript) {
      return res.status(404).json({ error: 'Transcript not found' });
    }

    // Verify user is participant
    if (![transcript.participants.learner.userId._id.toString(), transcript.participants.mentor.userId._id.toString()].includes(req.user.id.toString())) {
      return res.status(403).json({ error: 'Not authorized to view this transcript' });
    }

    res.json({ transcript });

  } catch (error) {
    console.error('Error fetching transcript:', error);
    res.status(500).json({ error: 'Failed to fetch transcript' });
  }
});

// Get all transcripts for user (learner or mentor)
router.get('/my-transcripts', protect, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const transcripts = await Transcript.find({
      $or: [
        { 'participants.learner.userId': req.user.id },
        { 'participants.mentor.userId': req.user.id }
      ]
    })
    .populate('bookingId', 'date time')
    .populate('participants.learner.userId', 'fullName avatar')
    .populate('participants.mentor.userId', 'fullName avatar')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

    const total = await Transcript.countDocuments({
      $or: [
        { 'participants.learner.userId': req.user.id },
        { 'participants.mentor.userId': req.user.id }
      ]
    });

    res.json({
      transcripts,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalCount: total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Error fetching transcripts:', error);
    res.status(500).json({ error: 'Failed to fetch transcripts' });
  }
});

// Get transcript status
router.get('/status/:sessionId', protect, async (req, res) => {
  try {
    const { sessionId } = req.params;

    const transcript = await Transcript.findOne({ sessionId });

    if (!transcript) {
      return res.status(404).json({ error: 'Transcript session not found' });
    }

    // Verify user is participant
    if (![transcript.participants.learner.userId.toString(), transcript.participants.mentor.userId.toString()].includes(req.user.id.toString())) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    res.json({
      sessionId: transcript.sessionId,
      status: transcript.assemblyAI.status,
      hasTranscript: transcript.transcript.segments.length > 0,
      duration: transcript.transcript.duration,
      createdAt: transcript.createdAt
    });

  } catch (error) {
    console.error('Error checking transcript status:', error);
    res.status(500).json({ error: 'Failed to check transcript status' });
  }
});

// Delete transcript (for privacy)
router.delete('/:transcriptId', protect, async (req, res) => {
  try {
    const { transcriptId } = req.params;

    const transcript = await Transcript.findById(transcriptId);

    if (!transcript) {
      return res.status(404).json({ error: 'Transcript not found' });
    }

    // Verify user is participant
    if (![transcript.participants.learner.userId.toString(), transcript.participants.mentor.userId.toString()].includes(req.user.id.toString())) {
      return res.status(403).json({ error: 'Not authorized to delete this transcript' });
    }

    await transcript.deleteOne();

    res.json({ message: 'Transcript deleted successfully' });

  } catch (error) {
    console.error('Error deleting transcript:', error);
    res.status(500).json({ error: 'Failed to delete transcript' });
  }
});

module.exports = router;
