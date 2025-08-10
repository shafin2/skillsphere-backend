const mongoose = require('mongoose');

const FeedbackSchema = new mongoose.Schema({
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: true,
    unique: true // One feedback per booking
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
  rating: {
    type: Number,
    min: 1,
    max: 5,
    required: true
  },
  comment: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  isAnonymous: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for efficient queries
FeedbackSchema.index({ mentorId: 1, createdAt: -1 });
FeedbackSchema.index({ learnerId: 1 });

// Static method to get mentor's average rating
FeedbackSchema.statics.getMentorAverageRating = async function(mentorId) {
  const result = await this.aggregate([
    { $match: { mentorId: new mongoose.Types.ObjectId(mentorId) } },
    {
      $group: {
        _id: null,
        averageRating: { $avg: "$rating" },
        totalReviews: { $sum: 1 }
      }
    }
  ]);

  return result[0] || { averageRating: 0, totalReviews: 0 };
};

// Static method to get mentor feedback (anonymized)
FeedbackSchema.statics.getMentorFeedback = async function(mentorId, limit = 10) {
  return await this.find({ mentorId })
    .select('rating comment createdAt -learnerId') // Exclude learner ID for anonymity
    .sort({ createdAt: -1 })
    .limit(limit);
};

module.exports = mongoose.model('Feedback', FeedbackSchema);
