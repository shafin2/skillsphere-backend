const express = require('express');
const { protect, restrictTo } = require('../middleware/authMiddleware');
const adminController = require('../controllers/adminController');

const router = express.Router();

// Mentor management
router.get('/mentors/pending', protect, restrictTo('admin'), adminController.getPendingMentors);
router.post('/mentors/:id/approve', protect, restrictTo('admin'), adminController.approveMentor);
router.post('/mentors/:id/reject', protect, restrictTo('admin'), adminController.rejectMentor);

// Analytics
router.get('/analytics', protect, restrictTo('admin'), adminController.getAnalytics);

// User management
router.get('/users', protect, restrictTo('admin'), adminController.getAllUsers);
router.get('/users/:id', protect, restrictTo('admin'), adminController.getUserDetails);
router.patch('/users/:id/toggle-status', protect, restrictTo('admin'), adminController.toggleUserStatus);

// Session management
router.get('/sessions', protect, restrictTo('admin'), adminController.getAllSessions);
router.get('/sessions/:id', protect, restrictTo('admin'), adminController.getSessionDetails);
router.patch('/sessions/:id/cancel', protect, restrictTo('admin'), adminController.cancelSession);

// Feedback management
router.get('/feedback', protect, restrictTo('admin'), adminController.getAllFeedback);
router.put('/feedback/:id/moderate', protect, restrictTo('admin'), adminController.moderateFeedback);

// Export
router.get('/export/users', protect, restrictTo('admin'), adminController.exportUsers);
router.get('/export/sessions', protect, restrictTo('admin'), adminController.exportSessions);

module.exports = router; 