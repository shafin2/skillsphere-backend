const mongoose = require('mongoose');

const TranscriptSchema = new mongoose.Schema(
  {
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: true
    },
    sessionId: {
      type: String,
      required: true,
      unique: true
    },
    participants: {
      learner: {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true
        },
        name: {
          type: String,
          required: true
        }
      },
      mentor: {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true
        },
        name: {
          type: String,
          required: true
        }
      }
    },
    transcript: {
      segments: [{
        speaker: {
          type: String,
          enum: ['learner', 'mentor', 'unknown']
        },
        text: String,
        startTime: Number, // in milliseconds
        endTime: Number, // in milliseconds
        confidence: {
          type: Number,
          min: 0,
          max: 1
        }
      }],
      fullText: {
        type: String,
        default: ''
      },
      duration: {
        type: Number, // in seconds
        default: 0
      }
    },
    audioFile: {
      url: String,
      filename: String,
      size: Number // in bytes
    },
    assemblyAI: {
      transcriptId: String,
      status: {
        type: String,
        enum: ['queued', 'processing', 'completed', 'error'],
        default: 'queued'
      },
      webhookReceived: {
        type: Boolean,
        default: false
      }
    },
    summary: {
      keyPoints: [String],
      actionItems: [String],
      topics: [String],
      sentiment: {
        type: String,
        enum: ['positive', 'neutral', 'negative']
      }
    },
    metadata: {
      sessionStartTime: {
        type: Date,
        required: true
      },
      sessionEndTime: Date,
      actualDuration: Number, // in seconds
      recordingQuality: {
        type: String,
        enum: ['good', 'fair', 'poor']
      }
    }
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Index for efficient queries
TranscriptSchema.index({ bookingId: 1 });
TranscriptSchema.index({ sessionId: 1 });
TranscriptSchema.index({ 'participants.learner.userId': 1 });
TranscriptSchema.index({ 'participants.mentor.userId': 1 });
TranscriptSchema.index({ createdAt: -1 });

// Virtual for formatted duration
TranscriptSchema.virtual('formattedDuration').get(function() {
  if (!this.transcript.duration) return '0:00';
  const minutes = Math.floor(this.transcript.duration / 60);
  const seconds = Math.floor(this.transcript.duration % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
});

// Method to add transcript segment
TranscriptSchema.methods.addSegment = function(speaker, text, startTime, endTime, confidence = 0.9) {
  this.transcript.segments.push({
    speaker,
    text,
    startTime,
    endTime,
    confidence
  });
  
  // Update full text
  this.transcript.fullText = this.transcript.segments
    .map(segment => `[${segment.speaker}]: ${segment.text}`)
    .join('\n');
};

// Static method to find by booking
TranscriptSchema.statics.findByBooking = function(bookingId) {
  return this.findOne({ bookingId }).populate('bookingId participants.learner.userId participants.mentor.userId');
};

module.exports = mongoose.model('Transcript', TranscriptSchema);
