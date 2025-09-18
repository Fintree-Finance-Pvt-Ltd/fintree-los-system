// // src/routes/pan.js
// const router = require('express').Router();
// const axios = require('axios');
// const { z } = require('zod');
// const db = require('../db');
// const rateLimit = require('express-rate-limit');
// const { auth } = require('../middleware/jwt');
// const { attachPermissions } = require('../middleware/permissions');
// const { audit } = require('../middleware/audit');
// const { randomUUID } = require('crypto');

// // PAN format (case-insensitive): 5 letters + 4 digits + 1 letter
// const PAN = z.string()
//   .regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/i, 'Invalid PAN');

// // rate limit provider calls
// const limiter = rateLimit({ windowMs: 60 * 1000, max: 30, standardHeaders: true });

// /**
//  * GET /pan/verify?pan=ABCDE1234F&name=optional
//  * Uses same credentials as GST unless PAN_* vars are set.
//  */
// router.get(
//   '/verify',
//   auth,
//   attachPermissions,
//   limiter,
//   audit('PAN_VERIFY', 'pan'),
//   async (req, res, next) => {
//     try {
//       const pan = PAN.parse(String(req.query.pan || '').trim().toUpperCase());
//       const holderName = String(req.query.name || '').trim() || undefined;

//       // 1) serve from cache if younger than 24h
//       const cached = await db('pan_cache').where({ pan }).first();
//       if (cached) {
//         const ageHrs = (Date.now() - new Date(cached.fetched_at).getTime()) / 36e5;
//         if (ageHrs < 24) {
//           const payload = safeJSON(cached.payload);
//           return res.json({ source: 'cache', pan, ...normalizeZoopPan(payload) });
//         }
//       }

//       // 2) call provider (Zoop Pan Lite)
//       const url   = process.env.PAN_API_URL; // <-- only URL changes
//       const apiKey = process.env.PAN_API_KEY || process.env.GST_API_KEY; // reuse if not set
//       const appId  = process.env.PAN_APP_ID  || process.env.GST_APP_ID;  // reuse if not set

//       if (!url || !apiKey || !appId) {
//         return res.status(500).json({
//           error: 'PAN provider not configured (PAN_API_URL + PAN_API_KEY/PAN_APP_ID or GST_API_KEY/GST_APP_ID)',
//         });
//       }

//       const mode        = process.env.PAN_MODE || 'sync';
//       const consent     = process.env.PAN_CONSENT || 'Y';
//       const consentText = process.env.PAN_CONSENT_TEXT ||
//         'I hereby declare my consent agreement for fetching my information via PAN API';
//       const taskId = randomUUID();

//       const body = {
//         mode,
//         data: {
//           customer_pan_number: pan,
//           pan_holder_name: holderName, // optional but supported by provider
//           consent,
//           consent_text: consentText,
//         },
//         task_id: taskId,
//       };

//       const resp = await axios.post(url, body, {
//         timeout: 20000,
//         headers: {
//           'api-key': apiKey,
//           'app-id': appId,
//           'Content-Type': 'application/json',
//         },
//         validateStatus: () => true, // bubble up provider error payloads
//       });

//       if (resp.status < 200 || resp.status >= 300 || resp.data?.success === false) {
//         return res.status(resp.status || 400).json({
//           error: 'PAN provider error',
//           info: resp.data,
//         });
//       }

//       const payload = resp.data;

//       // 3) upsert cache
//       const norm = normalizeZoopPan(payload);
//       await db('pan_cache')
//         .insert({
//           pan,
//           holder_name: norm.holderName || null,
//           status: norm.status || null,
//           payload: JSON.stringify(payload),
//           fetched_at: db.fn.now(),
//         })
//         .onConflict('pan')
//         .merge({
//           holder_name: norm.holderName || null,
//           status: norm.status || null,
//           payload: JSON.stringify(payload),
//           fetched_at: db.fn.now(),
//         });

//       return res.json({ source: 'live', pan, ...norm });
//     } catch (e) {
//       if (e instanceof z.ZodError) {
//         return res.status(400).json({ error: e.errors?.[0]?.message || 'Invalid PAN' });
//       }
//       next(e);
//     }
//   }
// );

// // ---- helpers ----
// function safeJSON(s) {
//   try { return JSON.parse(s); } catch { return {}; }
// }

