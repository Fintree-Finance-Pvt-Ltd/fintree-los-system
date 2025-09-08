// server.js (at project root)
require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const db = require('./src/db');
const cron = require('node-cron');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
const { z } = require('zod');

const { auth } = require('./src/middleware/jwt');
const { attachPermissions } = require('./src/middleware/permissions');
const { writeAudit } = require('./src/middleware/audit');

const makeEntityRouter = require('./src/routes/entityFactory'); // ✅ the factory only

const app = express();
app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(morgan('tiny'));

// ====== Static uploads ======
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
app.use('/uploads', express.static(uploadDir, { maxAge: '1d' }));

// ====== Rate limit for OTP ======
const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/auth/request-otp', otpLimiter);

// ====== Public routes ======
app.use('/auth', require('./src/routes/auth'));
app.use('/secure', require('./src/routes/secure'));

// ====== Auth + perms + audit ======
app.use(auth, attachPermissions);
app.use(writeAudit);

// ====== RBAC after perms attached ======
app.use('/rbac', require('./src/routes/rbac'));

// ====== Entities ======
const jsonAny = z.any();

// 1) DEALERS — table with dealer_* columns
const dealerCreate = z.object({
  dealer_name: z.string().min(1).max(191),
  name_as_per_invoice: z.string().max(191).optional().or(z.literal('')).transform(v => v || null),
  dealer_phone: z.string().max(32).optional().or(z.literal('')).transform(v => v || null),
  dealer_address: z.string().max(191).optional().or(z.literal('')).transform(v => v || null),
  email: z.string().email().max(191).optional().or(z.literal('')).transform(v => v || null),
  gst_no: z.string().max(32).optional().or(z.literal('')).transform(v => v || null),
  dealer_pan_card: z.string().max(32).optional().or(z.literal('')).transform(v => v || null),
  authorised_dealer_name: z.string().max(191).optional().or(z.literal('')).transform(v => v || null),
  is_active: z.boolean().optional().default(true),
  custom: z.record(z.any()).optional().default({}),
});
const dealerUpdate = dealerCreate.partial();
const dealerBulk = dealerCreate.partial();

const mapDealer = (b) => ({
  dealer_name: b.dealer_name,
  name_as_per_invoice: b.name_as_per_invoice,
  dealer_phone: b.dealer_phone,
  dealer_address: b.dealer_address,
  email: b.email,
  gst_no: b.gst_no,
  dealer_pan_card: b.dealer_pan_card,
  authorised_dealer_name: b.authorised_dealer_name,
  is_active: b.is_active ?? true,
});

app.use('/dealers', makeEntityRouter({
  entityName: 'dealer',
  table: 'dealers',
  codeField: 'dealer_id',
  codePrefix: 'DLR',
  jsonColumn: 'custom_data',
  defaultStatus: 'PENDING',
  searchColumns: ['dealer_name','email','dealer_phone','dealer_address','gst_no','dealer_pan_card','authorised_dealer_name'],
  perms: { READ:'DEALERS_READ', WRITE:'DEALERS_WRITE', REVIEW:'DEALERS_REVIEW' },
  createSchema: dealerCreate,
  updateSchema: dealerUpdate,
  bulkItemSchema: dealerBulk,
  mapBodyToRow: mapDealer,
}));

// 2) FINANCIAL INSTITUTES
const finCreate = z.object({
  name: z.string().min(1).max(191),
  email: z.string().email().max(191).optional().or(z.literal('')).transform(v => v || null),
  phone: z.string().max(32).optional().or(z.literal('')).transform(v => v || null),
  is_active: z.boolean().optional().default(true),
  custom: z.record(z.any()).optional().default({}),
});
const finUpdate = finCreate.partial();
const finBulk = finCreate.partial();

const mapFin = (b) => ({
  name: b.name,
  email: b.email,
  phone: b.phone,
  is_active: b.is_active ?? true,
});

app.use('/fin-institutes', makeEntityRouter({
  entityName: 'financial_institute',
  table: 'financial_institutes',
  codeField: 'fin_id',
  codePrefix: 'FIN',
  jsonColumn: 'custom_data',
  defaultStatus: 'PENDING',
  searchColumns: ['name','email','phone'],
  perms: { READ:'FIN_READ', WRITE:'FIN_WRITE', REVIEW:'FIN_REVIEW' },
  createSchema: finCreate,
  updateSchema: finUpdate,
  bulkItemSchema: finBulk,
  mapBodyToRow: mapFin,
}));

// 3) LANDLORDS
const landCreate = z.object({
  name: z.string().min(1).max(191),
  email: z.string().email().max(191).optional().or(z.literal('')).transform(v => v || null),
  phone: z.string().max(32).optional().or(z.literal('')).transform(v => v || null),
  is_active: z.boolean().optional().default(true),
  custom: z.record(z.any()).optional().default({}),
});
const landUpdate = landCreate.partial();
const landBulk = landCreate.partial();

const mapLand = (b) => ({
  name: b.name,
  email: b.email,
  phone: b.phone,
  is_active: b.is_active ?? true,
});

app.use('/landlords', makeEntityRouter({
  entityName: 'landlord',
  table: 'landlords',
  codeField: 'lnd_id',
  codePrefix: 'LND',
  jsonColumn: 'custom_data',
  defaultStatus: 'PENDING',
  searchColumns: ['name','email','phone'],
  perms: { READ:'LAND_READ', WRITE:'LAND_WRITE', REVIEW:'LAND_REVIEW' },
  createSchema: landCreate,
  updateSchema: landUpdate,
  bulkItemSchema: landBulk,
  mapBodyToRow: mapLand,
}));

// ====== Other routes ======
app.use('/admin', require('./src/routes/admin'));
app.use('/fields', require('./src/routes/fields'));
// was '/fields' twice; mount admin version separately to avoid overlap:
app.use('/admin/fields', require('./src/routes/adminFields'));
app.use('/docs', require('./src/routes/docs'));
app.use('/gst', require('./src/routes/gst'));

// ====== Start ======
const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

// ====== Housekeeping cron ======
cron.schedule('0 2 * * *', async () => {
  try {
    await db.raw("DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL 30 DAY");
  } catch (e) {
    // swallow
  }
});
