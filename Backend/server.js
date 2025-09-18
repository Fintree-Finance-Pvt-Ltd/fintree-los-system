// // server.js (at project root)
// require('dotenv').config();

// const express = require('express');
// const helmet = require('helmet');
// const cors = require('cors');
// const morgan = require('morgan');
// const db = require('./src/db');
// const cron = require('node-cron');
// const rateLimit = require('express-rate-limit');
// const path = require('path');
// const fs = require('fs');
// const { z } = require('zod');

// const { auth } = require('./src/middleware/jwt');
// const { attachPermissions } = require('./src/middleware/permissions');
// const { writeAudit } = require('./src/middleware/audit');

// const makeEntityRouter = require('./src/routes/entityFactory'); // ✅ the factory only

// const app = express();
// app.use(helmet());
// app.use(cors({ origin: true, credentials: true }));
// app.use(express.json());
// app.use(morgan('tiny'));

// // ====== Static uploads ======
// const uploadDir = path.join(process.cwd(), 'uploads');
// if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
// app.use('/uploads', express.static(uploadDir, { maxAge: '1d' }));

// // ====== Rate limit for OTP ======
// const otpLimiter = rateLimit({
//   windowMs: 10 * 60 * 1000,
//   max: 5,
//   standardHeaders: true,
//   legacyHeaders: false
// });
// app.use('/auth/request-otp', otpLimiter);

// // ====== Public routes ======
// app.use('/auth', require('./src/routes/auth'));
// app.use('/secure', require('./src/routes/secure'));

// // ====== Auth + perms + audit ======
// app.use(auth, attachPermissions);
// app.use(writeAudit);

// // ====== RBAC after perms attached ======
// app.use('/rbac', require('./src/routes/rbac'));

// // ====== Entities ======
// const jsonAny = z.any();

// // 1) DEALERS — table with dealer_* columns
// const dealerCreate = z.object({
//   dealer_name: z.string().min(1).max(191),
//   name_as_per_invoice: z.string().max(191).optional().or(z.literal('')).transform(v => v || null),
//   dealer_phone: z.string().max(32).optional().or(z.literal('')).transform(v => v || null),
//   dealer_address: z.string().max(191).optional().or(z.literal('')).transform(v => v || null),
//   email: z.string().email().max(191).optional().or(z.literal('')).transform(v => v || null),
//   gst_no: z.string().max(32).optional().or(z.literal('')).transform(v => v || null),
//   dealer_pan_card: z.string().max(32).optional().or(z.literal('')).transform(v => v || null),
//   authorised_dealer_name: z.string().max(191).optional().or(z.literal('')).transform(v => v || null),
//   is_active: z.boolean().optional().default(true),
//   custom: z.record(z.any()).optional().default({}),
// });
// const dealerUpdate = dealerCreate.partial();
// const dealerBulk = dealerCreate.partial();

// const mapDealer = (b) => ({
//   dealer_name: b.dealer_name,
//   name_as_per_invoice: b.name_as_per_invoice,
//   dealer_phone: b.dealer_phone,
//   dealer_address: b.dealer_address,
//   email: b.email,
//   gst_no: b.gst_no,
//   dealer_pan_card: b.dealer_pan_card,
//   authorised_dealer_name: b.authorised_dealer_name,
//   is_active: b.is_active ?? true,
// });

// app.use('/dealers', makeEntityRouter({
//   entityName: 'dealer',
//   table: 'dealers',
//   codeField: 'dealer_id',
//   codePrefix: 'DLR',
//   jsonColumn: 'custom_data',
//   defaultStatus: 'PENDING',
//   searchColumns: ['dealer_name','email','dealer_phone','dealer_address','gst_no','dealer_pan_card','authorised_dealer_name'],
//   perms: { READ:'DEALERS_READ', WRITE:'DEALERS_WRITE', REVIEW:'DEALERS_REVIEW' },
//   createSchema: dealerCreate,
//   updateSchema: dealerUpdate,
//   bulkItemSchema: dealerBulk,
//   mapBodyToRow: mapDealer,
// }));

