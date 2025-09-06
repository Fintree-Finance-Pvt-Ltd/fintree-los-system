const router = require('express').Router();
const db = require('../db');
const { z } = require('zod');
const { requirePerm } = require('../middleware/permissions');
const { audit } = require('../middleware/audit');

// READ for any authenticated user (so forms/lists can fetch defs)
router.get('/', async (req, res, next) => {
  try {
    const entity = String(req.query.entity || '').trim();
    if (!entity) return res.json([]);
    const rows = await db('field_defs')
      .where({ entity })
      .orderBy('sort_order', 'asc')
      .orderBy('id', 'asc');
    res.json(rows);
  } catch (e) { next(e); }
});

// Admin: create/update
const FieldSchema = z.object({
  entity: z.enum(['dealer','financial_institute','landlord']),
  code: z.string().min(1).max(64),
  label: z.string().min(1).max(191),
  input_type: z.enum(['text','number','date','checkbox','select']),
  required: z.boolean().default(false),
  is_active: z.boolean().default(true),
  options: z.any().optional(), // array or comma string for select
  sort_order: z.number().int().min(0).default(0),
});

// CREATE
router.post('/admin',
  requirePerm('FIELDS_MANAGE'),
  audit('FIELDS_CREATE','field_def'),
  async (req,res,next)=>{
    try {
      const body = FieldSchema.parse(req.body);
      const row = {
        ...body,
        options: body.options ? (Array.isArray(body.options) ? JSON.stringify(body.options) : String(body.options)) : null
      };
      const [id] = await db('field_defs').insert(row);
      res.status(201).json({ id });
    } catch (e) { next(e); }
});

// UPDATE
router.put('/admin/:id',
  requirePerm('FIELDS_MANAGE'),
  audit('FIELDS_UPDATE','field_def'),
  async (req,res,next)=>{
    try {
      const body = FieldSchema.partial().parse(req.body);
      const row = {
        ...body,
        options: body.options === undefined ? undefined :
          (Array.isArray(body.options) ? JSON.stringify(body.options) : String(body.options))
      };
      const ok = await db('field_defs').where({ id: req.params.id }).update(row);
      if (!ok) return res.status(404).json({ error:'Not found' });
      res.json({ ok:true });
    } catch (e) { next(e); }
});

module.exports = router;
