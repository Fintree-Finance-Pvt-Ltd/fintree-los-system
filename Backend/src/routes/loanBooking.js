// src/routes/loanBooking.js
const express = require('express');
const db = require('../db');
const { z } = require('zod');
const { nextCode } = require('../lib/seq');
const { audit } = require('../middleware/audit');
const modules = require('../lib/loanModules');

const r = express.Router();

// Helpers
const normalizeBody = (v) => {
  const b = { ...v };
  if (typeof b.custom === 'string') {
    try { b.custom = JSON.parse(b.custom); } catch { b.custom = {}; }
  }
  return b;
};
const hasPerm = (req, perm) =>
  Boolean(
    req.user?.permissions?.includes?.(perm) ||
    req.user?.perms?.includes?.(perm) ||
    req.user?.perms?.has?.(perm)
  );

const getModuleCfg = (key) => modules[String(key || '').trim()];

const zPayload = z.object({
  module: z.string().min(3),
}).passthrough();

r.post('/',
  audit('CREATE', 'loan_booking_dynamic'),
  async (req, res, next) => {
    try {
      const base = zPayload.safeParse(req.body);
      if (!base.success) return res.status(400).json({ error: 'module is required' });

      const cfg = getModuleCfg(base.data.module);
      if (!cfg) return res.status(400).json({ error: `Unknown module: ${base.data.module}` });

      if (cfg.perms?.WRITE && !hasPerm(req, cfg.perms.WRITE)) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const body = normalizeBody(req.body);
      const parsed = cfg.createSchema.safeParse(body);
      if (!parsed.success) {
        return res.status(400).json({
          error: 'Validation failed',
          details: parsed.error.issues,
        });
      }

      // Build row
      const v = parsed.data;
      const code = await nextCode(cfg.entityName, cfg.codePrefix);
      const baseCols = cfg.mapBodyToRow(v);
      const row = { [cfg.codeField]: code, ...baseCols };

      if (cfg.defaultStatus) row.status = cfg.defaultStatus;
      if (cfg.jsonColumn) {
        row[cfg.jsonColumn] = v.custom && Object.keys(v.custom).length
          ? JSON.stringify(v.custom)
          : null;
      }

      const [id] = await db(cfg.table).insert(row);
      res.status(201).json({ id, [cfg.codeField]: code });
    } catch (e) { next(e); }
  }
);

r.post('/bulk',
  audit('BULK_CREATE', 'loan_booking_dynamic'),
  async (req, res, next) => {
    try {
      const base = zPayload.safeParse(req.body);
      if (!base.success) return res.status(400).json({ error: 'module is required' });

      const cfg = getModuleCfg(base.data.module);
      if (!cfg) return res.status(400).json({ error: `Unknown module: ${base.data.module}` });

      if (cfg.perms?.WRITE && !hasPerm(req, cfg.perms.WRITE)) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const itemsRaw = Array.isArray(req.body?.items) ? req.body.items : [];
      if (!itemsRaw.length) return res.json({ inserted: 0, failed: 0, errors: [] });

      const errors = [];
      const toInsert = [];

      for (let i = 0; i < itemsRaw.length; i++) {
        try {
          const body = normalizeBody(itemsRaw[i]);
          const parsed = cfg.bulkItemSchema.safeParse(body);
          if (!parsed.success) {
            errors.push({ index: i, error: 'validation_error', details: parsed.error.issues });
            continue;
          }

          const v = parsed.data;
          const code = await nextCode(cfg.entityName, cfg.codePrefix);
          const baseCols = cfg.mapBodyToRow(v);
          if (!Object.values(baseCols).some(val => val !== null && val !== undefined && String(val).trim() !== '')) {
            throw new Error('empty_row');
          }

          const row = { [cfg.codeField]: code, ...baseCols };
          if (cfg.defaultStatus) row.status = cfg.defaultStatus;
          if (cfg.jsonColumn) {
            row[cfg.jsonColumn] = v.custom && Object.keys(v.custom).length
              ? JSON.stringify(v.custom)
              : null;
          }

          toInsert.push(row);
        } catch (e) {
          errors.push({ index: i, error: e.message || 'validation_error' });
        }
      }

      let inserted = 0;
      if (toInsert.length) {
        try {
          await db.transaction(async trx => { await trx(cfg.table).insert(toInsert); inserted = toInsert.length; });
        } catch {
          await db.transaction(async trx => {
            for (let i = 0; i < toInsert.length; i++) {
              try { await trx(cfg.table).insert(toInsert[i]); inserted++; }
              catch (e) { errors.push({ index: i, error: e.code || e.message }); }
            }
          });
        }
      }

      res.json({ inserted, failed: errors.length, errors });
    } catch (e) { next(e); }
  }
);

module.exports = r;
