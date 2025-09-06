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



const path = require('path');
const fs = require('fs');
const multer = require('multer');
const express = require('express');
const db = require('../db');
const { requirePerm } = require('../middleware/permissions');
const { audit } = require('../middleware/audit');

const router = express.Router();
const uploadDir = path.join(process.cwd(),'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir,{ recursive:true });

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, uploadDir),
  filename: (_, file, cb) => {
    const ts = Date.now();
    const safe = file.originalname.replace(/[^\w.\-]+/g,'_');
    cb(null, `${ts}_${safe}`);
  }
});
const upload = multer({ storage });

const ALLOWED = new Set(['dealer','financial_institute','landlord']);

router.get('/:entity/:id', requirePerm('DOCS_READ'), audit('DOCS_LIST','*'), async (req,res,next)=>{
  try {
    const { entity, id } = req.params;
    if (!ALLOWED.has(entity)) return res.status(400).json({ error:'bad entity' });
    const rows = await db('documents').where({ entity, entity_id:id }).orderBy('id','desc');
    const base = `${req.protocol}://${req.get('host')}`;
    res.json(rows.map(r => ({ ...r, url: `${base}/uploads/${r.stored_name}` })));
  } catch(e){ next(e); }
});

router.post('/:entity/:id/upload',
  requirePerm('DOCS_WRITE'), upload.single('file'), audit('DOCS_UPLOAD','*'),
  async (req,res,next)=>{
    try {
      const { entity, id } = req.params;
      if (!ALLOWED.has(entity)) return res.status(400).json({ error:'bad entity' });
      if (!req.file) return res.status(400).json({ error:'file required' });

      const doc = {
        entity, entity_id: Number(id),
        filename: req.body?.filename || req.file.originalname,
        stored_name: req.file.filename,
        size: req.file.size,
        mime: req.file.mimetype,
        uploaded_by: req.user?.id || null
      };
      const [docId] = await db('documents').insert(doc);
      res.status(201).json({ id: docId, ...doc });
    } catch(e){ next(e); }
});
module.exports = router;

