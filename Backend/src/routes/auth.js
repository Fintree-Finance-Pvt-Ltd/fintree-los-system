const router = require('express').Router();
const db = require('../db');
const { z } = require('zod');
const argon2 = require('argon2');
const jwt = require('jsonwebtoken');
const { addMinutes, isAfter } = require('date-fns');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { auth } = require('../middleware/jwt');
const { attachPermissions } = require('../middleware/permissions');

/** Build transporter only if SMTP is configured */
const hasSMTP = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
const transporter = hasSMTP
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: false,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    })
  : null;

/** helper: sign JWT valid for 8 hours */
function signToken(user) {
  return jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '8h' });
}

/** POST /auth/request-otp
 * body: { email }
 * - upserts a user if not present
 * - creates a hashed OTP valid for 10 minutes
 * - emails the OTP (or logs to console in dev fallback)
 */
router.post('/request-otp', async (req, res) => {
  const schema = z.object({ email: z.string().email() });
  const { email } = schema.parse(req.body);

  // ensure user exists
  const user = await db('users').where({ email }).first();
  if (!user) await db('users').insert({ email });

  // generate 6-digit code (allows leading 0s)
  const code = crypto.randomInt(0, 1e6).toString().padStart(6, '0');
  const codeHash = await argon2.hash(code);
  const expiresAt = addMinutes(new Date(), 10);

  await db('otp').insert({ email, code_hash: codeHash, expires_at: expiresAt });

  if (hasSMTP) {
    await transporter.sendMail({
      from: process.env.OTP_FROM || 'no-reply@example.com',
      to: email,
      subject: 'Your OTP code',
      text: `Your OTP is ${code}. It expires in 10 minutes.`
    });
  } else {
    // Dev fallback: don’t ship to prod
    console.log(`[DEV] OTP for ${email}: ${code}`);
  }

  res.json({ ok: true, message: 'If the email exists, an OTP has been sent.' });
});

/** POST /auth/verify-otp
 * body: { email, code }
 * - validates latest unused OTP, attempts <= 5, not expired
 * - marks consumed on success and returns JWT
 */
router.post('/verify-otp', async (req, res) => {
  const schema = z.object({
    email: z.string().email(),
    code: z.string().min(4).max(8) // 6 normally, but allow 4-8 for flexibility
  });
  const { email, code } = schema.parse(req.body);

  const row = await db('otp').where({ email, consumed: 0 }).orderBy('id', 'desc').first();
  if (!row) return res.status(400).json({ error: 'OTP not found or already used' });

  if (isAfter(new Date(), new Date(row.expires_at)))
    return res.status(400).json({ error: 'OTP expired' });

  if (row.attempts >= 5)
    return res.status(400).json({ error: 'Too many attempts. Request a new OTP.' });

  const ok = await argon2.verify(row.code_hash, code);

  // increment attempts; mark consumed only when ok
  await db('otp')
    .where({ id: row.id })
    .update({ attempts: row.attempts + 1, consumed: ok ? 1 : 0 });

  if (!ok) return res.status(400).json({ error: 'Invalid code' });

  const user = await db('users').where({ email }).first();
  if (!user || !user.is_active) return res.status(403).json({ error: 'User inactive' });

  const token = signToken(user);
  res.json({ token });
});

/** GET /auth/me
 * Returns current user info from the token.
 * Later, we’ll attach permissions here (after we add RBAC tables).
 */
router.get('/me', auth, attachPermissions, async (req, res) => {
  const user = await db('users').select('id','email','name','is_active')
    .where({ id: req.user.id }).first();
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ ...user, permissions: req.user.permissions || [] });
});


module.exports = router;
