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
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', UserSchema); 