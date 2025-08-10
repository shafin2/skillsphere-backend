const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Feedback = require('../models/Feedback');
const Booking = require('../models/Booking');
const User = require('../models/User');
const { protect } = require('../middleware/authMiddleware');

// Submit feedback (learner only)
router.post('/', protect, async (req, res) => {
  try {
    const { bookingId, rating, comment } = req.body;

    if (!bookingId || !rating) {
      return res.status(400).json({ error: 'Booking ID and rating are required' });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    // Find the booking and verify it's completed
    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    if (booking.status !== 'completed') {
      return res.status(400).json({ error: 'Booking must be completed to give feedback' });
    }

    // Verify the user is the learner for this booking
    if (booking.learnerId.toString() !== req.user.id.toString()) {
      return res.status(403).json({ error: 'Only the learner can give feedback for this booking' });
    }

    // Check if feedback already exists
    const existingFeedback = await Feedback.findOne({ bookingId });
    if (existingFeedback) {
      return res.status(400).json({ error: 'Feedback already submitted for this booking' });
    }

    // Create feedback
    const feedback = await Feedback.create({
      bookingId,
      mentorId: booking.mentorId,
      learnerId: req.user.id,
      rating,
      comment: comment || ''
    });

    console.log(`Feedback submitted: Learner ${req.user.id} rated mentor ${booking.mentorId} - ${rating} stars`);

    res.status(201).json({
      message: 'Feedback submitted successfully',
      feedback: {
        id: feedback._id,
        rating: feedback.rating,
        comment: feedback.comment,
        createdAt: feedback.createdAt
      }
    });

  } catch (error) {
    console.error('Error submitting feedback:', error);
    res.status(500).json({ error: 'Failed to submit feedback' });
  }
});

// Get mentor feedback (anonymized for public viewing)
router.get('/mentor/:mentorId', async (req, res) => {
  try {
    const { mentorId } = req.params;
    const limit = parseInt(req.query.limit) || 10;
    const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * limit;

    console.log('Fetching feedback for mentor ID:', mentorId);

    if (!mongoose.Types.ObjectId.isValid(mentorId)) {
      console.log('Invalid mentor ID format');
      return res.status(400).json({ error: 'Invalid mentor ID' });
    }

    // Get mentor with ratings from User model
    const mentor = await User.findById(mentorId).select('ratings name');
    
    if (!mentor) {
      console.log('Mentor not found');
      return res.status(404).json({ error: 'Mentor not found' });
    }

    console.log(`Found mentor: ${mentor.name} with ${mentor.ratings?.length || 0} ratings`);

    const allRatings = mentor.ratings || [];
    const total = allRatings.length;
    
    // Sort by date (newest first) and paginate
    const sortedRatings = allRatings.sort((a, b) => new Date(b.date) - new Date(a.date));
    const feedbacks = sortedRatings.slice(skip, skip + limit).map(rating => ({
      rating: rating.rating,
      comment: rating.comment,
      createdAt: rating.date
    }));

    console.log(`Returning ${feedbacks.length} feedbacks out of ${total} total`);

    res.json({
      feedbacks,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalCount: total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Error fetching mentor feedback:', error);
    res.status(500).json({ error: 'Failed to fetch feedback' });
  }
});

// Get mentor average rating and stats
router.get('/mentor/:mentorId/stats', async (req, res) => {
  try {
    const { mentorId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(mentorId)) {
      return res.status(400).json({ error: 'Invalid mentor ID' });
    }

    // Get mentor with ratings from User model
    const mentor = await User.findById(mentorId).select('ratings');
    
    if (!mentor) {
      return res.status(404).json({ error: 'Mentor not found' });
    }

    const allRatings = mentor.ratings || [];
    const totalReviews = allRatings.length;
    
    let averageRating = 0;
    if (totalReviews > 0) {
      const totalRatingSum = allRatings.reduce((sum, rating) => sum + rating.rating, 0);
      averageRating = totalRatingSum / totalReviews;
    }

    // Get rating distribution
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    allRatings.forEach(rating => {
      if (distribution[rating.rating] !== undefined) {
        distribution[rating.rating]++;
      }
    });

    res.json({
      averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
      totalReviews,
      ratingDistribution: distribution
    });

  } catch (error) {
    console.error('Error fetching mentor stats:', error);
    res.status(500).json({ error: 'Failed to fetch mentor statistics' });
  }
});

// Check if learner can give feedback for a booking
router.get('/can-review/:bookingId', protect, async (req, res) => {
  try {
    const { bookingId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      return res.status(400).json({ error: 'Invalid booking ID' });
    }

    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Check if user is the learner
    if (booking.learnerId.toString() !== req.user.id.toString()) {
      return res.json({ canReview: false, reason: 'Not the learner for this booking' });
    }

    // Check if booking is completed
    if (booking.status !== 'completed') {
      return res.json({ canReview: false, reason: 'Booking not completed yet' });
    }

    // Check if feedback already exists
    const existingFeedback = await Feedback.findOne({ bookingId });
    if (existingFeedback) {
      return res.json({ canReview: false, reason: 'Feedback already submitted' });
    }

    res.json({ canReview: true });

  } catch (error) {
    console.error('Error checking review eligibility:', error);
    res.status(500).json({ error: 'Failed to check review eligibility' });
  }
});

// Get mentors with minimum rating (for filtering)
router.get('/mentors-by-rating', async (req, res) => {
  try {
    const minRating = parseFloat(req.query.minRating) || 0;
    const limit = parseInt(req.query.limit) || 10;
    const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * limit;

    // Aggregate mentors with their average ratings
    const mentorsWithRatings = await Feedback.aggregate([
      {
        $group: {
          _id: '$mentorId',
          averageRating: { $avg: '$rating' },
          totalReviews: { $sum: 1 }
        }
      },
      {
        $match: {
          averageRating: { $gte: minRating }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'mentorInfo'
        }
      },
      {
        $unwind: '$mentorInfo'
      },
      {
        $match: {
          'mentorInfo.roles': 'mentor'
        }
      },
      {
        $project: {
          _id: 1,
          averageRating: 1,
          totalReviews: 1,
          fullName: '$mentorInfo.fullName',
          avatar: '$mentorInfo.avatar',
          bio: '$mentorInfo.bio',
          skills: '$mentorInfo.skills',
          experience: '$mentorInfo.experience'
        }
      },
      { $sort: { averageRating: -1, totalReviews: -1 } },
      { $skip: skip },
      { $limit: limit }
    ]);

    // Get total count for pagination
    const totalCount = await Feedback.aggregate([
      {
        $group: {
          _id: '$mentorId',
          averageRating: { $avg: '$rating' }
        }
      },
      {
        $match: {
          averageRating: { $gte: minRating }
        }
      },
      {
        $count: 'total'
      }
    ]);

    const total = totalCount[0]?.total || 0;

    res.json({
      mentors: mentorsWithRatings,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalCount: total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Error fetching mentors by rating:', error);
    res.status(500).json({ error: 'Failed to fetch mentors by rating' });
  }
});

// Get feedback given by a learner (for their own reference)
router.get('/my-feedback', protect, async (req, res) => {
  try {
    const feedbacks = await Feedback.find({ learnerId: req.user.id })
      .populate('mentorId', 'fullName avatar')
      .populate('bookingId', 'date time')
      .sort({ createdAt: -1 });

    res.json({ feedbacks });

  } catch (error) {
    console.error('Error fetching user feedback:', error);
    res.status(500).json({ error: 'Failed to fetch your feedback' });
  }
});

module.exports = router;
