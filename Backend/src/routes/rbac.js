const router = require('express').Router();
const db = require('../db');
const { requirePerm } = require('../middleware/permissions');

/** GET /rbac/menu
 * Returns the caller's permission codes — the frontend will show/hide menus using this.
 */
router.get('/menu', (req, res) => {
  res.json({ permissions: req.user.permissions || [] });
});

/** POST /rbac/assign-role
 * body: { user_id, role_code }
 * Only users with RBAC_MANAGE can assign roles.
 */
router.post('/assign-role', requirePerm('RBAC_MANAGE'), async (req, res) => {
  const { user_id, role_code } = req.body || {};
  const role = await db('roles').where({ code: role_code }).first();
  if (!role) return res.status(400).json({ error: 'Role not found' });

  await db('user_roles')
    .insert({ user_id, role_id: role.id })
    .onConflict(['user_id', 'role_id'])
    .ignore();

  res.json({ ok: true });
});

module.exports = router;
