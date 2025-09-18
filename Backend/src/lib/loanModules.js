// src/lib/loanModules.js
const { z } = require('zod');
const dayjs = require('dayjs');
const customParseFormat = require('dayjs/plugin/customParseFormat');
dayjs.extend(customParseFormat);

const jsonAny = z.any();


// Accepts strings like "22/09/2024", "22-09-2024", "2024-09-22",
// "22 Sep 2024", timestamps, and Excel serials.
function coerceDate(input) {
  if (input === null || input === undefined || input === '') return undefined;

  // Already a Date
  if (input instanceof Date && !isNaN(input)) return input;

  // Numbers: timestamp or Excel serial
  if (typeof input === 'number') {
    // if it's very large, assume ms timestamp
    if (input > 1e10) return new Date(input);
    // Excel serial -> JS Date (Excel epoch 1899-12-30)
    const ms = Math.round((input - 25569) * 86400 * 1000);
    return new Date(ms);
  }

  // Numeric string? recurse as number
  if (typeof input === 'string' && /^\d+(\.\d+)?$/.test(input.trim())) {
    return coerceDate(Number(input.trim()));
  }

  if (typeof input === 'string') {
    const s = input.trim();

    const formats = [
      'YYYY-MM-DD',
      'DD-MM-YYYY',
      'D-M-YYYY',
      'DD/MM/YYYY',
      'D/M/YYYY',
      'DD MMM YYYY',
      'D MMM YYYY',
      'MMM D, YYYY',
      'D-MMM-YYYY',
      'DD-MMM-YYYY'
    ];

    for (const f of formats) {
      const d = dayjs(s, f, true);
      if (d.isValid()) return d.toDate();
    }

    // last resort: native Date parse (loose)
    const d = new Date(s);
    if (!isNaN(d)) return d;
  }

  // give up -> undefined (so optional passes)
  return undefined;
}

// small helpers
const optionalStr  = () => z.string().max(191).optional().or(z.literal('')).transform(v => v || null);
const optionalLong = (n = 191) => z.string().max(n).optional().or(z.literal('')).transform(v => v || null);
const optionalNum  = () => z.coerce.number().min(0).optional();
const optionalRate = () => z.coerce.number().min(0).optional(); // interest/apr
const optionalInt  = () => z.coerce.number().int().min(0).optional();
const optionalDate = () => z.preprocess((v) => coerceDate(v), z.date().optional());

