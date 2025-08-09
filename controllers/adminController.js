const User = require('../models/User');

exports.getPendingMentors = async (req, res, next) => {
  try {
    const mentors = await User.find({ roles: 'mentor', isApproved: false }).select('_id name email roles isApproved createdAt');
    res.json({ success: true, mentors });
  } catch (error) {
    next(error);
  }
};

exports.approveMentor = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user || !user.roles?.includes('mentor')) {
      return res.status(404).json({ success: false, message: 'Mentor not found' });
    }
    user.isApproved = true;
    await user.save();
    res.json({ success: true, message: 'Mentor approved', user: { id: user._id, isApproved: user.isApproved } });
  } catch (error) {
    next(error);
  }
};

exports.rejectMentor = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user || !user.roles?.includes('mentor')) {
      return res.status(404).json({ success: false, message: 'Mentor not found' });
    }
    await user.deleteOne();
    res.json({ success: true, message: 'Mentor rejected and deleted' });
  } catch (error) {
    next(error);
  }
}; 