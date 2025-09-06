const router = require('express').Router();
const db = require('../db');
const { z } = require('zod');
const { requirePerm } = require('../middleware/permissions');
const { audit } = require('../middleware/audit'); // ✅ already imported


function toObject(jsonish) {
  if (jsonish == null) return {};
  if (typeof jsonish === 'object') return jsonish;        // already parsed
  const s = String(jsonish).trim();
  if (!s) return {};
  try { return JSON.parse(s); } catch { return {}; }       // text column case
}


// add below your existing requires (db, z, requirePerm, audit)
async function getDealerFieldDefs() {
  return db('custom_fields')
    .where({ entity: 'dealer', is_active: 1 })
    .orderBy('order', 'asc');
}

const parseOptions = (opts) => {
  if (!opts) return [];
  if (Array.isArray(opts)) return opts;
  if (typeof opts === 'string') {
    try { const p = JSON.parse(opts); return Array.isArray(p) ? p : opts.split(',').map(s=>s.trim()).filter(Boolean); }
    catch { return opts.split(',').map(s=>s.trim()).filter(Boolean); }
  }
  return [];
};

const statusSchema = z.object({
  action: z.enum(['approve', 'reject']),
  reason: z.string().max(500).optional().transform(v => (v?.trim() ? v.trim() : null)),
});


const mkDealerCode = (id) => `DLR${String(id + 100).padStart(5, '0')}`;

function buildZodFromDefs(defs) {
  const shape = {};
  for (const d of defs) {
    let s;
    switch (d.input_type) {
      case 'number':   s = z.number().finite(); break;
      case 'checkbox': s = z.boolean(); break;
      case 'date':     s = z.string().min(1); break; // keep string/ISO
      case 'select': {
        const opts = parseOptions(d.options);
        s = opts.length ? z.enum(opts.map(String)) : z.string();
        break;
      }
      default:         s = z.string().max(191);
    }
    if (!d.required) s = s.optional();
    shape[d.code] = s;
  }
  return z.object(shape);
}


/** Zod validators */
const baseDealerSchema = z.object({
  dealer_name: z.string().min(1, 'Name is required').max(191),
  name_as_per_invoice: z.string().max(191).optional().or(z.literal('')).transform(v => v || null),
  dealer_phone: z.string().max(32).optional().or(z.literal('')).transform(v => v || null),
  dealer_address: z.string().max(191).optional().or(z.literal('')).transform(v => v || null),
  email: z.string().email('Invalid email').max(191).optional().or(z.literal('')).transform(v => v || null),
  gst_no: z.string().max(32).optional().or(z.literal('')).transform(v => v || null),
  dealer_pan_card: z.string().max(32).optional().or(z.literal('')).transform(v => v || null),
  authorised_dealer_name: z.string().max(191).optional().or(z.literal('')).transform(v => v || null),
  is_active: z.boolean().optional().default(true),
})

const bulkSchema = z.array(baseDealerSchema).min(1, 'No rows').max(1000);

/** GET /dealers */
router.get('/', requirePerm('DEALERS_READ'), audit('LIST','dealer'), async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || '20', 10), 100);
    const offset = Math.max(parseInt(req.query.offset || '0', 10), 0);
    const search = (req.query.search || '').trim();

    const q = db('dealers').select('*').orderBy('id', 'desc').limit(limit).offset(offset);
    if (search) {
  q.where(builder => {
    builder
      .where('dealer_name', 'like', `%${search}%`)
      .orWhere('name_as_per_invoice', 'like', `%${search}%`)
      .orWhere('email', 'like', `%${search}%`)
      .orWhere('dealer_phone', 'like', `%${search}%`)
      .orWhere('gst_no', 'like', `%${search}%`)
      .orWhere('dealer_pan_card', 'like', `%${search}%`)
      .orWhere('dealer_id', 'like', `%${search}%`);
  });
}

    const [rows, [{ count }]] = await Promise.all([
      q,
      db('dealers')
        .modify(b => {
          if (search) {
            b.where(qb => {
              qb.where('dealer_name', 'like', `%${search}%`)
      .orWhere('name_as_per_invoice', 'like', `%${search}%`)
      .orWhere('email', 'like', `%${search}%`)
      .orWhere('dealer_phone', 'like', `%${search}%`)
      .orWhere('gst_no', 'like', `%${search}%`)
      .orWhere('dealer_pan_card', 'like', `%${search}%`)
      .orWhere('dealer_id', 'like', `%${search}%`);
            });
          }
        })
        .count({ count: '*' })
    ]);

    res.json({ rows, total: Number(count), limit, offset });
  } catch (e) { next(e); }
});

