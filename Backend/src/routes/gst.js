const router = require('express').Router();
const axios = require('axios');
const { z } = require('zod');
const db = require('../db');
const rateLimit = require('express-rate-limit');
const { auth } = require('../middleware/jwt');
const { attachPermissions } = require('../middleware/permissions');
const { audit } = require('../middleware/audit');

// Basic GSTIN format check (case-insensitive)
const GSTIN = z.string().regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[0-9A-Z]{1}Z[0-9A-Z]{1}$/i, 'Invalid GSTIN');

// throttle calls to provider
const limiter = rateLimit({ windowMs: 60 * 1000, max: 30, standardHeaders: true });

/**
 * GET /gst/verify?gstin=27ABCDE1234F1Z5
 * Auth required. We proxy to your provider, cache for 24h, and return normalized fields.
 */
router.get('/verify', auth, attachPermissions, limiter, audit('GST_VERIFY', 'gst'), async (req, res, next) => {
  try {
    const gstin = GSTIN.parse(String(req.query.gstin || '').trim().toUpperCase());

    // 1) serve from cache if < 24h old
    const cached = await db('gst_cache').where({ gstin }).first();
    if (cached) {
      const ageHrs = (Date.now() - new Date(cached.fetched_at).getTime()) / 36e5;
      if (ageHrs < 24) {
        const payload = JSON.parse(cached.payload);
        return res.json({ source: 'cache', gstin, ...normalize(payload) });
      }
    }

    // 2) call provider (choose one; shown with ClearTax headers as example)
    // ---- Replace with your provider’s base URL + auth headers
    const url = process.env.GST_PROVIDER_URL;             // e.g. https://api.cleartax.in/gst/taxpayer/<GSTIN>
    const token = process.env.GST_PROVIDER_TOKEN;         // e.g. X-CT-Auth-Token for ClearTax
    if (!url || !token) return res.status(500).json({ error: 'GST provider not configured' });

    // For ClearTax “Taxpayer Information” you typically call something like:
    // GET {{HOST}}/gst/taxpayer/{gstin} with header X-CT-Auth-Token
    const resp = await axios.get(url.replace('{GSTIN}', gstin), {
      timeout: 15_000,
      headers: { 'X-CT-Auth-Token': token }
    });

    const payload = resp.data;

    // 3) upsert cache
    await db('gst_cache')
      .insert({
        gstin,
        payload: JSON.stringify(payload),
        status: payload?.gstinStatus || payload?.status || null,
        fetched_at: db.fn.now()
      })
      .onConflict('gstin').merge({ payload: JSON.stringify(payload), status: payload?.gstinStatus || payload?.status || null, fetched_at: db.fn.now() });

    res.json({ source: 'live', gstin, ...normalize(payload) });
  } catch (e) {
    // validation error?
    if (e instanceof z.ZodError) return res.status(400).json({ error: e.errors?.[0]?.message || 'Invalid GSTIN' });
    // provider error
    if (e.response) {
      return res.status(e.response.status).json({ error: 'GST provider error', info: e.response.data });
    }
    next(e);
  }
});

// normalize various provider payloads into a consistent shape for the UI
function normalize(p = {}) {
  // Map common fields (adjust per your provider’s exact JSON)
  return {
    legalName: p.legalName || p.lgnm || p.legal_name || null,
    tradeName: p.tradeName || p.trade_name || p.tradeNam || null,
    status: p.gstinStatus || p.status || null,
    constitution: p.constitution || p.ctb || null,
    address: p.address || p.addr || (p.pradr ? joinAddr(p.pradr) : null),
    stateCode: p.stateCode || p.stcd || null,
    registrationDate: p.rgdt || p.registrationDate || null
  };
}
function joinAddr(a) {
  try {
    const x = a?.addr || a;
    return [x?.bno, x?.st, x?.loc, x?.dst, x?.stcd, x?.pncd].filter(Boolean).join(', ');
  } catch { return null; }
}

module.exports = router;
