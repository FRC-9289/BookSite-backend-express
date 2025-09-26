const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const router = express.Router();

router.get('/health', authMiddleware, (req, res) => {
  res.json({ status: 'OK', user: req.user });
});

module.exports = router;
