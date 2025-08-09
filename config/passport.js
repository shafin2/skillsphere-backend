const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

const clientID = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;

if (!clientID || !clientSecret) {
  console.warn('Google OAuth CLIENT_ID/CLIENT_SECRET are not set. Google login will not work until configured.');
}

passport.use(
  new GoogleStrategy(
    {
      clientID,
      clientSecret,
      callbackURL: '/auth/google/callback',
      passReqToCallback: true
    },
    async (req, accessToken, refreshToken, profile, done) => {
      try {
        const googleId = profile.id;
        const primaryEmail = Array.isArray(profile.emails) && profile.emails.length > 0 ? profile.emails[0].value : undefined;
        const displayName = profile.displayName || 'User';

        // Role comes via state param e.g., state=role:mentor or role:learner
        let requestedRole = 'learner';
        try {
          const state = req.query.state || '';
          const match = /^role:(learner|mentor)$/i.exec(state);
          if (match) requestedRole = match[1].toLowerCase();
        } catch (_) {}

        let user = await User.findOne({ $or: [{ googleId }, { email: primaryEmail?.toLowerCase() }] });

        if (!user) {
          // Admin via OAuth is not allowed
          const roles = [requestedRole === 'mentor' ? 'mentor' : 'learner'];
          user = await User.create({
            name: displayName,
            email: primaryEmail ? primaryEmail.toLowerCase() : undefined,
            googleId,
            roles,
            isApproved: requestedRole === 'mentor' ? false : undefined
          });
        } else {
          // Link googleId if existing local account
          if (!user.googleId) {
            user.googleId = googleId;
          }
          // If user is learner and requested mentor, upgrade role but mark not approved
          if (requestedRole === 'mentor' && !user.roles.includes('mentor')) {
            user.roles.push('mentor');
            user.isApproved = false;
          }
          await user.save();
        }

        return done(null, user);
      } catch (error) {
        return done(error, null);
      }
    }
  )
);

module.exports = passport; 