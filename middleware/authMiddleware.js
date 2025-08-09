const jwt = require('jsonwebtoken');

function protect(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;

    if (!token) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    if (decoded.type !== 'access') {
      return res.status(401).json({ success: false, message: 'Invalid token type' });
    }

    req.user = { id: decoded.sub, email: decoded.email, name: decoded.name, roles: decoded.roles || [] };
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
}

function restrictTo(...allowedRoles) {
  return (req, res, next) => {
    const userRoles = Array.isArray(req.user?.roles) ? req.user.roles : [];
    const isAllowed = userRoles.some((role) => allowedRoles.includes(role));
    if (!isAllowed) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    next();
  };
}

module.exports = { protect, restrictTo }; 