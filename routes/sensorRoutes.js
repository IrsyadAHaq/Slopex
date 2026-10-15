const express = require('express');
const router = express.Router();
const { receiveData, getLatest, getHistory, getStats } = require('../controllers/sensorController');
const { protect, deviceAuth } = require('../middleware/authMiddleware');

// ESP32 kirim data (pakai API Key, bukan JWT)
router.post('/data', deviceAuth, receiveData);

// Frontend & Bot WA ambil data (pakai JWT)
router.get('/latest', protect, getLatest);
router.get('/live', protect, getLatest); // Alias untuk kompatibilitas
router.get('/history', protect, getHistory);
router.get('/stats', protect, getStats);

module.exports = router;

