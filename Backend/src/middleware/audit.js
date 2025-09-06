const db = require('../db');

// redact common sensitive keys anywhere in the object
const SENSITIVE = ['password','otp','code','token','authorization'];
function sanitize(obj) {
  if (!obj || typeof obj !== 'object') return undefined;
  // deep clone and redact
  const clone = JSON.parse(JSON.stringify(obj));
  (function walk(o){
    Object.keys(o).forEach(k => {
      const v = o[k];
      if (SENSITIVE.includes(k.toLowerCase())) o[k] = '***';
      else if (v && typeof v === 'object') walk(v);
    });
  })(clone);
  return clone;
}

// Route helper: annotate an action/entity (and optionally attach entityId later)
const audit = (action, entity) => (req, res, next) => {
  res.locals.audit_action = action;   // e.g. 'CREATE','LIST','READ','UPDATE','BULK_CREATE'
  res.locals.audit_entity = entity;   // e.g. 'dealer'
  next();
};

// Main writer: only logs when useful
const writeAudit = (req, res, next) => {
  const start = process.hrtime.bigint();

  res.on('finish', async () => {
    try {
      const duration_ms = Number((process.hrtime.bigint() - start) / 1000000n);

      // Skip super-noisy GET 200/304 unless explicitly annotated
      const isGet = req.method === 'GET';
      const isNoisyGet = isGet && res.statusCode < 400 && !res.locals.audit_action;
      const is304 = res.statusCode === 304;
      if (isNoisyGet || is304) return;

      const user_id = req.user?.id || null;
      const action = res.locals.audit_action || (isGet ? 'GET' : req.method);
      const entity = res.locals.audit_entity || null;

      const details = {
        query: req.query,
        statusCode: res.statusCode,
      };
      if (!isGet || res.statusCode >= 400) {
        details.body = sanitize(req.body);
      }
      if (res.locals.entityId != null) details.entityId = res.locals.entityId;

      await db('audit_logs').insert({
        user_id,
        action,
        entity,
        entity_id: res.locals.entityId || null,
        method: req.method,
        path: req.originalUrl, // FULL path with route base + query
        status_code: res.statusCode,
        details: JSON.stringify(details),
        ip: req.headers['x-forwarded-for'] || req.ip,
        user_agent: req.headers['user-agent'] || '',
        duration_ms,
      });
    } catch (_) {
      // never crash on audit failures
    }
  });

  next();
};

module.exports = { writeAudit, audit };