// POST /dealers/bulk
router.post('/bulk', requirePerm('DEALERS_WRITE'), audit('BULK_CREATE','dealer'), async (req, res, next) => {
  try {
    const rawItems = Array.isArray(req.body?.items) ? req.body.items : [];
    if (!rawItems.length) return res.json({ inserted: 0, failed: 0, errors: [] });

    const defs = await getDealerFieldDefs();
    const CustomSchema = buildZodFromDefs(defs).partial();

    const normEmail = (v) => (v ? String(v).toLowerCase().trim() : null);
    const toNull = (v) => (v === '' || v === undefined ? null : v);
    const toBool = (v) => {
      if (v === true || v === false) return v;
      const s = String(v ?? '').trim().toLowerCase();
      return !s ? true : ['1','true','yes','y','active'].includes(s);
    };

    // pre-check duplicates in DB + within file
    const emails = rawItems.map((r) => normEmail(r.email)).filter(Boolean);
    const existing = emails.length ? await db('dealers').whereIn('email', emails).pluck('email') : [];
    const existingSet = new Set((existing || []).map((e) => e.toLowerCase()));
    const seenInFile = new Set();

    let inserted = 0;
    const errors = [];

    await db.transaction(async (trx) => {
      for (let i = 0; i < rawItems.length; i++) {
        try {
          const r = rawItems[i];
          const core = baseDealerSchema.partial().parse({
            dealer_name: toNull(r.dealer_name),
            name_as_per_invoice: toNull(r.name_as_per_invoice),
            dealer_phone: toNull(r.dealer_phone),
            dealer_address: toNull(r.dealer_address),
            email: normEmail(r.email),
            gst_no: toNull(r.gst_no),
            dealer_pan_card: toNull(r.dealer_pan_card),
            authorised_dealer_name: toNull(r.authorised_dealer_name),
            is_active: toBool(r.is_active),
          });
          if (!core.dealer_name) throw new Error('dealer_name is required');

          if (core.email) {
            if (existingSet.has(core.email)) throw new Error('duplicate_email');
            if (seenInFile.has(core.email)) throw new Error('duplicate_email_in_upload');
            seenInFile.add(core.email);
          }

          const customOk = CustomSchema.parse(r.custom || {});

          const [id] = await trx('dealers').insert({
            ...core,
            custom_data: JSON.stringify(customOk),
          });

          const dealer_id = mkDealerCode(id);
          await trx('dealers').where({ id }).update({ dealer_id });

          inserted++;
        } catch (e) {
          errors.push({ index: i, error: e?.message || 'insert_error' });
        }
      }
    });

    res.json({ inserted, failed: errors.length, errors });
  } catch (e) {
    next(e);
  }
});

/** PATCH /dealers/:id/status  { action: 'approve'|'reject', reason? }
 * Needs DEALERS_REVIEW
 * Only allowed from PENDING -> APPROVED/REJECTED
 */
router.patch('/:id/status', requirePerm('DEALERS_REVIEW'), audit('DEALER_STATUS','dealer'), async (req, res, next) => {
  try {
    const { action, reason } = statusSchema.parse(req.body);
    const id = Number(req.params.id);

    const newStatus = action === 'approve' ? 'APPROVED' : 'REJECTED';

    // optimistic concurrency: only update if currently PENDING
    const affected = await db('dealers')
      .where({ id, status: 'PENDING' })
      .update({
        status: newStatus,
        status_reason: reason,
        status_by: req.user?.id || null,
        status_at: db.fn.now(),
      });

    if (!affected) {
      // either dealer not found or not in PENDING anymore
      const row = await db('dealers').where({ id }).first();
      if (!row) return res.status(404).json({ error: 'Dealer not found' });
      return res.status(409).json({ error: `Cannot change status from ${row.status}` });
    }

    res.json({ ok: true, id, status: newStatus, reason });
  } catch (e) { next(e); }
});


