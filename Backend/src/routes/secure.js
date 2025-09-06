const router = require('express').Router();
const { auth } = require('../middleware/jwt');

router.get('/ping', auth, (req, res) => {
  // proves protection works and shows who you are
  res.json({ ok: true, user: req.user });
});

module.exports = router;