// /** Normalize Zoop Pan Lite into a consistent shape */
// function normalizeZoopPan(p = {}) {
//   const success = p?.success === true || String(p?.response_code) === '100';
//   const meta = p?.metadata || p?.result || {};
//   const status = String(meta.pan_status || meta.status || '').toUpperCase() || null;
//   const holderName = meta.name || meta.pan_holder_name || null;

//   // consider VALID / ACTIVE / VALIDATED as ok
//   const validStatuses = new Set(['VALID', 'ACTIVE', 'VALIDATED']);
//   const valid = success && (!status || validStatuses.has(status));

//   return {
//     success: !!success,
//     valid: !!valid,
//     status,
//     holderName,
//     raw: p,
//   };
// }

// module.exports = router;



// src/routes/pan.js
const router = require('express').Router();
const axios = require('axios');
const { z } = require('zod');
const db = require('../db');
const rateLimit = require('express-rate-limit');
const { auth } = require('../middleware/jwt');
const { attachPermissions } = require('../middleware/permissions');
const { audit } = require('../middleware/audit');
const { randomUUID } = require('crypto');

// PAN format: 5 letters + 4 digits + 1 letter
const PAN = z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/i, 'Invalid PAN');

// rate limit provider calls
const limiter = rateLimit({ windowMs: 60 * 1000, max: 30, standardHeaders: true });

/**
 * GET /pan/verify?pan=ABCDE1234F&name=OptionalName
 */
router.get(
  '/verify',
  auth,
  attachPermissions,
  limiter,
  audit('PAN_VERIFY', 'pan'),
  async (req, res, next) => {
    try {
      const pan = PAN.parse(String(req.query.pan || '').trim().toUpperCase());
      const name = String(req.query.name || '').trim() || null;

      // 1) cache hit (24h)
      const cached = await db('pan_cache').where({ pan }).first();
      if (cached) {
        const ageHrs = (Date.now() - new Date(cached.fetched_at).getTime()) / 36e5;
        if (ageHrs < 24) {
          const payload = JSON.parse(cached.payload);
          return res.json({ source: 'cache', pan, ...normalizeProvider(payload) });
        }
      }

      // 2) call provider
      const url = process.env.PAN_API_URL;
      const apiKey = process.env.GST_API_KEY;
      const appId = process.env.GST_APP_ID;

      if (!url || !apiKey || !appId) {
        return res.status(500).json({
          error: 'PAN provider not configured (PAN_API_URL, PAN_API_KEY, PAN_APP_ID)',
        });
      }

      const mode = process.env.PAN_MODE || 'sync';
      const consent = process.env.PAN_CONSENT || 'Y';
      const consentText =
        process.env.PAN_CONSENT_TEXT ||
        'I hereby declare my consent agreement for fetching my information via provider API';
      const taskId = randomUUID();

      // Body matches the “Pan Lite” docs you shared
      const body = {
        mode,
        data: {
          customer_pan_number: pan,
          pan_holder_name: name || undefined,
          consent,
          consent_text: consentText,
        },
        task_id: taskId,
      };

      const resp = await axios.post(url, body, {
        timeout: 20000,
        headers: {
          'api-key': apiKey,
          'app-id': appId,
          'Content-Type': 'application/json',
        },
        validateStatus: () => true,
      });

      if (resp.status < 200 || resp.status >= 300 || resp.data?.success === false) {
        return res.status(resp.status || 400).json({ error: 'PAN provider error', info: resp.data });
      }

      const payload = resp.data;

      // 3) upsert cache
      const norm = normalizeProvider(payload);
      await db('pan_cache')
        .insert({
          pan,
          holder_name: norm.holder_name || null,
          status: norm.status || null,
          payload: JSON.stringify(payload),
          fetched_at: db.fn.now(),
        })
        .onConflict('pan')
        .merge({
          holder_name: norm.holder_name || null,
          status: norm.status || null,
          payload: JSON.stringify(payload),
          fetched_at: db.fn.now(),
        });

      return res.json({ source: 'live', pan, ...norm });
    } catch (e) {
      if (e instanceof z.ZodError) {
        return res.status(400).json({ error: e.errors?.[0]?.message || 'Invalid PAN' });
      }
      next(e);
    }
  }
);

// Normalize provider shape
function normalizeProvider(p = {}) {
  const r = p?.result || {};
  // adapt keys to what your provider returns
  // many “lite” PAN APIs return name/status under result.*
  return {
    valid: r.status === 'VALID' || r.pan_status === 'VALID' || r.valid === true || undefined,
    holder_name: r.name || r.pan_holder_name || null,
    status: r.status || r.pan_status || null,
    raw: p,
  };
}

module.exports = router;
