const express = require('express');
const { protect, restrictTo } = require('../middleware/authMiddleware');
const adminController = require('../controllers/adminController');

const router = express.Router();

router.get('/mentors/pending', protect, restrictTo('admin'), adminController.getPendingMentors);
router.post('/mentors/:id/approve', protect, restrictTo('admin'), adminController.approveMentor);
router.post('/mentors/:id/reject', protect, restrictTo('admin'), adminController.rejectMentor);

module.exports = router; 