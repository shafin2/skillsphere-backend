const jwt = require('jsonwebtoken');

function generateAccessToken(user) {
  const payload = {
    sub: String(user._id),
    email: user.email || null,
    name: user.name || null,
    roles: Array.isArray(user.roles) ? user.roles : [],
    type: 'access'
  };
  return jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '15m' });
}

function generateRefreshToken(user) {
  const payload = {
    sub: String(user._id),
    type: 'refresh'
  };
  return jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET, { expiresIn: '7d' });
}

function verifyAccessToken(token) {
  return jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
}

function verifyRefreshToken(token) {
  return jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken
}; 