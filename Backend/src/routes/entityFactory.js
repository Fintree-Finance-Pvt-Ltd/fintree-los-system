const express = require('express');
const { z } = require('zod');
const db = require('../db');
const { requirePerm } = require('../middleware/permissions');
const { audit } = require('../middleware/audit');
const { nextCode } = require('../lib/seq');

// helpers
const toInt = (v, def=0) => Number.isFinite(+v) ? Math.max(+v, 0) : def;
const jsonAny = z.any();

// ✅ helper: ensure custom is an object (parse when a JSON string is sent)
function normalizeBodyForZod(body) {
  const v = { ...body };
  if (typeof v.custom === 'string') {
    try { v.custom = JSON.parse(v.custom); }
    catch { v.custom = {}; }
  }
  return v;
}

/**
 * makeEntityRouter({
 *   entityName: 'dealer',
 *   table: 'dealers',
 *   codeField: 'dealer_id',
 *   codePrefix: 'DLR',
 *   jsonColumn: 'custom_data',           // null if table has no JSON column
 *   defaultStatus: 'PENDING',            // null/undefined to skip status
 *   searchColumns: ['dealer_name','email','dealer_phone'],
 *   perms: { READ:'DEALERS_READ', WRITE:'DEALERS_WRITE', REVIEW:'DEALERS_REVIEW' },
 *   createSchema: z.object({...}),       // zod schema for CREATE (body)
 *   updateSchema: z.object({...}).partial(),
 *   bulkItemSchema: z.object({...}).partial(), // for /bulk
 *   mapBodyToRow: (body) => ({ ...dbCols })    // body -> exact DB column names for this table
 * })
 */
