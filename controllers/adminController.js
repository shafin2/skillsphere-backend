const User = require('../models/User');
const Booking = require('../models/Booking');
const Feedback = require('../models/Feedback');

exports.getPendingMentors = async (req, res, next) => {
  try {
    const mentors = await User.find({ roles: 'mentor', isApproved: false }).select('_id name email roles isApproved createdAt');
    res.json({ success: true, mentors });
  } catch (error) {
    next(error);
  }
};

exports.approveMentor = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user || !user.roles?.includes('mentor')) {
      return res.status(404).json({ success: false, message: 'Mentor not found' });
    }
    user.isApproved = true;
    await user.save();
    res.json({ success: true, message: 'Mentor approved', user: { id: user._id, isApproved: user.isApproved } });
  } catch (error) {
    next(error);
  }
};

exports.rejectMentor = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user || !user.roles?.includes('mentor')) {
      return res.status(404).json({ success: false, message: 'Mentor not found' });
    }
    await user.deleteOne();
    res.json({ success: true, message: 'Mentor rejected and deleted' });
  } catch (error) {
    next(error);
  }
};

// Analytics APIs
exports.getAnalytics = async (req, res, next) => {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // User analytics
    const totalUsers = await User.countDocuments();
    const totalMentors = await User.countDocuments({ roles: 'mentor', isApproved: true });
    const pendingMentors = await User.countDocuments({ roles: 'mentor', isApproved: false });
    const totalLearners = await User.countDocuments({ roles: 'learner' });
    const newUsersThisMonth = await User.countDocuments({ createdAt: { $gte: thirtyDaysAgo } });
    const newUsersThisWeek = await User.countDocuments({ createdAt: { $gte: sevenDaysAgo } });

    // Session analytics
    const totalSessions = await Booking.countDocuments();
    const completedSessions = await Booking.countDocuments({ status: 'completed' });
    const activeSessions = await Booking.countDocuments({ status: 'confirmed', scheduledTime: { $lte: now, $gte: new Date(now.getTime() - 2 * 60 * 60 * 1000) } });
    const upcomingSessions = await Booking.countDocuments({ status: 'confirmed', scheduledTime: { $gt: now } });
    const cancelledSessions = await Booking.countDocuments({ status: 'cancelled' });
    const sessionsThisMonth = await Booking.countDocuments({ createdAt: { $gte: thirtyDaysAgo } });

    // Feedback analytics
    const totalFeedback = await Feedback.countDocuments();
    const avgRating = await Feedback.aggregate([
      { $group: { _id: null, averageRating: { $avg: '$rating' } } }
    ]);
    const averageRating = avgRating.length > 0 ? avgRating[0].averageRating : 0;

    // Rating distribution
    const ratingDistribution = await Feedback.aggregate([
      { $group: { _id: '$rating', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    // Weekly user growth (last 8 weeks)
    const weeklyUserGrowth = [];
    for (let i = 7; i >= 0; i--) {
      const weekStart = new Date(now.getTime() - (i + 1) * 7 * 24 * 60 * 60 * 1000);
      const weekEnd = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
      const count = await User.countDocuments({ 
        createdAt: { $gte: weekStart, $lt: weekEnd } 
      });
      weeklyUserGrowth.push({
        week: `Week ${8-i}`,
        users: count,
        date: weekStart.toISOString().split('T')[0]
      });
    }

    // Weekly session bookings (last 8 weeks)
    const weeklySessionBookings = [];
    for (let i = 7; i >= 0; i--) {
      const weekStart = new Date(now.getTime() - (i + 1) * 7 * 24 * 60 * 60 * 1000);
      const weekEnd = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
      const count = await Booking.countDocuments({ 
        createdAt: { $gte: weekStart, $lt: weekEnd } 
      });
      weeklySessionBookings.push({
        week: `Week ${8-i}`,
        sessions: count,
        date: weekStart.toISOString().split('T')[0]
      });
    }

    // Today's sessions
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
    const sessionsToday = await Booking.countDocuments({ 
      scheduledTime: { $gte: todayStart, $lt: todayEnd } 
    });

    // This week's sessions
    const weekStart = new Date(now.getTime() - now.getDay() * 24 * 60 * 60 * 1000);
    weekStart.setHours(0, 0, 0, 0);
    const sessionsThisWeek = await Booking.countDocuments({ 
      scheduledTime: { $gte: weekStart } 
    });

    res.json({
      success: true,
      analytics: {
        users: {
          total: totalUsers,
          mentors: totalMentors,
          learners: totalLearners,
          pendingMentors,
          newThisMonth: newUsersThisMonth,
          newThisWeek: newUsersThisWeek
        },
        sessions: {
          total: totalSessions,
          completed: completedSessions,
          active: activeSessions,
          upcoming: upcomingSessions,
          cancelled: cancelledSessions,
          thisMonth: sessionsThisMonth,
          today: sessionsToday,
          thisWeek: sessionsThisWeek
        },
        feedback: {
          total: totalFeedback,
          averageRating: Math.round(averageRating * 100) / 100,
          ratingDistribution
        },
        charts: {
          weeklyUserGrowth,
          weeklySessionBookings
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// User management
exports.getAllUsers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || '';
    const role = req.query.role || '';
    const status = req.query.status || '';

    let filter = {};
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    if (role) {
      filter.roles = role;
    }
    if (status === 'active') {
      filter.isEmailVerified = true;
    } else if (status === 'pending') {
      filter.isEmailVerified = false;
    }

    const users = await User.find(filter)
      .select('-password -refreshTokenHash')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await User.countDocuments(filter);

    res.json({
      success: true,
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get user details
exports.getUserDetails = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id).select('-password -refreshTokenHash');
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, user });
  } catch (error) {
    next(error);
  }
};

// Toggle user status (suspend/activate)
exports.toggleUserStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Toggle the isActive status (we'll add this field to the User model if it doesn't exist)
    user.isActive = user.isActive !== undefined ? !user.isActive : false;
    await user.save();

    res.json({ 
      success: true, 
      message: `User ${user.isActive ? 'activated' : 'suspended'} successfully`, 
      user: {
        id: user._id,
        isActive: user.isActive
      }
    });
  } catch (error) {
    next(error);
  }
};

// Session management
exports.getAllSessions = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const status = req.query.status || '';

    let filter = {};
    if (status) {
      filter.status = status;
    }

    const sessions = await Booking.find(filter)
      .populate('mentorId', 'name email')
      .populate('learnerId', 'name email')
      .sort({ scheduledTime: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Booking.countDocuments(filter);

    res.json({
      success: true,
      sessions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get session details
exports.getSessionDetails = async (req, res, next) => {
  try {
    const { id } = req.params;
    const session = await Booking.findById(id)
      .populate('mentorId', 'name email')
      .populate('learnerId', 'name email');
    
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    res.json({ success: true, session });
  } catch (error) {
    next(error);
  }
};

// Cancel session
exports.cancelSession = async (req, res, next) => {
  try {
    const { id } = req.params;
    const session = await Booking.findById(id);
    
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    session.status = 'cancelled';
    await session.save();

    res.json({ success: true, message: 'Session cancelled successfully', session });
  } catch (error) {
    next(error);
  }
};

// Feedback management
exports.getAllFeedback = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const rating = req.query.rating || '';

    let filter = {};
    if (rating) {
      filter.rating = parseInt(rating);
    }

    const feedback = await Feedback.find(filter)
      .populate('bookingId', 'scheduledTime')
      .populate('learnerId', 'name email')
      .populate('mentorId', 'name email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Feedback.countDocuments(filter);

    res.json({
      success: true,
      feedback,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

// Moderate feedback
exports.moderateFeedback = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { action, reason } = req.body; // action: 'hide', 'show', 'delete'

    const feedback = await Feedback.findById(id);
    if (!feedback) {
      return res.status(404).json({ success: false, message: 'Feedback not found' });
    }

    if (action === 'delete') {
      await feedback.deleteOne();
      return res.json({ success: true, message: 'Feedback deleted' });
    } else if (action === 'hide') {
      feedback.isHidden = true;
      feedback.moderationReason = reason;
    } else if (action === 'show') {
      feedback.isHidden = false;
      feedback.moderationReason = null;
    }

    await feedback.save();
    res.json({ success: true, message: `Feedback ${action}d successfully`, feedback });
  } catch (error) {
    next(error);
  }
};

// Export data
exports.exportUsers = async (req, res, next) => {
  try {
    const format = req.query.format || 'json';
    const users = await User.find({}).select('-password -refreshTokenHash');

    if (format === 'csv') {
      // Convert to CSV format
      const csv = [
        'ID,Name,Email,Roles,Email Verified,Created At',
        ...users.map(user => 
          `${user._id},${user.name},${user.email},${user.roles.join(';')},${user.isEmailVerified},${user.createdAt}`
        )
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=users.csv');
      return res.send(csv);
    }

    res.json({ success: true, users });
  } catch (error) {
    next(error);
  }
};

exports.exportSessions = async (req, res, next) => {
  try {
    const format = req.query.format || 'json';
    const sessions = await Booking.find({})
      .populate('mentorId', 'name email')
      .populate('learnerId', 'name email');

    if (format === 'csv') {
      const csv = [
        'ID,Mentor,Learner,Scheduled Time,Duration,Status,Created At',
        ...sessions.map(session => 
          `${session._id},${session.mentorId?.name},${session.learnerId?.name},${session.scheduledTime},${session.duration},${session.status},${session.createdAt}`
        )
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=sessions.csv');
      return res.send(csv);
    }

    res.json({ success: true, sessions });
  } catch (error) {
    next(error);
  }
}; 