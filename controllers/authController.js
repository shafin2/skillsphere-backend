const bcrypt = require('bcrypt');
const User = require('../models/User');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../utils/generateTokens');
const { sendResetPasswordEmail, sendVerifyEmail } = require('../utils/sendEmail');
const jwt = require('jsonwebtoken');

const SALT_ROUNDS = 10;

function validatePasswordStrength(password) {
  const minLength = 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSymbol = /[^A-Za-z0-9]/.test(password);

  if (!password || password.length < minLength) return 'Password must be at least 8 characters long';
  if (!hasUppercase) return 'Password must include at least one uppercase letter';
  if (!hasNumber) return 'Password must include at least one number';
  if (!hasSymbol) return 'Password must include at least one symbol';
  return null;
}

function setRefreshCookie(res, refreshToken) {
  const isProduction = process.env.NODE_ENV === 'production';
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000
  });
}

exports.signup = async (req, res, next) => {
  try {
    const { name, email, password, confirmPassword, role } = req.body;

    if (!name || !email || !password || !confirmPassword) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    if (role === 'admin') {
      return res.status(403).json({ success: false, message: 'Admin account cannot be created via signup' });
    }

    const strengthError = validatePasswordStrength(password);
    if (strengthError) {
      return res.status(400).json({ success: false, message: strengthError });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'Passwords do not match' });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Email already in use' });
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const isMentorRequested = role === 'mentor';
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      roles: [isMentorRequested ? 'mentor' : 'learner'],
      isApproved: isMentorRequested ? false : undefined,
      isEmailVerified: false
    });

    // Send verification email
    const emailToken = jwt.sign({ sub: String(user._id), type: 'verify' }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '24h' });
    const verifyLink = `${process.env.CLIENT_URL}/verify-email?token=${emailToken}`;
    try {
      await sendVerifyEmail({ to: user.email, name: user.name, verifyLink });
    } catch (e) {
      // Non-fatal for API response; user can request resend later (not implemented here)
      if (process.env.NODE_ENV !== 'production') console.warn('Failed to send verification email:', e.message);
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    const refreshTokenHash = await bcrypt.hash(refreshToken, SALT_ROUNDS);
    user.refreshTokenHash = refreshTokenHash;
    await user.save();

    setRefreshCookie(res, refreshToken);

    return res.status(201).json({
      success: true,
      message: isMentorRequested ? 'Account created. Mentor application pending approval.' : 'Account created successfully. Please verify your email.',
      user: { id: user._id, name: user.name, email: user.email, roles: user.roles, isApproved: user.isApproved, isEmailVerified: user.isEmailVerified },
      accessToken
    });
  } catch (error) {
    next(error);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Admin login allowed (admin is seeded)

    if (!user.password) {
      return res.status(400).json({ success: false, message: 'Account uses Google sign-in. Use Google to log in.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (!user.isEmailVerified && !user.roles?.includes('admin')) {
      return res.status(403).json({ success: false, message: 'Please verify your email before logging in' });
    }

    if (user.roles?.includes('mentor') && !user.isApproved) {
      return res.status(403).json({ success: false, message: 'Mentor application pending approval' });
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    const refreshTokenHash = await bcrypt.hash(refreshToken, SALT_ROUNDS);

    user.refreshTokenHash = refreshTokenHash;
    await user.save();

    setRefreshCookie(res, refreshToken);

    return res.json({
      success: true,
      message: 'Logged in successfully',
      user: { id: user._id, name: user.name, email: user.email, roles: user.roles, isApproved: user.isApproved, isEmailVerified: user.isEmailVerified },
      accessToken
    });
  } catch (error) {
    next(error);
  }
};

exports.verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).json({ success: false, message: 'Missing token' });
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    if (decoded.type !== 'verify') return res.status(400).json({ success: false, message: 'Invalid token type' });
    const user = await User.findById(decoded.sub);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (user.isEmailVerified) return res.json({ success: true, message: 'Email already verified' });
    user.isEmailVerified = true;
    await user.save();
    return res.json({ success: true, message: 'Email verified successfully' });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(400).json({ success: false, message: 'Verification link expired' });
    }
    next(error);
  }
};

exports.logout = async (req, res, next) => {
  try {
    const tokenFromCookie = req.cookies?.refreshToken;
    if (tokenFromCookie) {
      try {
        const payload = verifyRefreshToken(tokenFromCookie);
        const user = await User.findById(payload.sub);
        if (user?.refreshTokenHash) {
          const matches = await bcrypt.compare(tokenFromCookie, user.refreshTokenHash);
          if (matches) {
            user.refreshTokenHash = null;
            await user.save();
          }
        }
      } catch (_) {
        // token invalid or expired – proceed to clear cookie anyway
      }
    }

    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      path: '/'
    });

    return res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
};

