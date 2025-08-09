const express = require('express');
const profileController = require('../controllers/profileController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// All profile routes require authentication
router.use(protect);

// Profile routes
router.get('/me', profileController.getMyProfile);
router.put('/me', profileController.updateMyProfile);

module.exports = router; 