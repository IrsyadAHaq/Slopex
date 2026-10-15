const express = require('express');
const router = express.Router();
const { control, getStatus, getLogs, setMode } = require('../controllers/drainageController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/status', protect, getStatus);
router.get('/logs', protect, getLogs);
router.post('/control', protect, authorize('admin', 'operator'), control);
router.post('/mode', protect, authorize('admin', 'operator'), setMode);

module.exports = router;
