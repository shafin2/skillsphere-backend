const mongoose = require('mongoose');

const ALLOWED_ROLES = ['learner', 'mentor', 'admin'];

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: false,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true
    },
    isEmailVerified: {
      type: Boolean,
      default: false
    },
    password: {
      type: String,
      required: false
    },
    googleId: {
      type: String,
      required: false,
      index: true
    },
    refreshTokenHash: {
      type: String,
      required: false
    },
    roles: {
      type: [String],
      enum: ALLOWED_ROLES,
      default: ['learner']
    },
    isApproved: {
      type: Boolean,
      default: false
    },
    // Profile fields
    fullName: {
      type: String,
      trim: true
    },
    bio: {
      type: String,
      trim: true,
      maxlength: 500
    },
    avatar: {
      type: String,
      trim: true
    },
    skills: {
      type: [String],
      default: []
    },
    timezone: {
      type: String,
      trim: true
    },
    socialLinks: {
      linkedin: { type: String, trim: true },
      twitter: { type: String, trim: true },
      github: { type: String, trim: true }
    },
    // Mentor-only fields
    expertise: {
      type: String,
      trim: true
    },
    availability: {
      type: String,
      trim: true
    },
    hourlyRate: {
      type: Number,
      min: 0
    },
    experience: {
      type: String,
      trim: true
    },
    isProfileComplete: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', UserSchema); 