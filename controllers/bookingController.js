const Booking = require('../models/Booking');
const User = require('../models/User');
const Notification = require('../models/Notification');

// Conditionally import session controller to avoid errors
let createSession;
try {
  const sessionController = require('./sessionController');
  createSession = sessionController.createSession;
} catch (error) {
  console.log('Session controller not available yet, sessions will be created when ready');
}

// Helper function to create notifications
const createNotification = async (userId, type, bookingId, mentorName, learnerName, bookingDate, bookingTime) => {
  const messages = {
    'new_booking_request': `New booking request from ${learnerName}`,
    'booking_confirmed': `Your booking with ${mentorName} has been confirmed`,
    'booking_rejected': `Your booking with ${mentorName} has been rejected`,
    'booking_cancelled': `Booking with ${mentorName} has been cancelled`
  };

  try {
    await Notification.create({
      userId,
      type,
      bookingId,
      message: messages[type],
      mentorName,
      learnerName,
      bookingDate,
      bookingTime
    });
  } catch (error) {
    console.error('Error creating notification:', error);
  }
};

/**
 * GET /bookings/available-slots/:mentorId
 * Get available time slots for a mentor on a specific date
 */
exports.getAvailableSlots = async (req, res, next) => {
  try {
    const { mentorId } = req.params;
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({ success: false, message: 'Date is required' });
    }

    // Validate mentor exists and is approved
    const mentor = await User.findOne({
      _id: mentorId,
      roles: { $in: ['mentor'] },
      isApproved: true
    });

    if (!mentor) {
      return res.status(404).json({ success: false, message: 'Mentor not found' });
    }

    // Get bookings for the mentor on the specified date
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const existingBookings = await Booking.find({
      mentorId,
      date: { $gte: startOfDay, $lte: endOfDay },
      status: { $in: ['pending', 'confirmed'] }
    }).select('time');

    // Generate available time slots (9 AM to 9 PM)
    const allSlots = [];
    for (let hour = 9; hour <= 21; hour++) {
      allSlots.push(`${hour.toString().padStart(2, '0')}:00`);
    }

    // Filter out booked slots
    const bookedTimes = existingBookings.map(booking => booking.time);
    const availableSlots = allSlots.filter(slot => !bookedTimes.includes(slot));

    return res.json({
      success: true,
      availableSlots,
      totalSlots: allSlots.length,
      bookedSlots: bookedTimes.length
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /bookings
 * Create a new booking (learners only)
 */
exports.createBooking = async (req, res, next) => {
  try {
    const { mentorId, date, time, message } = req.body;
    const learnerId = req.user.id;

    // Validate user is a learner
    const learner = await User.findById(learnerId);
    if (!learner || !learner.roles?.includes('learner')) {
      return res.status(403).json({ success: false, message: 'Only learners can create bookings' });
    }

    // Validate mentor exists and is approved
    const mentor = await User.findOne({
      _id: mentorId,
      roles: { $in: ['mentor'] },
      isApproved: true,
      isProfileComplete: true
    });

    if (!mentor) {
      return res.status(404).json({ success: false, message: 'Mentor not found or not available for booking' });
    }

    // Validate required fields
    if (!mentorId || !date || !time) {
      return res.status(400).json({ success: false, message: 'Mentor, date, and time are required' });
    }

    // Validate date is in the future
    const bookingDate = new Date(date);
    if (bookingDate <= new Date()) {
      return res.status(400).json({ success: false, message: 'Booking date must be in the future' });
    }

    const booking = await Booking.create({
      mentorId,
      learnerId,
      date: bookingDate,
      time,
      message: message || ''
    });

    const populatedBooking = await Booking.findById(booking._id)
      .populate('mentorId', 'fullName avatar')
      .populate('learnerId', 'fullName avatar');

    // Create notification for mentor
    await createNotification(
      mentorId,
      'new_booking_request',
      booking._id,
      mentor.fullName,
      learner.fullName,
      bookingDate,
      time
    );

    return res.status(201).json({
      success: true,
      message: 'Booking created successfully',
      booking: populatedBooking
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /bookings
 * Get user's bookings (learner sees their bookings, mentor sees bookings for them)
 */
exports.getMyBookings = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    let query = {};
    if (user.roles?.includes('learner')) {
      query.learnerId = userId;
    } else if (user.roles?.includes('mentor')) {
      query.mentorId = userId;
    } else {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const bookings = await Booking.find(query)
      .populate('mentorId', 'fullName avatar')
      .populate('learnerId', 'fullName avatar')
      .sort({ createdAt: -1 });

    return res.json({ success: true, bookings });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /bookings/:id/confirm
 * Mentor confirms a booking
 */
exports.confirmBooking = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    // Only the mentor can confirm their bookings
    if (booking.mentorId.toString() !== userId) {
      return res.status(403).json({ success: false, message: 'You can only confirm your own bookings' });
    }

    if (booking.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Only pending bookings can be confirmed' });
    }

    booking.status = 'confirmed';
    await booking.save();

    const updatedBooking = await Booking.findById(id)
      .populate('mentorId', 'fullName avatar')
      .populate('learnerId', 'fullName avatar');

    // Create session for chat and video call if available
    if (createSession) {
      try {
        await createSession(booking._id);
        console.log('Session created successfully for booking:', booking._id);
      } catch (sessionError) {
        console.error('Error creating session:', sessionError);
        // Don't fail the booking confirmation if session creation fails
      }
    } else {
      console.log('Session creation not available yet, booking confirmed without session');
    }

    // Create notification for learner
    await createNotification(
      booking.learnerId,
      'booking_confirmed',
      booking._id,
      updatedBooking.mentorId.fullName,
      updatedBooking.learnerId.fullName,
      booking.date,
      booking.time
    );

    return res.json({
      success: true,
      message: 'Booking confirmed successfully',
      booking: updatedBooking
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /bookings/:id/reject
 * Mentor rejects a booking
 */
exports.rejectBooking = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    // Only the mentor can reject their bookings
    if (booking.mentorId.toString() !== userId) {
      return res.status(403).json({ success: false, message: 'You can only reject your own bookings' });
    }

    if (booking.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Only pending bookings can be rejected' });
    }

    booking.status = 'cancelled';
    await booking.save();

    const updatedBooking = await Booking.findById(id)
      .populate('mentorId', 'fullName avatar')
      .populate('learnerId', 'fullName avatar');

    // Create notification for learner
    await createNotification(
      booking.learnerId,
      'booking_rejected',
      booking._id,
      updatedBooking.mentorId.fullName,
      updatedBooking.learnerId.fullName,
      booking.date,
      booking.time
    );

    return res.json({
      success: true,
      message: 'Booking rejected successfully',
      booking: updatedBooking
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /bookings/:id
 * Cancel a booking (either party can cancel)
 */
exports.cancelBooking = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    // Only mentor or learner involved in the booking can cancel
    const isMentor = booking.mentorId.toString() === userId;
    const isLearner = booking.learnerId.toString() === userId;

    if (!isMentor && !isLearner) {
      return res.status(403).json({ success: false, message: 'You can only cancel your own bookings' });
    }

    // Learners can only cancel pending bookings
    if (isLearner && booking.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'You can only cancel pending booking requests. Once confirmed, please contact your mentor to reschedule.' });
    }

    // Mentors can cancel pending or confirmed bookings
    if (isMentor && (booking.status === 'completed' || booking.status === 'cancelled')) {
      return res.status(400).json({ success: false, message: 'Cannot cancel completed or already cancelled bookings' });
    }

    booking.status = 'cancelled';
    await booking.save();

    return res.json({
      success: true,
      message: 'Booking cancelled successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /bookings/:id/complete
 * Mark a booking as completed (either party can mark as completed)
 */
exports.completeBooking = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    // Only mentor or learner involved in the booking can mark as completed
    const isMentor = booking.mentorId.toString() === userId;
    const isLearner = booking.learnerId.toString() === userId;

    if (!isMentor && !isLearner) {
      return res.status(403).json({ success: false, message: 'You can only complete your own bookings' });
    }

    if (booking.status !== 'confirmed') {
      return res.status(400).json({ success: false, message: 'Only confirmed bookings can be marked as completed' });
    }

    booking.status = 'completed';
    await booking.save();

    const updatedBooking = await Booking.findById(id)
      .populate('mentorId', 'fullName avatar')
      .populate('learnerId', 'fullName avatar');

    return res.json({
      success: true,
      message: 'Booking marked as completed successfully',
      booking: updatedBooking
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /bookings/notifications
 * Get user's notifications
 */
exports.getNotifications = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const notifications = await Notification.find({ userId })
      .sort({ createdAt: -1 })
      .limit(20);

    const unreadCount = await Notification.countDocuments({ 
      userId, 
      read: false 
    });

    return res.json({
      success: true,
      notifications,
      unreadCount
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /bookings/notifications/:id/read
 * Mark notification as read
 */
exports.markNotificationAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const notification = await Notification.findOne({ _id: id, userId });
    
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    notification.read = true;
    await notification.save();

    return res.json({
      success: true,
      message: 'Notification marked as read'
    });
  } catch (error) {
    next(error);
  }
}; 