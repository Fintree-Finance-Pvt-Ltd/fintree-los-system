const router = require('express').Router();
const db = require('../db');
const { z } = require('zod');
const { requirePerm } = require('../middleware/permissions');
const { audit } = require('../middleware/audit');

/** GET /admin/users  -> list users with roles */
router.get('/users', requirePerm('RBAC_MANAGE'), async (req, res, next) => {
  try {
    const rows = await db('users as u')
      .leftJoin('user_roles as ur', 'ur.user_id', 'u.id')
      .leftJoin('roles as r', 'r.id', 'ur.role_id')
      .groupBy('u.id')
      .select(
        'u.id','u.email','u.name','u.is_active','u.created_at',
        db.raw('COALESCE(GROUP_CONCAT(r.code ORDER BY r.code SEPARATOR ","), "") as roles')
      )
      .orderBy('u.id','desc');

    res.json(rows.map(r => ({ ...r, roles: r.roles ? r.roles.split(',') : [] })));
  } catch (e) { next(e); }
});

/** GET /admin/roles -> list all roles (codes & names) */
router.get('/roles', requirePerm('RBAC_MANAGE'), async (req, res, next) => {
  try {
    const roles = await db('roles').select('id','code','name').orderBy('code');
    res.json(roles);
  } catch (e) { next(e); }
});

/** POST /admin/users -> create user */
router.post('/users',
  requirePerm('RBAC_MANAGE'),
  audit('CREATE','user'),
  async (req, res, next) => {
    try {
      const schema = z.object({
        email: z.string().email().max(191),
        name: z.string().max(191).optional().or(z.literal('')).transform(v=>v||null),
        is_active: z.boolean().optional().default(true)
      });
      const data = schema.parse(req.body);
      const [id] = await db('users').insert({ ...data, email: data.email.toLowerCase().trim() });
      res.locals.entityId = id;
      res.status(201).json({ id });
    } catch (e) { next(e); }
  }
);

router.post('/roles/create',
  requirePerm('RBAC_MANAGE'),
  audit('CREATE','role'), async (req, res, next) => {
    try{
      const schema = z.object({
        roleCode: z.string().max(191),
        roleName: z.string().max(191).optional().or(z.literal('')).transform(v=>v||null),
        is_active: z.boolean().optional().default(true)
      });
      const data = schema.parse(req.body);
      const existingRole = await db('roles').where({ code: data.roleCode }).first();
      if(existingRole){
        return res.status(400).json({ error: 'Role code already exists' });
      }
      const [id] = await db('roles').insert({ code: data.roleCode, name: data.roleName });
      res.locals.entityId = id;
      res.status(201).json({ id });
    } catch (e) { next(e); }
  }
);

/** PUT /admin/users/:id -> update name/is_active */
router.put('/users/:id',
  requirePerm('RBAC_MANAGE'),
  audit('UPDATE','user'),
  async (req, res, next) => {
    try {
      const schema = z.object({
        name: z.string().max(191).optional().or(z.literal('')).transform(v=>v||null),
        is_active: z.boolean().optional()
      });
      const body = schema.parse(req.body);
      const updated = await db('users').where({ id: req.params.id }).update(body);
      if (!updated) return res.status(404).json({ error: 'User not found' });
      res.locals.entityId = req.params.id;
      res.json({ ok: true });
    } catch (e) { next(e); }
  }
);

/** PUT /admin/users/:id/roles -> replace user's roles with supplied codes */
router.put('/users/:id/roles',
  requirePerm('RBAC_MANAGE'),
  audit('ASSIGN_ROLES','user'),
  async (req, res, next) => {
    try {
      const schema = z.object({ roles: z.array(z.string()).default([]) });
      const { roles } = schema.parse(req.body);

      const roleRows = roles.length
        ? await db('roles').select('id').whereIn('code', roles)
        : [];

      await db.transaction(async trx => {
        await trx('user_roles').where({ user_id: req.params.id }).del();
        for (const r of roleRows) {
          await trx('user_roles').insert({ user_id: req.params.id, role_id: r.id });
        }
      });

      res.locals.entityId = req.params.id;
      res.json({ ok: true });
    } catch (e) { next(e); }
  }
);

// list all permissions
router.get('/permissions', requirePerm('RBAC_MANAGE'), async (req, res, next) => {
  try {
    const list = await db('permissions')
      .select('id','code','description')
      .orderBy('code');
    res.json(list);
  } catch (e) { next(e); }
});

// get a role's permission codes
router.get('/roles/:code/permissions', requirePerm('RBAC_MANAGE'), async (req, res, next) => {
  try {
    const role = await db('roles').where({ code: req.params.code }).first();
    if (!role) return res.status(404).json({ error: 'Role not found' });
    const rows = await db('role_permissions as rp')
      .join('permissions as p','p.id','rp.permission_id')
      .where('rp.role_id', role.id)
      .select('p.code');
    res.json(rows.map(r => r.code));
  } catch (e) { next(e); }
});

// replace a role's permissions with provided list
router.put('/roles/:code/permissions',
  requirePerm('RBAC_MANAGE'),
  audit('SET_PERMS','role'),
  async (req, res, next) => {
    try {
      const { z } = require('zod');
      const { perms } = z.object({ perms: z.array(z.string()).default([]) }).parse(req.body);
      const role = await db('roles').where({ code: req.params.code }).first();
      if (!role) return res.status(404).json({ error: 'Role not found' });

      const permIds = perms.length
        ? await db('permissions').whereIn('code', perms).pluck('id')
        : [];

      await db.transaction(async trx => {
        await trx('role_permissions').where({ role_id: role.id }).del();
        for (const pid of permIds) {
          await trx('role_permissions').insert({ role_id: role.id, permission_id: pid });
        }
      });

      res.locals.entityId = role.id;
      res.json({ ok: true });
    } catch (e) { next(e); }
  }
);


module.exports = router;
