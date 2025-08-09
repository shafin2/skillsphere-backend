const Booking = require('../models/Booking');
const User = require('../models/User');

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

    if (booking.status === 'completed' || booking.status === 'cancelled') {
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