// // 2) FINANCIAL INSTITUTES
// const finCreate = z.object({
//   name: z.string().min(1).max(191),
//   email: z.string().email().max(191).optional().or(z.literal('')).transform(v => v || null),
//   phone: z.string().max(32).optional().or(z.literal('')).transform(v => v || null),
//   is_active: z.boolean().optional().default(true),
//   custom: z.record(z.any()).optional().default({}),
// });
// const finUpdate = finCreate.partial();
// const finBulk = finCreate.partial();

// const mapFin = (b) => ({
//   name: b.name,
//   email: b.email,
//   phone: b.phone,
//   is_active: b.is_active ?? true,
// });

// app.use('/fin-institutes', makeEntityRouter({
//   entityName: 'financial_institute',
//   table: 'financial_institutes',
//   codeField: 'fin_id',
//   codePrefix: 'FIN',
//   jsonColumn: 'custom_data',
//   defaultStatus: 'PENDING',
//   searchColumns: ['name','email','phone'],
//   perms: { READ:'FIN_READ', WRITE:'FIN_WRITE', REVIEW:'FIN_REVIEW' },
//   createSchema: finCreate,
//   updateSchema: finUpdate,
//   bulkItemSchema: finBulk,
//   mapBodyToRow: mapFin,
// }));

// // 3) LANDLORDS
// const landCreate = z.object({
//   name: z.string().min(1).max(191),
//   email: z.string().email().max(191).optional().or(z.literal('')).transform(v => v || null),
//   phone: z.string().max(32).optional().or(z.literal('')).transform(v => v || null),
//   is_active: z.boolean().optional().default(true),
//   custom: z.record(z.any()).optional().default({}),
// });
// const landUpdate = landCreate.partial();
// const landBulk = landCreate.partial();

// const mapLand = (b) => ({
//   name: b.name,
//   email: b.email,
//   phone: b.phone,
//   is_active: b.is_active ?? true,
// });

// app.use('/landlords', makeEntityRouter({
//   entityName: 'landlord',
//   table: 'landlords',
//   codeField: 'lnd_id',
//   codePrefix: 'LND',
//   jsonColumn: 'custom_data',
//   defaultStatus: 'PENDING',
//   searchColumns: ['name','email','phone'],
//   perms: { READ:'LAND_READ', WRITE:'LAND_WRITE', REVIEW:'LAND_REVIEW' },
//   createSchema: landCreate,
//   updateSchema: landUpdate,
//   bulkItemSchema: landBulk,
//   mapBodyToRow: mapLand,
// }));

// // ====== Other routes ======
// app.use('/admin', require('./src/routes/admin'));
// app.use('/fields', require('./src/routes/fields'));
// // was '/fields' twice; mount admin version separately to avoid overlap:
// app.use('/admin/fields', require('./src/routes/adminFields'));
// app.use('/docs', require('./src/routes/docs'));
// app.use('/gst', require('./src/routes/gst'));

// // ====== Start ======
// const port = process.env.PORT || 8080;
// app.listen(port, () => {
//   console.log(`Server running on http://localhost:${port}`);
// });

// // ====== Housekeeping cron ======
// cron.schedule('0 2 * * *', async () => {
//   try {
//     await db.raw("DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL 30 DAY");
//   } catch (e) {
//     // swallow
//   }
// });


// server.js (project root)
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

const makeEntityRouter = require('./src/routes/entityFactory'); // ✅ factory

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

// ------------------------------------------------------------------
// KEEP YOUR EXISTING MODULES (DEALERS / FIN-INSTITUTES / LANDLORDS)
// ------------------------------------------------------------------
const jsonAny = z.any();

// 1) DEALERS — unchanged
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
  custom: z.record(jsonAny).optional().default({}),
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

// 2) FINANCIAL INSTITUTES — unchanged
const finCreate = z.object({
  name: z.string().min(1).max(191),
  email: z.string().email().max(191).optional().or(z.literal('')).transform(v => v || null),
  phone: z.string().max(32).optional().or(z.literal('')).transform(v => v || null),
  address: z.string().max(191).optional().or(z.literal('')).transform(v => v || null),
  is_active: z.boolean().optional().default(true),
  custom: z.record(jsonAny).optional().default({}),
});
const finUpdate = finCreate.partial();
const finBulk = finCreate.partial();

const mapFin = (b) => ({
  name: b.name,
  email: b.email,
  phone: b.phone,
  address: b.address,
  is_active: b.is_active ?? true,
});

