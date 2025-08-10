const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const { protect } = require('../middleware/authMiddleware');

// All AI routes require authentication
router.use(protect);

// AI Assistant routes
router.get('/welcome', aiController.getWelcomeMessage);
router.post('/ask', aiController.askAI);
router.post('/summarize-session', aiController.summarizeSession);

// AI Recommendations
router.get('/recommended-mentors', aiController.getRecommendedMentors);
router.get('/mentor-insights', aiController.getMentorInsights);

module.exports = router;
