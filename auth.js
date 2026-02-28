// Lightweight RBAC helper (Phase X5)
function requireRole(role) {
  return function (req, res, next) {
    const r = (req.headers['x-role'] || '').toLowerCase();
    if (!r) {
      return res.status(401).json({ error: 'Role required' });
    }
    if (role && r !== role) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    req.role = r;
    next();
  };
}

module.exports = {
  requireRole
};