app.use('/fin-institutes', makeEntityRouter({
  entityName: 'financial_institute',
  table: 'financial_institutes',
  codeField: 'fin_id',
  codePrefix: 'FIN',
  jsonColumn: 'custom_data',
  defaultStatus: 'PENDING',
  searchColumns: ['name','email','phone','address'],
  perms: { READ:'FIN_READ', WRITE:'FIN_WRITE', REVIEW:'FIN_REVIEW' },
  createSchema: finCreate,
  updateSchema: finUpdate,
  bulkItemSchema: finBulk,
  mapBodyToRow: mapFin,
}));

// 3) LANDLORDS — unchanged
const landCreate = z.object({
  name: z.string().min(1).max(191),
  email: z.string().email().max(191).optional().or(z.literal('')).transform(v => v || null),
  phone: z.string().max(32).optional().or(z.literal('')).transform(v => v || null),
  address: z.string().max(191).optional().or(z.literal('')).transform(v => v || null),
  is_active: z.boolean().optional().default(true),
  custom: z.record(jsonAny).optional().default({}),
});
const landUpdate = landCreate.partial();
const landBulk = landCreate.partial();

const mapLand = (b) => ({
  name: b.name,
  email: b.email,
  phone: b.phone,
  address: b.address,
  is_active: b.is_active ?? true,
});

app.use('/landlords', makeEntityRouter({
  entityName: 'landlord',
  table: 'landlords',
  codeField: 'lnd_id',
  codePrefix: 'LND',
  jsonColumn: 'custom_data',
  defaultStatus: 'PENDING',
  searchColumns: ['name','email','phone','address'],
  perms: { READ:'LAND_READ', WRITE:'LAND_WRITE', REVIEW:'LAND_REVIEW' },
  createSchema: landCreate,
  updateSchema: landUpdate,
  bulkItemSchema: landBulk,
  mapBodyToRow: mapLand,
}));

// ------------------------------------------------------------------
// NEW: PRODUCTS (each has its own fields, table, and permissions)
// ------------------------------------------------------------------

// Product: EV
const prodEvCreate = z.object({
  applicant_name: z.string().min(1).max(191),
  phone: z.string().max(32).optional().or(z.literal('')).transform(v => v || null),
  email: z.string().email().max(191).optional().or(z.literal('')).transform(v => v || null),
  vehicle_model: z.string().max(191).optional().or(z.literal('')).transform(v => v || null),
  on_road_price: z.coerce.number().min(0).optional(),
  down_payment: z.coerce.number().min(0).optional(),
  tenure_months: z.coerce.number().int().min(0).optional(),
  is_active: z.boolean().optional().default(true),
  custom: z.record(jsonAny).optional().default({}),
});
const prodEvUpdate = prodEvCreate.partial();
const prodEvBulk = prodEvCreate.partial();
const mapProdEv = (b) => ({
  applicant_name: b.applicant_name,
  phone: b.phone,
  email: b.email,
  vehicle_model: b.vehicle_model,
  on_road_price: b.on_road_price ?? null,
  down_payment: b.down_payment ?? null,
  tenure_months: b.tenure_months ?? null,
  is_active: b.is_active ?? true,
});
app.use('/product/ev', makeEntityRouter({
  entityName: 'product_ev',
  table: 'loan_product_ev',
  codeField: 'customer_id',
  codePrefix: 'PEV',
  jsonColumn: 'custom_data',
  defaultStatus: 'PENDING',
  searchColumns: ['customer_id','applicant_name','phone','email','vehicle_model'],
  perms: { READ:'PROD_EV_READ', WRITE:'PROD_EV_WRITE', REVIEW:'PROD_EV_REVIEW' },
  createSchema: prodEvCreate, updateSchema: prodEvUpdate, bulkItemSchema: prodEvBulk,
  mapBodyToRow: mapProdEv,
}));

