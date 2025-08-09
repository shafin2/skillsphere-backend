const User = require('../models/User');

// Helper function to check if profile is complete based on role
function checkProfileCompletion(user) {
  const requiredFields = ['fullName', 'bio', 'skills', 'timezone'];
  
  // Check common required fields
  for (const field of requiredFields) {
    if (!user[field] || (Array.isArray(user[field]) && user[field].length === 0)) {
      return false;
    }
  }

  // Additional checks for mentors
  if (user.roles && user.roles.includes('mentor')) {
    const mentorFields = ['expertise', 'availability', 'experience'];
    for (const field of mentorFields) {
      if (!user[field]) {
        return false;
      }
    }
  }

  return true;
}

exports.getMyProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('-password -refreshTokenHash');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, user });
  } catch (error) {
    next(error);
  }
};

exports.updateMyProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const updates = req.body;

    // Define allowed fields for updates
    const allowedFields = [
      'fullName', 'bio', 'avatar', 'skills', 'timezone', 'socialLinks',
      'expertise', 'availability', 'hourlyRate', 'experience'
    ];

    // Filter out non-allowed fields
    const filteredUpdates = {};
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        filteredUpdates[field] = updates[field];
      }
    }

    // Validation
    if (filteredUpdates.bio && filteredUpdates.bio.length > 500) {
      return res.status(400).json({ success: false, message: 'Bio must be 500 characters or less' });
    }

    if (filteredUpdates.hourlyRate !== undefined && filteredUpdates.hourlyRate < 0) {
      return res.status(400).json({ success: false, message: 'Hourly rate must be a positive number' });
    }

    if (filteredUpdates.skills && !Array.isArray(filteredUpdates.skills)) {
      return res.status(400).json({ success: false, message: 'Skills must be an array' });
    }

    // Update user
    const user = await User.findByIdAndUpdate(
      userId,
      filteredUpdates,
      { new: true, runValidators: true }
    ).select('-password -refreshTokenHash');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Check and update profile completion status
    const isComplete = checkProfileCompletion(user);
    if (user.isProfileComplete !== isComplete) {
      user.isProfileComplete = isComplete;
      await user.save();
    }

    res.json({ 
      success: true, 
      message: 'Profile updated successfully',
      user,
      isProfileComplete: isComplete
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ success: false, message: error.message });
    }
    next(error);
  }
}; 