const express = require('express');
const bookingController = require('../controllers/bookingController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// All booking routes require authentication
router.use(protect);

// Booking routes
router.post('/', bookingController.createBooking);
router.get('/', bookingController.getMyBookings);
router.put('/:id/confirm', bookingController.confirmBooking);
router.put('/:id/reject', bookingController.rejectBooking);
router.delete('/:id', bookingController.cancelBooking);

module.exports = router; 