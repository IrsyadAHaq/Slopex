const jwt  = require('jsonwebtoken');
const User = require('../models/User');

// Verifikasi JWT
const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization?.startsWith('Bearer '))
    token = req.headers.authorization.split(' ')[1];

  if (!token)
    return res.status(401).json({ success: false, message: 'Akses ditolak. Token tidak ditemukan.' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user    = await User.findById(decoded.id);

    if (!user || !user.isActive)
      return res.status(401).json({ success: false, message: 'User tidak ditemukan atau tidak aktif.' });

    req.user = User.sanitize(user);
    next();
  } catch (e) {
    return res.status(401).json({ success: false, message: 'Token tidak valid atau kadaluarsa.' });
  }
};

// Cek role
const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role))
    return res.status(403).json({ success: false, message: `Role '${req.user.role}' tidak punya akses.` });
  next();
};

// Kunci akun Demo agar tidak bisa mengubah sistem / hardware (Read-Only)
const restrictDemo = (req, res, next) => {
  if (req.user?.isDemo) {
    return res.status(403).json({
      success: false,
      isDemo: true,
      message: '🔒 Mode Demo: Akses kontrol fisik/kritis dibatasi (Read-Only). Anda hanya memiliki izin pemantauan.'
    });
  }
  next();
};

// Verifikasi API Key ESP32
const deviceAuth = (req, res, next) => {
  const key = req.headers['x-api-key'];
  if (!key || key !== process.env.DEVICE_API_KEY)
    return res.status(401).json({ success: false, message: 'API Key device tidak valid.' });
  next();
};

module.exports = { protect, authorize, restrictDemo, deviceAuth };