/** GET /dealers/:id */
router.get('/:id', requirePerm('DEALERS_READ'), audit('READ','dealer'), async (req, res, next) => {
  try {
    const row = await db('dealers').where({ id: req.params.id }).first();
    if (!row) return res.status(404).json({ error: 'Dealer not found' });
    // row.custom = row.custom_data ? JSON.parse(row.custom_data) : {};
    row.custom = toObject(row.custom_data);

    res.json(row);
  } catch (e) { next(e); }
});


/** POST /dealers  — tag as CREATE + set entityId */
// router.post(
//   '/',
//   requirePerm('DEALERS_WRITE'),
//   audit('CREATE', 'dealer'),                 // ✅ tag the action/entity
//   async (req, res, next) => {
//     try {
//       const data = baseDealerSchema.parse(req.body);
//       const [id] = await db('dealers').insert(data);
//       res.locals.entityId = id;             // ✅ so the audit row knows which record
//       res.status(201).json({ id });
//     } catch (e) { next(e); }
//   }
// );

router.post('/', requirePerm('DEALERS_WRITE'), audit('CREATE','dealer'), async (req, res, next) => {
  try {
    const defs = await getDealerFieldDefs();
    const CustomSchema = buildZodFromDefs(defs).partial();

    const { custom = {}, ...coreRaw } = req.body;
    const core = baseDealerSchema.parse(coreRaw);
    const normalized = { ...core, email: core.email ? core.email.toLowerCase().trim() : null };
    const customOk = CustomSchema.parse(custom);

    await db.transaction(async (trx) => {
      const [id] = await trx('dealers').insert({
        ...normalized,
        custom_data: JSON.stringify(customOk),
      });

      const dealer_id = mkDealerCode(id);
      await trx('dealers').where({ id }).update({ dealer_id });

      res.locals.entityId = id;
      res.status(201).json({ id, dealer_id });
    });
  } catch (err) {
    if (err?.code === 'ER_DUP_ENTRY' && String(err.message).includes('uq_dealers_email')) {
      return res.status(409).json({ error: 'A dealer with this email already exists.' });
    }
    next(err);
  }
});


/** PUT /dealers/:id — tag as UPDATE + set entityId */
// router.put(
//   '/:id',
//   requirePerm('DEALERS_WRITE'),
//   audit('UPDATE', 'dealer'),                 // ✅ tag the action/entity
//   async (req, res, next) => {
//     try {
//       const data = baseDealerSchema.partial().parse(req.body);
//       const updated = await db('dealers').where({ id: req.params.id }).update(data);
//       if (!updated) return res.status(404).json({ error: 'Dealer not found' });
//       res.locals.entityId = req.params.id;  // ✅ include the primary key updated
//       res.json({ ok: true });
//     } catch (e) { next(e); }
//   }
// );

router.put('/:id', requirePerm('DEALERS_WRITE'), audit('UPDATE','dealer'), async (req, res, next) => {
  try {
    const defs = await getDealerFieldDefs();
    const CustomSchema = buildZodFromDefs(defs).partial();

    const { custom = {}, ...coreRaw } = req.body;
    const core = baseDealerSchema.partial().parse(coreRaw);
    const customOk = CustomSchema.parse(custom);

    const patch = { ...core };
    if (patch.email) patch.email = patch.email.toLowerCase().trim();
    if (Object.keys(customOk).length) patch.custom_data = JSON.stringify(customOk);

    const updated = await db('dealers').where({ id: req.params.id }).update(patch);
    if (!updated) return res.status(404).json({ error: 'Dealer not found' });

    res.locals.entityId = Number(req.params.id);
    res.json({ ok: true });
  } catch (e) { next(e); }
});



// (Optional) DELETE could be tagged as DELETE+dealer when you enable it
module.exports = router;
