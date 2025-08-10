const express = require('express');
const bookingController = require('../controllers/bookingController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// All booking routes require authentication
router.use(protect);

// Booking routes
router.get('/available-slots/:mentorId', bookingController.getAvailableSlots);
router.get('/notifications', bookingController.getNotifications);
router.put('/notifications/:id/read', bookingController.markNotificationAsRead);
router.post('/', bookingController.createBooking);
router.get('/', bookingController.getMyBookings);
router.put('/:id/confirm', bookingController.confirmBooking);
router.put('/:id/reject', bookingController.rejectBooking);
router.put('/:id/complete', bookingController.completeBooking);
router.delete('/:id', bookingController.cancelBooking);

module.exports = router; 