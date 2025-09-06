const router = require('express').Router();
const db = require('../db');
const { z } = require('zod');
const { requirePerm } = require('../middleware/permissions');
const { audit } = require('../middleware/audit');

const upsertSchema = z.object({
  entity: z.string().min(1),
  code: z.string().min(1).max(64).regex(/^[a-z0-9_]+$/i, 'Use letters/numbers/_'),
  label: z.string().min(1).max(128),
  input_type: z.enum(['text','number','date','select','checkbox']),
  required: z.boolean().optional().default(false),
  options: z.any().optional(), // array for selects
  order: z.number().int().optional().default(0),
  is_active: z.boolean().optional().default(true),
});

/** GET /admin/fields?entity=dealer */
router.get('/', requirePerm('FIELDS_MANAGE'), async (req, res, next) => {
  try {
    const { entity } = z.object({ entity: z.string() }).parse(req.query);
    const rows = await db('custom_fields')
      .where({ entity })
      .orderBy('order', 'asc')
      .select('*');
    res.json(rows);
  } catch (e) { next(e); }
});

/** POST /admin/fields */
router.post('/', requirePerm('FIELDS_MANAGE'), audit('FIELD_CREATE','custom_field'), async (req, res, next) => {
  try {
    const data = upsertSchema.parse(req.body);
    const [id] = await db('custom_fields').insert({
      ...data,
      options: data.options ? JSON.stringify(data.options) : null
    });
    res.locals.entityId = id;
    res.status(201).json({ id });
  } catch (e) { next(e); }
});

/** PUT /admin/fields/:id */
router.put('/:id', requirePerm('FIELDS_MANAGE'), audit('FIELD_UPDATE','custom_field'), async (req, res, next) => {
  try {
    const data = upsertSchema.partial().parse(req.body);
    const updated = await db('custom_fields')
      .where({ id: req.params.id })
      .update({
        ...data,
        options: data.options === undefined ? undefined : JSON.stringify(data.options)
      });
    if (!updated) return res.status(404).json({ error: 'Not found' });
    res.locals.entityId = req.params.id;
    res.json({ ok: true });
  } catch (e) { next(e); }
});

/** DELETE /admin/fields/:id -> soft deactivate */
router.delete('/:id', requirePerm('FIELDS_MANAGE'), audit('FIELD_DEACTIVATE','custom_field'), async (req, res, next) => {
  try {
    await db('custom_fields').where({ id: req.params.id }).update({ is_active: 0 });
    res.locals.entityId = req.params.id;
    res.json({ ok: true });
  } catch (e) { next(e); }
});

module.exports = router;
