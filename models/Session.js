const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: true,
    unique: true
  },
  mentorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  learnerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  chatRoomId: {
    type: String,
    required: true
  },
  videoRoomId: {
    type: String,
    required: true
  },
  transcript: {
    sessionId: String,
    startTime: Date,
    endTime: Date,
    isRecording: {
      type: Boolean,
      default: false
    },
    entries: [{
      timestamp: {
        type: Date,
        default: Date.now
      },
      speakerName: String,
      text: String
    }]
  },
  status: {
    type: String,
    enum: ['upcoming', 'in_progress', 'completed'],
    default: 'upcoming'
  },
  joinedAt: {
    mentor: Date,
    learner: Date
  },
  startedAt: Date,
  endedAt: Date,
  duration: Number, // in minutes
  notes: String
}, {
  timestamps: true
});

// Ensure one session per booking
sessionSchema.index({ bookingId: 1 }, { unique: true });

module.exports = mongoose.model('Session', sessionSchema);
