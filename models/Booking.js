const mongoose = require('mongoose');

const BookingSchema = new mongoose.Schema(
  {
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
    date: {
      type: Date,
      required: true
    },
    time: {
      type: String,
      required: true
    },
    message: {
      type: String,
      trim: true,
      maxlength: 500
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'completed', 'cancelled'],
      default: 'pending'
    }
  },
  { timestamps: true }
);

// Index for efficient queries
BookingSchema.index({ mentorId: 1, createdAt: -1 });
BookingSchema.index({ learnerId: 1, createdAt: -1 });

module.exports = mongoose.model('Booking', BookingSchema); 