// Product: Mobile
const prodMobileCreate = z.object({
  applicant_name: z.string().min(1).max(191),
  phone: z.string().max(32).optional().or(z.literal('')).transform(v => v || null),
  email: z.string().email().max(191).optional().or(z.literal('')).transform(v => v || null),
  handset_brand: z.string().max(191).optional().or(z.literal('')).transform(v => v || null),
  imei: z.string().max(32).optional().or(z.literal('')).transform(v => v || null),
  amount: z.coerce.number().min(0).optional(),
  tenure_months: z.coerce.number().int().min(0).optional(),
  is_active: z.boolean().optional().default(true),
  custom: z.record(jsonAny).optional().default({}),
});
const prodMobileUpdate = prodMobileCreate.partial();
const prodMobileBulk = prodMobileCreate.partial();
const mapProdMobile = (b) => ({
  applicant_name: b.applicant_name,
  phone: b.phone,
  email: b.email,
  handset_brand: b.handset_brand,
  imei: b.imei,
  amount: b.amount ?? null,
  tenure_months: b.tenure_months ?? null,
  is_active: b.is_active ?? true,
});
app.use('/product/mobile', makeEntityRouter({
  entityName: 'product_mobile',
  table: 'loan_product_mobile',
  codeField: 'customer_id',
  codePrefix: 'PML',
  jsonColumn: 'custom_data',
  defaultStatus: 'PENDING',
  searchColumns: ['customer_id','applicant_name','phone','email','handset_brand','imei'],
  perms: { READ:'PROD_MOBILE_READ', WRITE:'PROD_MOBILE_WRITE', REVIEW:'PROD_MOBILE_REVIEW' },
  createSchema: prodMobileCreate, updateSchema: prodMobileUpdate, bulkItemSchema: prodMobileBulk,
  mapBodyToRow: mapProdMobile,
}));

// Product: Education
const prodEduCreate = z.object({
  applicant_name: z.string().min(1).max(191),
  phone: z.string().max(32).optional().or(z.literal('')).transform(v => v || null),
  email: z.string().email().max(191).optional().or(z.literal('')).transform(v => v || null),
  institute_name: z.string().max(191).optional().or(z.literal('')).transform(v => v || null),
  course: z.string().max(191).optional().or(z.literal('')).transform(v => v || null),
  amount: z.coerce.number().min(0).optional(),
  tenure_months: z.coerce.number().int().min(0).optional(),
  coapplicant_name: z.string().max(191).optional().or(z.literal('')).transform(v => v || null),
  is_active: z.boolean().optional().default(true),
  custom: z.record(jsonAny).optional().default({}),
});
const prodEduUpdate = prodEduCreate.partial();
const prodEduBulk = prodEduCreate.partial();
const mapProdEdu = (b) => ({
  applicant_name: b.applicant_name,
  phone: b.phone,
  email: b.email,
  institute_name: b.institute_name,
  course: b.course,
  amount: b.amount ?? null,
  tenure_months: b.tenure_months ?? null,
  coapplicant_name: b.coapplicant_name,
  is_active: b.is_active ?? true,
});
app.use('/product/education', makeEntityRouter({
  entityName: 'product_education',
  table: 'loan_product_education',
  codeField: 'customer_id',
  codePrefix: 'PED',
  jsonColumn: 'custom_data',
  defaultStatus: 'PENDING',
  searchColumns: ['customer_id','applicant_name','phone','email','institute_name','course'],
  perms: { READ:'PROD_EDU_READ', WRITE:'PROD_EDU_WRITE', REVIEW:'PROD_EDU_REVIEW' },
  createSchema: prodEduCreate, updateSchema: prodEduUpdate, bulkItemSchema: prodEduBulk,
  mapBodyToRow: mapProdEdu,
}));

// ------------------------------------------------------------------
// NEW: LENDERS (each has its own fields, table, and permissions)
// ------------------------------------------------------------------

// Lender: EV
const lendEvCreate = z.object({
  applicant_name: z.string().min(1).max(191),
  phone: z.string().max(32).optional().or(z.literal('')).transform(v => v || null),
  email: z.string().email().max(191).optional().or(z.literal('')).transform(v => v || null),
  dealer_id: z.string().max(32).optional().or(z.literal('')).transform(v => v || null),
  loan_amount: z.coerce.number().min(0).optional(),
  rate: z.coerce.number().min(0).optional(),               // % p.a.
  tenure_months: z.coerce.number().int().min(0).optional(),
  is_active: z.boolean().optional().default(true),
  custom: z.record(jsonAny).optional().default({}),
});
const lendEvUpdate = lendEvCreate.partial();
const lendEvBulk = lendEvCreate.partial();
const mapLendEv = (b) => ({
  applicant_name: b.applicant_name,
  phone: b.phone,
  email: b.email,
  dealer_id: b.dealer_id,
  loan_amount: b.loan_amount ?? null,
  rate: b.rate ?? null,
  tenure_months: b.tenure_months ?? null,
  is_active: b.is_active ?? true,
});
app.use('/lender/ev', makeEntityRouter({
  entityName: 'lender_ev',
  table: 'loan_lender_ev',
  codeField: 'customer_id',
  codePrefix: 'LEV',
  jsonColumn: 'custom_data',
  defaultStatus: 'PENDING',
  searchColumns: ['customer_id','applicant_name','phone','email','dealer_id'],
  perms: { READ:'LEND_EV_READ', WRITE:'LEND_EV_WRITE', REVIEW:'LEND_EV_REVIEW' },
  createSchema: lendEvCreate, updateSchema: lendEvUpdate, bulkItemSchema: lendEvBulk,
  mapBodyToRow: mapLendEv,
}));

