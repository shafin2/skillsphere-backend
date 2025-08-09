const express = require('express');
const passport = require('passport');
const authController = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// Email/Password auth
router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.post('/logout', authController.logout);
router.get('/verify-email', authController.verifyEmail);
router.post('/refresh', authController.refresh);

// Password reset
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

// Current user
router.get('/me', protect, authController.me);

// Google OAuth (allow role selection via ?role=learner|mentor -> passed as state)
router.get('/google', (req, res, next) => {
  const role = (req.query.role || 'learner').toString().toLowerCase();
  const state = role === 'mentor' ? 'role:mentor' : 'role:learner';
  passport.authenticate('google', { scope: ['profile', 'email'], prompt: 'select_account', session: false, state })(
    req,
    res,
    next
  );
});

router.get(
  '/google/callback',
  passport.authenticate('google', {
    failureRedirect: `${process.env.CLIENT_URL}/login?error=oauth_failed`,
    session: false
  }),
  authController.googleCallback
);

module.exports = router; 