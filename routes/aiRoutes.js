const express = require('express');
const router = express.Router();
const { chat, chatStream, analyzeCurrentCondition } = require('../controllers/aiController');
const { protect } = require('../middleware/authMiddleware');
const rateLimit = require('express-rate-limit');

// Rate limit AI: max 20 pesan per menit per user
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { success: false, message: 'Terlalu banyak permintaan AI. Coba lagi dalam 1 menit.' }
});

router.post('/chat', protect, aiLimiter, chat);
router.post('/chat-stream', protect, aiLimiter, chatStream);
router.post('/analyze', protect, analyzeCurrentCondition);

module.exports = router;
