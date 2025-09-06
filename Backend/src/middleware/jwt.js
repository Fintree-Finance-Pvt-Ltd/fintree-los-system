const jwt = require('jsonwebtoken');

/**
 * Reads Bearer token, verifies it, and sets req.user = { id, email }.
 * On failure, returns 401. Keep it small; we'll add permission checks later.
 */
function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing Authorization header' });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: payload.id, email: payload.email };
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

module.exports = { auth };
