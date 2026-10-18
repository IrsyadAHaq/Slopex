const express = require('express');
const router = express.Router();
const { control, getStatus, getLogs, setMode } = require('../controllers/drainageController');
const { protect, authorize, restrictDemo } = require('../middleware/authMiddleware');

router.get('/status', protect, getStatus);
router.get('/logs', protect, getLogs);
router.post('/control', protect, authorize('admin', 'operator'), restrictDemo, control);
router.post('/mode', protect, authorize('admin', 'operator'), restrictDemo, setMode);

module.exports = router;