exports.refresh = async (req, res, next) => {
  try {
    const tokenFromCookie = req.cookies?.refreshToken;
    if (!tokenFromCookie) return res.status(401).json({ success: false, message: 'Missing refresh token' });
    const payload = verifyRefreshToken(tokenFromCookie);
    const user = await User.findById(payload.sub);
    if (!user || !user.refreshTokenHash) return res.status(401).json({ success: false, message: 'Invalid refresh token' });
    const matches = await bcrypt.compare(tokenFromCookie, user.refreshTokenHash);
    if (!matches) return res.status(401).json({ success: false, message: 'Invalid refresh token' });

    // Rotate refresh token
    const newRefreshToken = generateRefreshToken(user);
    user.refreshTokenHash = await bcrypt.hash(newRefreshToken, SALT_ROUNDS);
    await user.save();
    setRefreshCookie(res, newRefreshToken);

    const accessToken = generateAccessToken(user);
    return res.json({ success: true, accessToken });
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
  }
};

exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    // Always respond with success to avoid email enumeration
    if (!user) {
      return res.json({ success: true, message: 'If an account exists for that email, a reset link has been sent.' });
    }

    const token = jwt.sign({ sub: String(user._id), type: 'reset' }, process.env.RESET_PASSWORD_SECRET, { expiresIn: '1h' });
    const resetLink = `${process.env.CLIENT_URL}/reset-password?token=${token}`;

    await sendResetPasswordEmail({ to: user.email, name: user.name, resetLink });

    return res.json({ success: true, message: 'If an account exists for that email, a reset link has been sent.' });
  } catch (error) {
    next(error);
  }
};

exports.resetPassword = async (req, res, next) => {
  try {
    const { token, password, confirmPassword } = req.body;
    if (!token || !password || !confirmPassword) {
      return res.status(400).json({ success: false, message: 'Token, password and confirmation are required' });
    }

    const strengthError = validatePasswordStrength(password);
    if (strengthError) {
      return res.status(400).json({ success: false, message: strengthError });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'Passwords do not match' });
    }

    const decoded = jwt.verify(token, process.env.RESET_PASSWORD_SECRET);
    if (decoded.type !== 'reset') {
      return res.status(400).json({ success: false, message: 'Invalid token type' });
    }

    const user = await User.findById(decoded.sub);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    user.password = hashedPassword;
    user.refreshTokenHash = null; // force logout on other devices
    await user.save();

    return res.json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(400).json({ success: false, message: 'Reset link has expired' });
    }
    next(error);
  }
};

exports.googleCallback = async (req, res, next) => {
  try {
    // User is attached by passport in the route
    const user = req.user;

    if (user.roles?.includes('admin')) {
      return res.redirect(302, `${process.env.CLIENT_URL}/login?error=admin_login_disabled`);
    }

    if (user.roles?.includes('mentor') && !user.isApproved) {
      return res.redirect(302, `${process.env.CLIENT_URL}/login?error=mentor_pending_approval`);
    }

    // Consider Google emails as verified
    if (user.email && !user.isEmailVerified) {
      user.isEmailVerified = true;
      await user.save();
    }
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    const hashed = await bcrypt.hash(refreshToken, SALT_ROUNDS);

    user.refreshTokenHash = hashed;
    await user.save();

    setRefreshCookie(res, refreshToken);

    const redirectUrl = `${process.env.CLIENT_URL}/oauth-success?token=${encodeURIComponent(accessToken)}`;
    return res.redirect(302, redirectUrl);
  } catch (error) {
    next(error);
  }
};

exports.me = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('_id name email roles isApproved createdAt updatedAt');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, user });
  } catch (error) {
    next(error);
  }
};

// Admin: Mentor approval system
exports.listMentors = async (req, res, next) => {
  try {
    const status = req.query.status || 'pending';
    const filter = { roles: 'mentor' };
    if (status === 'pending') filter.isApproved = false;
    if (status === 'approved') filter.isApproved = true;

    const mentors = await User.find(filter).select('_id name email roles isApproved createdAt');
    return res.json({ success: true, mentors });
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
    return res.json({ success: true, message: 'Mentor approved', user: { id: user._id, isApproved: user.isApproved } });
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
    user.roles = ['learner'];
    user.isApproved = false;
    await user.save();
    return res.json({ success: true, message: 'Mentor application rejected', user: { id: user._id, roles: user.roles } });
  } catch (error) {
    next(error);
  }
}; 