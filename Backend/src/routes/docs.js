// const router = require('express').Router();
// const path = require('path');
// const fs = require('fs');
// const multer = require('multer');
// const db = require('../db');
// const { requirePerm } = require('../middleware/permissions');
// const { audit } = require('../middleware/audit');

// const uploadDir = path.join(process.cwd(), 'uploads');
// if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// const storage = multer.diskStorage({
//   destination: (_req, _file, cb) => cb(null, uploadDir),
//   filename: (_req, file, cb) => {
//     const ext = path.extname(file.originalname);
//     const base = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
//     cb(null, base + ext);
//   }
// });

// const fileFilter = (_req, file, cb) => {
//   // quick block of obvious executables
//   const bad = ['.exe', '.bat', '.cmd', '.sh'];
//   if (bad.includes(path.extname(file.originalname).toLowerCase())) {
//     return cb(new Error('Unsupported file type'));
//   }
//   cb(null, true);
// };

// const upload = multer({
//   storage,
//   fileFilter,
//   limits: { fileSize: 20 * 1024 * 1024 } // 20MB
// });

// /** GET /docs/dealers/:dealerId
//  * Needs DOCS_READ
//  * Returns [{id, filename, url, mime, size_bytes, created_at}]
//  */
// router.get('/dealers/:dealerId', requirePerm('DOCS_READ'), audit('DOCS_LIST','dealer'), async (req, res, next) => {
//   try {
//     const dealerId = Number(req.params.dealerId);
//     const rows = await db('dealer_docs').where({ dealer_id: dealerId }).orderBy('id', 'desc');
//     const withUrls = rows.map(r => ({
//       ...r,
//       url: `/uploads/${r.stored_name}`
//     }));
//     res.json(withUrls);
//   } catch (e) { next(e); }
// });

// /** POST /docs/dealers/:dealerId
//  * multipart/form-data: fields: filename, file
//  * Needs DOCS_WRITE
//  */
// router.post('/dealers/:dealerId',
//   requirePerm('DOCS_WRITE'),
//   upload.single('file'),
//   audit('DOCS_UPLOAD','dealer'),
//   async (req, res, next) => {
//     try {
//       const dealerId = Number(req.params.dealerId);
//       if (!req.file) return res.status(400).json({ error: 'File is required' });

//       const filename = (req.body.filename || req.file.originalname).toString().trim();
//       const row = {
//         dealer_id: dealerId,
//         filename,
//         stored_name: req.file.filename,
//         mime: req.file.mimetype,
//         size_bytes: req.file.size,
//         uploaded_by: req.user?.id || null
//       };
//       const [id] = await db('dealer_docs').insert(row);
//       res.locals.entityId = id;
//       res.status(201).json({ id, ...row, url: `/uploads/${row.stored_name}` });
//     } catch (e) { next(e); }
//   }
// );

// module.exports = router;



// src/routes/docs.js
const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { requirePerm } = require('../middleware/permissions');
const { audit } = require('../middleware/audit');

// --- allowlist of entities handled by Docs ---
const ALLOWED = {
  // existing
  dealer:                 { table: 'dealers',                 codeField: 'dealer_id' },
  financial_institute:    { table: 'financial_institutes',    codeField: 'fin_id' },
  landlord:               { table: 'landlords',               codeField: 'lnd_id' },

  // NEW: products
  product_ev:             { table: 'loan_product_ev',         codeField: 'customer_id' },
  product_mobile:         { table: 'loan_product_mobile',     codeField: 'customer_id' },
  product_education:      { table: 'loan_product_education',  codeField: 'customer_id' },

  // NEW: lenders
  lender_ev:              { table: 'loan_lender_ev',          codeField: 'customer_id' },
  lender_adikosh:         { table: 'loan_lender_adikosh',     codeField: 'customer_id' },
  lender_gq_fsf:          { table: 'loan_lender_gq_fsf',      codeField: 'customer_id' },
  lender_gq_nonfsf:       { table: 'loan_lender_gq_nonfsf',   codeField: 'customer_id' },
  lender_bl:              { table: 'loan_lender_bl',          codeField: 'customer_id' },
};

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

// files live in /uploads/<entity>/<id>
const uploadRoot = path.join(process.cwd(), 'uploads');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const { entity, id } = req.params;
    const dest = path.join(uploadRoot, entity, String(id));
    ensureDir(dest);
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    const preferred = (req.body?.filename || '').toString().trim();
    const safe = (preferred || file.originalname || 'file')
      .replace(/[/\\]/g, '_')
      .slice(0, 180);
    cb(null, safe);
  },
});
const upload = multer({ storage });

const r = express.Router();

/**
 * List documents for an entity/id
 * GET /docs/:entity/:id
 */
r.get('/:entity/:id',
  requirePerm('DOCS_READ'),
  audit('DOCS_LIST', 'documents'),
  async (req, res) => {
    const { entity, id } = req.params;
    if (!ALLOWED[entity]) return res.status(400).json({ error: 'bad entity' });

    const dir = path.join(uploadRoot, entity, String(id));
    ensureDir(dir);

    const entries = fs.readdirSync(dir, { withFileTypes: true })
      .filter(d => d.isFile());

    const files = entries.map(d => {
      const full = path.join(dir, d.name);
      const st = fs.statSync(full);
      return {
        id: d.name, // use filename as id
        filename: d.name,
        mime: undefined,
        size: st.size,
        url: `/uploads/${entity}/${encodeURIComponent(String(id))}/${encodeURIComponent(d.name)}`,
        created_at: st.mtime.toISOString(),
      };
    });

    res.json(files);
  }
);

/**
 * Upload a document
 * POST /docs/:entity/:id/upload
 * body: multipart/form-data (file, filename?)
 */
r.post('/:entity/:id/upload',
  requirePerm('DOCS_WRITE'),
  audit('DOCS_UPLOAD', 'documents'),
  upload.single('file'),
  async (req, res) => {
    const { entity, id } = req.params;
    if (!ALLOWED[entity]) return res.status(400).json({ error: 'bad entity' });
    if (!req.file) return res.status(400).json({ error: 'no file' });

    res.json({
      ok: true,
      filename: req.file.filename,
      size: req.file.size,
      url: `/uploads/${entity}/${encodeURIComponent(String(id))}/${encodeURIComponent(req.file.filename)}`
    });
  }
);

module.exports = r;