function makeEntityRouter(cfg) {
  const r = express.Router();
  const {
    entityName, table, codeField, codePrefix, jsonColumn,
    defaultStatus, searchColumns = [],
    perms, createSchema, updateSchema, bulkItemSchema,
    mapBodyToRow,
  } = cfg;

  // ---- LIST: GET /?search=&limit=&offset= ----
  r.get('/',
    requirePerm(perms.READ),
    audit('LIST', entityName),
    async (req, res, next) => {
      try {
        const limit = Math.min(toInt(req.query.limit, 20), 100);
        const offset = toInt(req.query.offset, 0);
        const search = String(req.query.search || '').trim();

        const q = db(table).select('*').orderBy('id', 'desc').limit(limit).offset(offset);
        if (search && searchColumns.length) {
          q.where(b => {
            searchColumns.forEach((col, idx) => {
              const like = `%${search}%`;
              if (idx === 0) b.where(col, 'like', like);
              else b.orWhere(col, 'like', like);
            });
          });
        }

        const [rows, [{ count }]] = await Promise.all([
          q,
          db(table)
            .modify(b => {
              if (search && searchColumns.length) {
                b.where(qb => {
                  searchColumns.forEach((col, idx) => {
                    const like = `%${search}%`;
                    if (idx === 0) qb.where(col, 'like', like);
                    else qb.orWhere(col, 'like', like);
                  });
                });
              }
            })
            .count({ count: '*' })
        ]);

        res.json({ rows, total: Number(count), limit, offset });
      } catch (e) { next(e); }
    }
  );

  // ---- READ ONE: GET /:id ----
  r.get('/:id',
    requirePerm(perms.READ),
    audit('READ', entityName),
    async (req, res, next) => {
      try {
        const row = await db(table).where({ id: req.params.id }).first();
        if (!row) return res.status(404).json({ error: `${entityName} not found` });
        res.json(row);
      } catch (e) { next(e); }
    }
  );

  // ---- CREATE: POST / ----
  r.post('/',
    requirePerm(perms.WRITE),
    audit('CREATE', entityName),
    async (req, res, next) => {
      try {
        // validate body
        const raw = normalizeBodyForZod(req.body);
      const v = createSchema.parse(raw);

        // generate human code (e.g., DLR00101)
        const code = await nextCode(entityName, codePrefix);

        // map body -> db columns
        const baseCols = mapBodyToRow(v);

        // add code field, optional status, optional JSON column
        const row = {
          [codeField]: code,
          ...baseCols,
        };

        if (defaultStatus) row.status = defaultStatus;

        if (jsonColumn && v.custom && typeof v.custom === 'object') {
          row[jsonColumn] = Object.keys(v.custom).length ? JSON.stringify(v.custom) : null;
        }

        const [id] = await db(table).insert(row);
        res.status(201).json({ id, [codeField]: code });
      } catch (e) { next(e); }
    }
  );

  // ---- UPDATE: PUT /:id ----
  r.put('/:id',
    requirePerm(perms.WRITE),
    audit('UPDATE', entityName),
    async (req, res, next) => {
      try {
        const raw = normalizeBodyForZod(req.body);
      const v = updateSchema.parse(raw);
        const patch = mapBodyToRow(v);

        if (jsonColumn && v.custom !== undefined) {
          patch[jsonColumn] = (v.custom && Object.keys(v.custom).length)
            ? JSON.stringify(v.custom)
            : null;
        }

        const ok = await db(table).where({ id: req.params.id }).update(patch);
        if (!ok) return res.status(404).json({ error: `${entityName} not found` });
        res.json({ ok: true });
      } catch (e) { next(e); }
    }
  );

  // ---- BULK: POST /bulk ----
  r.post('/bulk',
    requirePerm(perms.WRITE),
    audit('BULK_CREATE', entityName),
    async (req, res, next) => {
      try {
        const rawItems = Array.isArray(req.body?.items) ? req.body.items : [];
        if (!rawItems.length) return res.json({ inserted: 0, failed: 0, errors: [] });

        const errors = [];
        const toInsert = [];

        for (let i = 0; i < rawItems.length; i++) {
          try {
            const v = bulkItemSchema.parse(rawItems[i]);     // forgiving schema
            const code = await nextCode(entityName, codePrefix);
            const baseCols = mapBodyToRow(v);

            const row = { [codeField]: code, ...baseCols };
            if (defaultStatus) row.status = defaultStatus;
            if (jsonColumn && v.custom && typeof v.custom === 'object') {
              row[jsonColumn] = Object.keys(v.custom).length ? JSON.stringify(v.custom) : null;
            }
            // require a minimal field (example: at least one name-like field)
            if (!Object.values(baseCols).some(Boolean)) throw new Error('empty_row');

            toInsert.push(row);
          } catch (e) {
            errors.push({ index: i, error: e?.message || 'validation_error' });
          }
        }

        let inserted = 0;
        if (toInsert.length) {
          try {
            await db.transaction(async trx => { await trx(table).insert(toInsert); inserted = toInsert.length; });
          } catch {
            await db.transaction(async trx => {
              for (let i = 0; i < toInsert.length; i++) {
                try { await trx(table).insert(toInsert[i]); inserted++; }
                catch (e) { errors.push({ index: i, error: e.code || e.message }); }
              }
            });
          }
        }

        res.json({ inserted, failed: errors.length, errors });
      } catch (e) { next(e); }
    }
  );

  // ---- REVIEW: PATCH /:id/status { action: 'approve'|'reject', reason? } ----
  r.patch('/:id/status',
    requirePerm(perms.REVIEW),
    audit('STATUS', entityName),
    async (req, res, next) => {
      try {
        if (!defaultStatus) return res.status(400).json({ error: 'Status not enabled for this entity' });
        const action = String(req.body?.action || '').toLowerCase();
        const reason = req.body?.reason ? String(req.body.reason).slice(0, 1000) : null;
        const value = action === 'approve' ? 'APPROVED' : action === 'reject' ? 'REJECTED' : null;
        if (!value) return res.status(400).json({ error: 'Invalid action' });

        const patch = { status: value };
        if ('review_reason' in (await db(table).columnInfo())) patch.review_reason = reason;

        const ok = await db(table).where({ id: req.params.id }).update(patch);
        if (!ok) return res.status(404).json({ error: `${entityName} not found` });
        res.json({ ok: true });
      } catch (e) { next(e); }
    }
  );

  return r;
}

module.exports = makeEntityRouter;
