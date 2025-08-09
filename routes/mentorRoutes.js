const express = require('express');
const mentorController = require('../controllers/mentorController');

const router = express.Router();

// Public routes
router.get('/', mentorController.getMentors);
router.get('/:id', mentorController.getMentorById);

module.exports = router; 