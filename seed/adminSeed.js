require('dotenv').config();
const bcrypt = require('bcrypt');
const connectToDatabase = require('../config/db');
const User = require('../models/User');

(async () => {
  try {
    const { ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
    if (!ADMIN_NAME || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
      console.error('Missing ADMIN_NAME, ADMIN_EMAIL, or ADMIN_PASSWORD in environment');
      process.exit(1);
    }

    await connectToDatabase();

    let user = await User.findOne({ email: ADMIN_EMAIL.toLowerCase() });
    if (user) {
      if (!user.roles.includes('admin')) {
        user.roles.push('admin');
      }
      if (!user.password) {
        user.password = await bcrypt.hash(ADMIN_PASSWORD, 10);
      }
      user.isEmailVerified = true;
      await user.save();
      console.log('Updated existing user to admin:', user.email);
      process.exit(0);
    }

    const hashed = await bcrypt.hash(ADMIN_PASSWORD, 10);
    user = await User.create({
      name: ADMIN_NAME,
      email: ADMIN_EMAIL.toLowerCase(),
      password: hashed,
      roles: ['admin'],
      isApproved: true,
      isEmailVerified: true
    });
    console.log('Created admin user:', user.email);
    process.exit(0);
  } catch (error) {
    console.error('Admin seed failed:', error);
    process.exit(1);
  }
})(); 