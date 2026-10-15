const express = require('express');
const router = express.Router();
const { getAlerts, acknowledgeAlert, acknowledgeAll } = require('../controllers/alertController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', protect, getAlerts);
router.put('/acknowledge-all', protect, acknowledgeAll);
router.put('/:id/acknowledge', protect, acknowledgeAlert);

module.exports = router;
