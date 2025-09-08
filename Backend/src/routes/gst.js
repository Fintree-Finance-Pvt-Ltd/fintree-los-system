// src/routes/gst.js
const router = require('express').Router();
const axios = require('axios');
const { z } = require('zod');
const db = require('../db');
const rateLimit = require('express-rate-limit');
const { auth } = require('../middleware/jwt');
const { attachPermissions } = require('../middleware/permissions');
const { audit } = require('../middleware/audit');
const { randomUUID } = require('crypto');

// GSTIN format (case-insensitive)
const GSTIN = z
  .string()
  .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[0-9A-Z]{1}Z[0-9A-Z]{1}$/i, 'Invalid GSTIN');

// rate limit provider calls
const limiter = rateLimit({ windowMs: 60 * 1000, max: 30, standardHeaders: true });

/**
 * GET /gst/verify?gstin=27AACCF5878N1ZW
 */
router.get(
  '/verify',
  auth,
  attachPermissions,
  limiter,
  audit('GST_VERIFY', 'gst'),
  async (req, res, next) => {
    try {
      const gstin = GSTIN.parse(String(req.query.gstin || '').trim().toUpperCase());

      // 1) serve from cache if younger than 24h
      const cached = await db('gst_cache').where({ gstin }).first();
      if (cached) {
        const ageHrs = (Date.now() - new Date(cached.fetched_at).getTime()) / 36e5;
        if (ageHrs < 24) {
          const payload = JSON.parse(cached.payload);
          return res.json({ source: 'cache', gstin, ...normalizeZoop(payload) });
        }
      }

      // 2) call Zoop
      const url = process.env.GST_API_URL;  
      const apiKey = process.env.GST_API_KEY;
      const appId = process.env.GST_APP_ID;

      if (!url || !apiKey || !appId) {
        return res
          .status(500)
          .json({ error: 'GST provider not configured (GST_API_URL, GST_API_KEY, GST_APP_ID)' });
      }

      // Per Zoop docs
      const mode = process.env.GST_MODE || 'sync'; // must be "sync" for this endpoint
      const consent = process.env.GST_CONSENT || 'Y';
      const consentText =
        process.env.GST_CONSENT_TEXT ||
        'I hereby declare my consent agreement for fetching my information via ZOOP API';
      const taskId = randomUUID();

      const body = {
        mode,
        data: {
          business_gstin_number: gstin,
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
        validateStatus: () => true, // let us see Zoop's error payload
      });

      if (resp.status < 200 || resp.status >= 300 || resp.data?.success === false) {
        // Bubble up provider error to the client (helps debugging)
        return res.status(resp.status || 400).json({
          error: 'GST provider error',
          info: resp.data,
        });
      }

      const payload = resp.data;

      // 3) upsert cache
      await db('gst_cache')
        .insert({
          gstin,
          payload: JSON.stringify(payload),
          status: payload?.result?.current_registration_status || null,
          fetched_at: db.fn.now(),
        })
        .onConflict('gstin')
        .merge({
          payload: JSON.stringify(payload),
          status: payload?.result?.current_registration_status || null,
          fetched_at: db.fn.now(),
        });

      return res.json({ source: 'live', gstin, ...normalizeZoop(payload) });
    } catch (e) {
      if (e instanceof z.ZodError) {
        return res.status(400).json({ error: e.errors?.[0]?.message || 'Invalid GSTIN' });
      }
      next(e);
    }
  }
);

// ---- Normalize Zoop response into a consistent shape for the UI ----
function normalizeZoop(p = {}) {
  const r = p?.result || {};
  return {
    legalName: r.legal_name || null,
    tradeName: r.trade_name || null,
    status: r.current_registration_status || null,
    constitution: r.business_constitution || null,
    address:
      r.primary_business_address?.full_address ||
      composeAddress(r.primary_business_address) ||
      null,
    stateCode: r.primary_business_address?.state_code || null,
    registrationDate: r.register_date || null,
    raw: p, // keep everything if you want to show more details later
  };
}

function composeAddress(a) {
  if (!a) return null;
  const parts = [
    a.building_name,
    a.building_number,
    a.flat_number,
    a.street,
    a.location,
    a.district,
    a.state_code,
    a.pincode,
  ]
    .map((s) => (s || '').toString().trim())
    .filter(Boolean);
  return parts.join(', ');
}

module.exports = router;