// Lender: Adikosh
const lendAdiCreate = z.object({
  applicant_name: z.string().min(1).max(191),
  phone: z.string().max(32).optional().or(z.literal('')).transform(v => v || null),
  email: z.string().email().max(191).optional().or(z.literal('')).transform(v => v || null),
  amount: z.coerce.number().min(0).optional(),
  bureau_score: z.coerce.number().int().min(0).optional(),
  tenure_months: z.coerce.number().int().min(0).optional(),
  is_active: z.boolean().optional().default(true),
  custom: z.record(jsonAny).optional().default({}),
});
const lendAdiUpdate = lendAdiCreate.partial();
const lendAdiBulk = lendAdiCreate.partial();
const mapLendAdi = (b) => ({
  applicant_name: b.applicant_name,
  phone: b.phone,
  email: b.email,
  amount: b.amount ?? null,
  bureau_score: b.bureau_score ?? null,
  tenure_months: b.tenure_months ?? null,
  is_active: b.is_active ?? true,
});
app.use('/lender/adikosh', makeEntityRouter({
  entityName: 'lender_adikosh',
  table: 'loan_lender_adikosh',
  codeField: 'customer_id',
  codePrefix: 'LAD',
  jsonColumn: 'custom_data',
  defaultStatus: 'PENDING',
  searchColumns: ['customer_id','applicant_name','phone','email'],
  perms: { READ:'LEND_ADIKOSH_READ', WRITE:'LEND_ADIKOSH_WRITE', REVIEW:'LEND_ADIKOSH_REVIEW' },
  createSchema: lendAdiCreate, updateSchema: lendAdiUpdate, bulkItemSchema: lendAdiBulk,
  mapBodyToRow: mapLendAdi,
}));

// Lender: GQ FSF
const lendGqFsfCreate = z.object({
  applicant_name: z.string().min(1).max(191),
  phone: z.string().max(32).optional().or(z.literal('')).transform(v => v || null),
  email: z.string().email().max(191).optional().or(z.literal('')).transform(v => v || null),
  amount: z.coerce.number().min(0).optional(),
  scheme_name: z.string().max(191).optional().or(z.literal('')).transform(v => v || null),
  is_active: z.boolean().optional().default(true),
  custom: z.record(jsonAny).optional().default({}),
});
const lendGqFsfUpdate = lendGqFsfCreate.partial();
const lendGqFsfBulk = lendGqFsfCreate.partial();
const mapLendGqFsf = (b) => ({
  applicant_name: b.applicant_name,
  phone: b.phone,
  email: b.email,
  amount: b.amount ?? null,
  scheme_name: b.scheme_name,
  is_active: b.is_active ?? true,
});
app.use('/lender/gq-fsf', makeEntityRouter({
  entityName: 'lender_gq_fsf',
  table: 'loan_lender_gq_fsf',
  codeField: 'customer_id',
  codePrefix: 'LGQF',
  jsonColumn: 'custom_data',
  defaultStatus: 'PENDING',
  searchColumns: ['customer_id','applicant_name','phone','email','scheme_name'],
  perms: { READ:'LEND_GQFSF_READ', WRITE:'LEND_GQFSF_WRITE', REVIEW:'LEND_GQFSF_REVIEW' },
  createSchema: lendGqFsfCreate, updateSchema: lendGqFsfUpdate, bulkItemSchema: lendGqFsfBulk,
  mapBodyToRow: mapLendGqFsf,
}));

