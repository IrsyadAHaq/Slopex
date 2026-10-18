const jwt  = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const User = require('../models/User');
const { sendAdminVerificationRequestEmail, sendUserApprovalNotificationEmail } = require('../utils/email');

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '30d' });

// POST /api/auth/register
const register = async (req, res) => {
  try {
    const { name, email, password, role, institution, whatsapp } = req.body;
    const user = await User.create({ name, email, password, role, institution, whatsapp });

    // Notifikasi WhatsApp bot via HTTP bridge
    try {
      const wa = require('../utils/whatsapp');
      if (wa && typeof wa.notifyUserRegistration === 'function') {
        await wa.notifyUserRegistration(user);
      }
    } catch (e) {}

    if (!user.isVerified) {
      // Kirim email permohonan ke admin (pkmslopex@gmail.com)
      sendAdminVerificationRequestEmail(user).catch(err => {
        console.error('[AUTH] Failed sending verification email:', err);
      });

      return res.status(201).json({
        success: true,
        pending: true,
        message: 'Registrasi berhasil! Permintaan akses telah dikirimkan ke pkmslopex@gmail.com. Mohon tunggu persetujuan administrator.'
      });
    }

    const token = generateToken(user.id);
    res.status(201).json({ success: true, message: 'Registrasi berhasil!', token, user: User.sanitize(user) });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};

// POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ success: false, message: 'Email dan password wajib diisi.' });

    const user = await User.findByEmail(email);
    if (!user)
      return res.status(401).json({ success: false, message: 'Email atau password salah.' });

    // Blokir hanya jika EKSPLISIT false (bukan undefined/null - backward compat)
    // Demo accounts selalu bisa masuk
    if (!user.isDemo && (user.isVerified === false || user.isActive === false)) {
      return res.status(403).json({
        success: false,
        message: 'Akun Anda belum diverifikasi/disetujui oleh tim SLOPEX. Silakan hubungi administrator.'
      });
    }

    const ok = await User.comparePassword(user.password, password);
    if (!ok)
      return res.status(401).json({ success: false, message: 'Email atau password salah.' });

    await User.updateById(user.id, { lastLogin: new Date().toISOString() });
    const token = generateToken(user.id);

    res.json({ success: true, message: 'Login berhasil!', token, user: User.sanitize(user) });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server.', error: e.message });
  }
};

// GET /api/auth/me
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.json({ success: true, user: User.sanitize(user) });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Gagal mengambil data user.' });
  }
};

// PUT /api/auth/profile
const updateProfile = async (req, res) => {
  try {
    const { name, institution, whatsapp } = req.body;
    let cleanWa = whatsapp ? String(whatsapp).replace(/\D/g, '') : '';
    if (cleanWa.startsWith('0')) cleanWa = '62' + cleanWa.slice(1);
    else if (cleanWa.startsWith('8')) cleanWa = '62' + cleanWa;

    if (cleanWa) {
      const existingPhone = await User.findByPhone(cleanWa);
      if (existingPhone && existingPhone.id !== req.user.id) {
        return res.status(400).json({ success: false, message: 'Nomor WhatsApp sudah digunakan oleh akun lain.' });
      }
    }

    const user = await User.updateById(req.user.id, { name, institution, whatsapp: cleanWa });
    res.json({ success: true, message: 'Profil berhasil diperbarui.', user: User.sanitize(user) });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message || 'Gagal memperbarui profil.' });
  }
};

// GET /api/auth/notify-numbers
const getNotifyNumbers = async (req, res) => {
  try {
    const users = await User.findAll();
    const numbers = users
      .map(u => u.whatsapp)
      .filter(num => num && num.length >= 10);
    const uniqueNumbers = [...new Set(numbers)];
    res.json({ success: true, numbers: uniqueNumbers });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Gagal mengambil data nomor WA.' });
  }
};

// POST /api/auth/magic-login (kept for backward compat)
const magicLogin = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ success: false, message: 'Token tidak valid' });

    const users = await User.findAll();
    const user = users.find(u => u.verificationToken === token && u.isVerified);

    if (!user) {
      return res.status(401).json({ success: false, message: 'Magic link kadaluwarsa atau tidak valid.' });
    }

    await User.updateById(user.id, { verificationToken: null, lastLogin: new Date().toISOString() });
    
    const jwtToken = generateToken(user.id);
    res.json({ success: true, message: 'Magic Login berhasil!', token: jwtToken, user: User.sanitize(user) });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
  }
};

// GET /api/auth/approve-user?token=xxx&id=yyy
const approveUser = async (req, res) => {
  try {
    const { token, id } = req.query;
    if (!token || !id) {
      return res.status(400).send('<h2>❌ Parameter tidak lengkap.</h2>');
    }

    let user = await User.findById(id);
    if (!user) {
      const allUsers = await User.findAll();
      user = allUsers.find(u => u.verificationToken === token || u.id === id);
    }

    if (!user) {
      return res.status(404).send('<div style="font-family:sans-serif; text-align:center; padding:50px;"><h2 style="color:#e53e3e;">❌ User Tidak Ditemukan</h2><p>Data pendaftaran user tidak ada di database server.</p></div>');
    }

    if (user.isVerified) {
      return res.send(`
        <div style="font-family:sans-serif; text-align:center; padding:50px;">
          <h2 style="color:#2563eb;">ℹ️ Akun Sudah Aktif</h2>
          <p>Akun <strong>${user.name}</strong> (${user.email}) sudah disetujui sebelumnya.</p>
          <a href="/" style="background:#2563eb; color:#fff; padding:10px 20px; text-decoration:none; border-radius:5px;">Ke Home SLOPEX</a>
        </div>
      `);
    }

    if (user.verificationToken !== token) {
      return res.status(400).send('<h2>❌ Token verifikasi tidak cocok atau kadaluwarsa.</h2>');
    }

    // Aktifkan user
    await User.updateById(user.id, {
      isVerified: true,
      isActive: true,
      verificationToken: null
    });

    // Kirim konfirmasi email ke user
    sendUserApprovalNotificationEmail(user).catch(err => console.error('[EMAIL] Error sending user notification:', err));

    return res.send(`
      <div style="font-family:sans-serif; text-align:center; padding:50px;">
        <h2 style="color:#16a34a;">✅ Akun Berhasil Disetujui & Diaktifkan!</h2>
        <p>User <strong>${user.name}</strong> (${user.email}) sebagai <strong>${user.role.toUpperCase()}</strong> sekarang sudah bisa login ke sistem SLOPEX.</p>
        <a href="/" style="background:#16a34a; color:#fff; padding:10px 20px; text-decoration:none; border-radius:5px;">Ke Dashboard SLOPEX</a>
      </div>
    `);
  } catch (e) {
    res.status(500).send('<h2>❌ Terjadi kesalahan server saat memproses verifikasi.</h2>');
  }
};

// GET /api/auth/users
const getUsers = async (req, res) => {
  try {
    const users = await User.findAll();
    const safeUsers = users.map(u => User.sanitize(u));
    res.json({ success: true, count: safeUsers.length, users: safeUsers });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Gagal mengambil data daftar pengguna.' });
  }
};

module.exports = { register, login, getMe, getUsers, updateProfile, getNotifyNumbers, magicLogin, approveUser };

