const express = require('express');
const router = express.Router();
const { register, login, getMe, getUsers, updateProfile, getNotifyNumbers, magicLogin, approveUser } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);
router.get('/users', protect, getUsers);
router.put('/profile', protect, updateProfile);
router.get('/notify-numbers', protect, getNotifyNumbers);
router.post('/magic-login', magicLogin);
router.get('/approve-user', approveUser);

module.exports = router;

