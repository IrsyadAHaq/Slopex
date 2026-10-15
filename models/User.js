const bcrypt   = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { DB }   = require('../config/db');

const UserModel = {
  collection: 'users',

  async findByEmail(email) {
    return DB.findOne(this.collection, { email: email.toLowerCase() });
  },

  async findById(id) {
    return DB.findById(this.collection, id);
  },

  async findAll() {
    return DB.find(this.collection, {});
  },

  async create({ name, email, password, role = 'viewer', institution = '', whatsapp = '', isDemo = false }) {
    // Validasi
    if (!name || !email || !password) throw new Error('Nama, email, dan password wajib diisi.');
    if (password.length < 6) throw new Error('Password minimal 6 karakter.');
    if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error('Format email tidak valid.');

    const existing = await this.findByEmail(email);
    if (existing) throw new Error('Email sudah terdaftar.');

    const hashed = await bcrypt.hash(password, 12);

    const isAutoVerified = isDemo || role === 'viewer';

    const { saveImmediately } = require('../config/db');
    const doc = await DB.insert(this.collection, {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashed,
      role,
      institution,
      whatsapp: whatsapp.replace(/\D/g, ''),
      isActive: isAutoVerified,
      isVerified: isAutoVerified,
      isDemo,
      verificationToken: isAutoVerified ? null : uuidv4(),
      lastLogin: null
    });
    saveImmediately(this.collection);
    return doc;
  },

  async updateById(id, updates) {
    const { saveImmediately } = require('../config/db');
    const res = await DB.updateById(this.collection, id, updates);
    saveImmediately(this.collection);
    return res;
  },

  async comparePassword(storedHash, candidate) {
    return bcrypt.compare(candidate, storedHash);
  },

  // Hapus field sensitif sebelum kirim ke client
  sanitize(user) {
    if (!user) return null;
    const { password, ...safe } = user;
    return safe;
  },

  async deleteAll() {
    return DB.clear(this.collection);
  }
};

module.exports = UserModel;
