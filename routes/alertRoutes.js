const express = require('express');
const router = express.Router();
const { getAlerts, acknowledgeAlert, acknowledgeAll } = require('../controllers/alertController');
const { protect, restrictDemo } = require('../middleware/authMiddleware');

router.get('/', protect, getAlerts);
router.put('/acknowledge-all', protect, restrictDemo, acknowledgeAll);
router.put('/:id/acknowledge', protect, restrictDemo, acknowledgeAlert);

module.exports = router;