// Lender: GQ Non-FSF
const lendGqNonFsfCreate = z.object({
  applicant_name: z.string().min(1).max(191),
  phone: z.string().max(32).optional().or(z.literal('')).transform(v => v || null),
  email: z.string().email().max(191).optional().or(z.literal('')).transform(v => v || null),
  amount: z.coerce.number().min(0).optional(),
  scheme_name: z.string().max(191).optional().or(z.literal('')).transform(v => v || null),
  is_active: z.boolean().optional().default(true),
  custom: z.record(jsonAny).optional().default({}),
});
const lendGqNonFsfUpdate = lendGqNonFsfCreate.partial();
const lendGqNonFsfBulk = lendGqNonFsfCreate.partial();
const mapLendGqNonFsf = (b) => ({
  applicant_name: b.applicant_name,
  phone: b.phone,
  email: b.email,
  amount: b.amount ?? null,
  scheme_name: b.scheme_name,
  is_active: b.is_active ?? true,
});
app.use('/lender/gq-nonfsf', makeEntityRouter({
  entityName: 'lender_gq_nonfsf',
  table: 'loan_lender_gq_nonfsf',
  codeField: 'customer_id',
  codePrefix: 'LGQNF',
  jsonColumn: 'custom_data',
  defaultStatus: 'PENDING',
  searchColumns: ['customer_id','applicant_name','phone','email','scheme_name'],
  perms: { READ:'LEND_GQNONFSF_READ', WRITE:'LEND_GQNONFSF_WRITE', REVIEW:'LEND_GQNONFSF_REVIEW' },
  createSchema: lendGqNonFsfCreate, updateSchema: lendGqNonFsfUpdate, bulkItemSchema: lendGqNonFsfBulk,
  mapBodyToRow: mapLendGqNonFsf,
}));

// Lender: BL
const lendBlCreate = z.object({
  applicant_name: z.string().min(1).max(191),
  phone: z.string().max(32).optional().or(z.literal('')).transform(v => v || null),
  email: z.string().email().max(191).optional().or(z.literal('')).transform(v => v || null),
  business_name: z.string().max(191).optional().or(z.literal('')).transform(v => v || null),
  gst_no: z.string().max(32).optional().or(z.literal('')).transform(v => v || null),
  amount: z.coerce.number().min(0).optional(),
  tenure_months: z.coerce.number().int().min(0).optional(),
  is_active: z.boolean().optional().default(true),
  custom: z.record(jsonAny).optional().default({}),
});
const lendBlUpdate = lendBlCreate.partial();
const lendBlBulk = lendBlCreate.partial();
const mapLendBl = (b) => ({
  applicant_name: b.applicant_name,
  phone: b.phone,
  email: b.email,
  business_name: b.business_name,
  gst_no: b.gst_no,
  amount: b.amount ?? null,
  tenure_months: b.tenure_months ?? null,
  is_active: b.is_active ?? true,
});
app.use('/lender/bl', makeEntityRouter({
  entityName: 'lender_bl',
  table: 'loan_lender_bl',
  codeField: 'customer_id',
  codePrefix: 'LBL',
  jsonColumn: 'custom_data',
  defaultStatus: 'PENDING',
  searchColumns: ['customer_id','applicant_name','phone','email','business_name','gst_no'],
  perms: { READ:'LEND_BL_READ', WRITE:'LEND_BL_WRITE', REVIEW:'LEND_BL_REVIEW' },
  createSchema: lendBlCreate, updateSchema: lendBlUpdate, bulkItemSchema: lendBlBulk,
  mapBodyToRow: mapLendBl,
}));

// ------------------------------------------------------------------
// OTHER ROUTES (unchanged)
// ------------------------------------------------------------------
app.use('/admin', require('./src/routes/admin'));
app.use('/fields', require('./src/routes/fields'));
app.use('/admin/fields', require('./src/routes/adminFields'));
app.use('/docs', require('./src/routes/docs'));
app.use('/gst', require('./src/routes/gst'));
// server.js
app.use('/pan', require('./src/routes/pan'));
// server.js
app.use('/loans/booking', require('./src/routes/loanBooking')); 
// after auth/perms/audit middlewares and before start()
app.use('/loans', require('./src/routes/loanList'));





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
    // ignore
  }
});
