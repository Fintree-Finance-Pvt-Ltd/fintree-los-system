const express = require('express');
const db = require('../db');
const { z } = require('zod');
const { audit } = require('../middleware/audit');
const modules = require('../lib/loanModules');

const r = express.Router();

const zQuery = z.object({
  module: z.string().min(3),
  status: z.string().optional(),
  search: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

function hasPerm(req, perm) {
  const u = req.user || {};
  if (u.role === 'ADMIN' || u.role === 'SUPER_ADMIN') return true;

  const arrs = []
    .concat(Array.isArray(u.permissions) ? u.permissions : [])
    .concat(Array.isArray(u.perms) ? u.perms : []);
  if (arrs.some(p => p === perm || (p && (p.code === perm || p.name === perm)))) return true;

  if (u.permissions instanceof Set && u.permissions.has(perm)) return true;
  if (u.perms instanceof Set && u.perms.has(perm)) return true;
  if (u.permissions && typeof u.permissions === 'object' && u.permissions[perm]) return true;
  if (u.perms && typeof u.perms === 'object' && u.perms[perm]) return true;

  return false;
}

function getCfg(key) {
  return modules[String(key || '').trim()];
}

// Map different table columns → unified "amount" for the grid
function amountColumnFor(entityName) {
  switch (entityName) {
    case 'product_ev': return 'loan_amount';   // CHANGED
    case 'lender_ev':  return 'loan_amount';
    default:           return 'amount';
  }
}

function nameColumnFor(entityName) {
  switch (entityName) {
    case 'product_ev': return 'customer_name'; // NEW
    default:           return 'applicant_name';
  }
}

function phoneColumnFor(entityName) {
  switch (entityName) {
    case 'product_ev': return 'mobile_number'; // NEW
    default:           return 'phone';
  }
}

r.get('/list',
  audit('LIST', 'loan_booking_dynamic'),
  async (req, res, next) => {
    try {
      const qres = zQuery.safeParse(req.query);
      if (!qres.success) return res.status(400).json({ error: 'Invalid query', details: qres.error.issues });
      const { module: moduleKey, status, search, limit, offset } = qres.data;

      const cfg = getCfg(moduleKey);
      if (!cfg) return res.status(400).json({ error: `Unknown module: ${moduleKey}` });

      if (cfg.perms?.READ && !hasPerm(req, cfg.perms.READ)) {
        return res.status(403).json({ error: 'Forbidden', missingPermission: cfg.perms.READ });
      }

      const nameCol   = nameColumnFor(cfg.entityName);
const phoneCol  = phoneColumnFor(cfg.entityName);
const amountCol = amountColumnFor(cfg.entityName);
      const selectCols = [
  `${cfg.table}.id as id`,
  `${cfg.table}.${nameCol}  as applicant_name`,  // alias for grid
  `${cfg.table}.${phoneCol} as phone`,           // alias for grid
  db.raw(`CAST(${cfg.table}.${amountCol} AS DECIMAL(18,2)) as amount`),
  `${cfg.table}.status as status`,
  `${cfg.table}.created_at as created_at`,
];

      const base = db(cfg.table).select(selectCols);

      if (status && status.trim()) base.where(`${cfg.table}.status`, status.trim());

      const s = String(search || '').trim();
      if (s && cfg.searchColumns?.length) {
        base.where(qb => {
          cfg.searchColumns.forEach((col, i) => {
            const like = `%${s}%`;
            if (i === 0) qb.where(`${cfg.table}.${col}`, 'like', like);
            else qb.orWhere(`${cfg.table}.${col}`, 'like', like);
          });
        });
      }

      const countQ = db(cfg.table)
        .modify(qb => {
          if (status && status.trim()) qb.where('status', status.trim());
          if (s && cfg.searchColumns?.length) {
            qb.where(qb2 => {
              cfg.searchColumns.forEach((col, i) => {
                const like = `%${s}%`;
                if (i === 0) qb2.where(col, 'like', like);
                else qb2.orWhere(col, 'like', like);
              });
            });
          }
        })
        .count({ count: '*' })
        .first();

      base.orderBy(`${cfg.table}.id`, 'desc').limit(limit).offset(offset);

      const [rows, totalRow] = await Promise.all([base, countQ]);
      const total = Number(totalRow?.count || 0);

      res.json({ rows, total, limit, offset });
    } catch (e) { next(e); }
  }
);

module.exports = r;
