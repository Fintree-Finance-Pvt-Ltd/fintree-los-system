const db = require('../db');

/**
 * Loads the user's distinct permission codes and attaches them at req.user.permissions.
 * Requires req.user to be set by JWT middleware.
 */
async function attachPermissions(req, res, next) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const rows = await db('permissions as p')
      .distinct('p.code')
      .join('role_permissions as rp', 'rp.permission_id', 'p.id')
      .join('user_roles as ur', 'ur.role_id', 'rp.role_id')
      .where('ur.user_id', req.user.id);

    req.user.permissions = rows.map(r => r.code);
    next();
  } catch (e) {
    next(e);
  }
}

/** Factory: returns an Express middleware that enforces a permission code. */
function requirePerm(code) {
  return (req, res, next) => {
    if (req.user?.permissions?.includes(code)) return next();
    return res.status(403).json({ error: 'Forbidden', need: code });
  };
}

module.exports = { attachPermissions, requirePerm };
