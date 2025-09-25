const express = require('express');
const router = express.Router();

router.get('/health', (req, res) => {
  res.send({
    'message': 'API is up',
  });
});

module.exports = router;