const modules = {
  // ---------------- PRODUCTS ----------------
  "product:ev": {
    entityName: 'product_ev',
    table: 'loan_product_ev',
    codeField: 'customer_id',
    codePrefix: 'PEV',
    jsonColumn: 'custom_data',
    defaultStatus: 'LOGIN',
    searchColumns: [
      'customer_id','customer_name','mobile_number','dealer_name','lender_name','borrower_pan','borrower_aadhar'
    ],
    perms: { READ:'PROD_EV_READ', WRITE:'PROD_EV_WRITE', REVIEW:'PROD_EV_REVIEW' },

    createSchema: z.object({
      // names must match FE post body keys
      login_date: optionalDate(),
      customer_name: z.string().min(1).max(191),
      borrower_dob: optionalDate(),
      father_name: optionalStr(),

      address_line1: optionalLong(),
      address_line2: optionalLong(),
      village: optionalStr(),
      district: optionalStr(),
      state: optionalStr(),
      pincode: optionalLong(12),

      mobile_number: optionalLong(32),
      loan_amount: optionalNum(),
      interest_rate: optionalRate(),
      tenure_months: optionalInt(),

      guarantor_name: optionalStr(),
      guarantor_dob: optionalDate(),
      guarantor_aadhar: optionalLong(32),
      guarantor_pan: optionalLong(32),

      dealer_name: optionalStr(),
      name_in_bank: optionalStr(),
      bank_name: optionalStr(),
      account_number: optionalLong(64),
      ifsc: optionalLong(32),

      borrower_aadhar: optionalLong(32),
      borrower_pan: optionalLong(32),

      product_name: optionalStr(),
      lender_name: optionalStr(),
      agreement_date: optionalDate(),

      cibil_score: optionalInt(),
      guarantor_cibil_score: optionalInt(),
      relationship_with_borrower: optionalStr(),

      coapplicant_name: optionalStr(),
      coapplicant_dob: optionalDate(),
      coapplicant_aadhar: optionalLong(32),
      coapplicant_pan: optionalLong(32),
      coapplicant_cibil_score: optionalInt(),

      apr: optionalRate(),

      is_active: z.boolean().optional().default(true),
      custom: z.record(jsonAny).optional().default({}),
    }),

    mapBodyToRow: (b) => ({
      login_date: b.login_date ?? null,
      customer_name: b.customer_name,
      borrower_dob: b.borrower_dob ?? null,
      father_name: b.father_name,

      address_line1: b.address_line1,
      address_line2: b.address_line2,
      village: b.village,
      district: b.district,
      state: b.state,
      pincode: b.pincode,

      mobile_number: b.mobile_number,
      loan_amount: b.loan_amount ?? null,
      interest_rate: b.interest_rate ?? null,
      tenure_months: b.tenure_months ?? null,

      guarantor_name: b.guarantor_name,
      guarantor_dob: b.guarantor_dob ?? null,
      guarantor_aadhar: b.guarantor_aadhar,
      guarantor_pan: b.guarantor_pan,

      dealer_name: b.dealer_name,
      name_in_bank: b.name_in_bank,
      bank_name: b.bank_name,
      account_number: b.account_number,
      ifsc: b.ifsc,

      borrower_aadhar: b.borrower_aadhar,
      borrower_pan: b.borrower_pan,

      product_name: b.product_name,
      lender_name: b.lender_name,
      agreement_date: b.agreement_date ?? null,

      cibil_score: b.cibil_score ?? null,
      guarantor_cibil_score: b.guarantor_cibil_score ?? null,
      relationship_with_borrower: b.relationship_with_borrower,

      coapplicant_name: b.coapplicant_name,
      coapplicant_dob: b.coapplicant_dob ?? null,
      coapplicant_aadhar: b.coapplicant_aadhar,
      coapplicant_pan: b.coapplicant_pan,
      coapplicant_cibil_score: b.coapplicant_cibil_score ?? null,

      apr: b.apr ?? null,

      is_active: b.is_active ?? true,
    }),
  },

  "product:mobile-loan": {
    entityName: "product_mobile",
    table: "loan_product_mobile",
    codeField: "customer_id",
    codePrefix: "PML",
    jsonColumn: "custom_data",
    defaultStatus: "PENDING",
    searchColumns: ["customer_id","applicant_name","phone","handset_brand","imei"],
    perms: { READ:"PROD_MOBILE_READ", WRITE:"PROD_MOBILE_WRITE", REVIEW:"PROD_MOBILE_REVIEW" },
    createSchema: z.object({
      applicant_name: z.string().min(1).max(191),
      phone: optionalStr(),
      device_brand: optionalStr(),  // UI field name
      amount: optionalNum(),
      is_active: z.boolean().optional().default(true),
      custom: z.record(jsonAny).optional().default({}),
    }),
    mapBodyToRow: (b) => ({
      applicant_name: b.applicant_name,
      phone: b.phone,
      handset_brand: b.device_brand,   // UI → DB
      amount: b.amount ?? null,
      is_active: b.is_active ?? true,
    }),
  },

  "product:education-loan": {
    entityName: "product_education",
    table: "loan_product_education",
    codeField: "customer_id",
    codePrefix: "PED",
    jsonColumn: "custom_data",
    defaultStatus: "PENDING",
    searchColumns: ["customer_id","applicant_name","phone","institute_name","course"],
    perms: { READ:"PROD_EDU_READ", WRITE:"PROD_EDU_WRITE", REVIEW:"PROD_EDU_REVIEW" },
    createSchema: z.object({
      applicant_name: z.string().min(1).max(191),
      phone: optionalStr(),
      course: optionalStr(),
      amount: optionalNum(),
      is_active: z.boolean().optional().default(true),
      custom: z.record(jsonAny).optional().default({}),
    }),
    mapBodyToRow: (b) => ({
      applicant_name: b.applicant_name,
      phone: b.phone,
      course: b.course,
      amount: b.amount ?? null,
      is_active: b.is_active ?? true,
    }),
  },

  // ---------------- LENDERS ----------------
  "lender:ev": {
    entityName: "lender_ev",
    table: "loan_lender_ev",
    codeField: "customer_id",
    codePrefix: "LEV",
    jsonColumn: "custom_data",
    defaultStatus: "PENDING",
    searchColumns: ["customer_id","applicant_name","phone","dealer_id"],
    perms: { READ:"LEND_EV_READ", WRITE:"LEND_EV_WRITE", REVIEW:"LEND_EV_REVIEW" },
    createSchema: z.object({
      applicant_name: z.string().min(1).max(191),
      phone: optionalStr(),
      loan_amount: optionalNum(),
      rate: optionalNum(),
      tenure_months: optionalInt(),
      dealer_id: optionalStr(),
      is_active: z.boolean().optional().default(true),
      custom: z.record(jsonAny).optional().default({}),
    }),
    mapBodyToRow: (b) => ({
      applicant_name: b.applicant_name,
      phone: b.phone,
      loan_amount: b.loan_amount ?? null,
      rate: b.rate ?? null,
      tenure_months: b.tenure_months ?? null,
      dealer_id: b.dealer_id,
      is_active: b.is_active ?? true,
    }),
  },

  "lender:adikosh": {
    entityName: "lender_adikosh",
    table: "loan_lender_adikosh",
    codeField: "customer_id",
    codePrefix: "LAD",
    jsonColumn: "custom_data",
    defaultStatus: "PENDING",
    searchColumns: ["customer_id","applicant_name","phone"],
    perms: { READ:"LEND_ADIKOSH_READ", WRITE:"LEND_ADIKOSH_WRITE", REVIEW:"LEND_ADIKOSH_REVIEW" },
    createSchema: z.object({
      applicant_name: z.string().min(1).max(191),
      phone: optionalStr(),
      amount: optionalNum(),
      bureau_score: z.coerce.number().int().min(0).optional(),
      tenure_months: optionalInt(),
      is_active: z.boolean().optional().default(true),
      custom: z.record(jsonAny).optional().default({}),
    }),
    mapBodyToRow: (b) => ({
      applicant_name: b.applicant_name,
      phone: b.phone,
      amount: b.amount ?? null,
      bureau_score: b.bureau_score ?? null,
      tenure_months: b.tenure_months ?? null,
      is_active: b.is_active ?? true,
    }),
  },

  "lender:gq-fsf": {
    entityName: "lender_gq_fsf",
    table: "loan_lender_gq_fsf",
    codeField: "customer_id",
    codePrefix: "LGQF",
    jsonColumn: "custom_data",
    defaultStatus: "PENDING",
    searchColumns: ["customer_id","applicant_name","phone","scheme_name"],
    perms: { READ:"LEND_GQFSF_READ", WRITE:"LEND_GQFSF_WRITE", REVIEW:"LEND_GQFSF_REVIEW" },
    createSchema: z.object({
      applicant_name: z.string().min(1).max(191),
      phone: optionalStr(),
      amount: optionalNum(),
      scheme_name: optionalStr(),
      is_active: z.boolean().optional().default(true),
      custom: z.record(jsonAny).optional().default({}),
    }),
    mapBodyToRow: (b) => ({
      applicant_name: b.applicant_name,
      phone: b.phone,
      amount: b.amount ?? null,
      scheme_name: b.scheme_name,
      is_active: b.is_active ?? true,
    }),
  },

  "lender:gq-nonfsf": {
    entityName: "lender_gq_nonfsf",
    table: "loan_lender_gq_nonfsf",
    codeField: "customer_id",
    codePrefix: "LGQNF",
    jsonColumn: "custom_data",
    defaultStatus: "PENDING",
    searchColumns: ["customer_id","applicant_name","phone","scheme_name"],
    perms: { READ:"LEND_GQNONFSF_READ", WRITE:"LEND_GQNONFSF_WRITE", REVIEW:"LEND_GQNONFSF_REVIEW" },
    createSchema: z.object({
      applicant_name: z.string().min(1).max(191),
      phone: optionalStr(),
      amount: optionalNum(),
      scheme_name: optionalStr(),
      is_active: z.boolean().optional().default(true),
      custom: z.record(jsonAny).optional().default({}),
    }),
    mapBodyToRow: (b) => ({
      applicant_name: b.applicant_name,
      phone: b.phone,
      amount: b.amount ?? null,
      scheme_name: b.scheme_name,
      is_active: b.is_active ?? true,
    }),
  },

  "lender:bl": {
    entityName: "lender_bl",
    table: "loan_lender_bl",
    codeField: "customer_id",
    codePrefix: "LBL",
    jsonColumn: "custom_data",
    defaultStatus: "PENDING",
    searchColumns: ["customer_id","applicant_name","phone","business_name","gst_no"],
    perms: { READ:"LEND_BL_READ", WRITE:"LEND_BL_WRITE", REVIEW:"LEND_BL_REVIEW" },
    createSchema: z.object({
      applicant_name: z.string().min(1).max(191),
      phone: optionalStr(),
      business_name: optionalStr(),
      gst_no: optionalStr(),
      amount: optionalNum(),
      tenure_months: optionalInt(),
      is_active: z.boolean().optional().default(true),
      custom: z.record(jsonAny).optional().default({}),
    }),
    mapBodyToRow: (b) => ({
      applicant_name: b.applicant_name,
      phone: b.phone,
      business_name: b.business_name,
      gst_no: b.gst_no,
      amount: b.amount ?? null,
      tenure_months: b.tenure_months ?? null,
      is_active: b.is_active ?? true,
    }),
  },
};

// make bulk schema = create schema for every module
Object.keys(modules).forEach((k) => {
  modules[k].bulkItemSchema = modules[k].createSchema;
});

module.exports = modules;
