// Authentication/authorization helpers (Phase X5)
const jwt = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET || 'change-me-secure';

function authenticateToken(req, res, next) {
  let token = null;
  if (req.headers && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.substring(7);
  } else if (req.headers['x-access-token']) {
    token = req.headers['x-access-token'];
  }
  // Attempt to verify token if provided
  if (token) {
    try {
      const payload = jwt.verify(token, SECRET);
      req.user = { id: payload.sub, username: payload.username, role: payload.role };
      return next();
    } catch (e) {
      // invalid token; fall through to session-based or 401 later
    }
  }
  // Fallback to session if available
  if (req.session && req.session.user) {
    req.user = req.session.user;
    return next();
  }
  req.user = null;
  return next();
}

function requireRole(role) {
  return function (req, res, next) {
    const u = req.user || null;
    if (!u) return res.status(401).json({ error: 'Unauthorized' });
    if (role && u.role !== role) return res.status(403).json({ error: 'Forbidden' });
    req.user = u;
    next();
  };
}

module.exports = {
  authenticateToken,
  requireRole
};
