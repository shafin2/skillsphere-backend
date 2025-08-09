const User = require('../models/User');

/**
 * GET /mentors/:id
 * Public endpoint to get a single mentor's profile
 */
exports.getMentorById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const mentor = await User.findOne({
      _id: id,
      roles: { $in: ['mentor'] },
      isApproved: true,
      isProfileComplete: true
    }).select('_id fullName bio avatar skills expertise hourlyRate timezone experience socialLinks availability').lean();

    if (!mentor) {
      return res.status(404).json({ success: false, message: 'Mentor not found' });
    }

    return res.json({ success: true, mentor });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /mentors
 * Public endpoint to list approved and profile-complete mentors
 * Query params:
 *  - skill: case-insensitive regex on skills array
 *  - expertise: case-insensitive regex on expertise
 *  - timezone: exact match
 *  - rateMin, rateMax: numeric filters on hourlyRate
 *  - page, limit: pagination
 */
exports.getMentors = async (req, res, next) => {
  try {
    const {
      skill,
      expertise,
      timezone,
      rateMin,
      rateMax,
      page = 1,
      limit = 10
    } = req.query;

    const numericLimit = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 50);
    const numericPage = Math.max(parseInt(page, 10) || 1, 1);

    const query = {
      roles: { $in: ['mentor'] },
      isApproved: true,
      isProfileComplete: true
    };

    if (skill && typeof skill === 'string') {
      query.skills = { $elemMatch: { $regex: new RegExp(skill, 'i') } };
    }

    if (expertise && typeof expertise === 'string') {
      query.expertise = { $regex: new RegExp(expertise, 'i') };
    }

    if (timezone && typeof timezone === 'string') {
      query.timezone = timezone;
    }

    const hourly = {};
    const hasMin = typeof rateMin === 'string' && rateMin.trim() !== '';
    const hasMax = typeof rateMax === 'string' && rateMax.trim() !== '';
    if (hasMin) {
      const n = Number(rateMin);
      if (!Number.isNaN(n)) hourly.$gte = n;
    }
    if (hasMax) {
      const n = Number(rateMax);
      if (!Number.isNaN(n)) hourly.$lte = n;
    }
    if (Object.keys(hourly).length) query.hourlyRate = hourly;

    const projection = '_id fullName bio avatar skills expertise hourlyRate timezone experience';

    const total = await User.countDocuments(query);

    const mentors = await User.find(query)
      .select(projection)
      .sort({ createdAt: -1 })
      .skip((numericPage - 1) * numericLimit)
      .limit(numericLimit)
      .lean();

    const totalPages = Math.max(Math.ceil(total / numericLimit), 1);

    return res.json({
      success: true,
      mentors,
      totalPages,
      currentPage: numericPage
    });
  } catch (error) {
    next(error);
  }
}; 