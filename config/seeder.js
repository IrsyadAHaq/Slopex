const User = require('../models/User');

/**
 * Auto-seeder untuk akun demonstrasi awal
 */
async function autoSeedDemoAccounts() {
  // Tunggu sebentar agar DB sempat dimuat
  await new Promise(r => setTimeout(r, 1000));

  try {
    const existingUsers = await User.findAll();
    if (existingUsers && existingUsers.length > 0) {
      console.log('[SEED] Users sudah ada di database, skip auto-seed.');
      return;
    }

    console.log('[SEED] Tidak ada user ditemukan, membuat demo accounts...');

    await User.create({
      name: 'Admin (Demo)',
      email: 'admin@slopex.id',
      password: 'slopex2026',
      role: 'admin',
      institution: 'Universitas Padjadjaran',
      whatsapp: '6285899104368',
      isDemo: true
    });

    await User.create({
      name: 'Operator (Demo)',
      email: 'operator@slopex.id',
      password: 'slopex2026',
      role: 'operator',
      institution: 'Universitas Padjadjaran',
      whatsapp: '6283847550740',
      isDemo: true
    });

    await User.create({
      name: 'Viewer (Demo)',
      email: 'viewer@slopex.id',
      password: 'slopex2026',
      role: 'viewer',
      institution: 'Universitas Padjadjaran',
      whatsapp: '6283866856454',
      isDemo: true
    });

    console.log('[SEED] Demo accounts berhasil dibuat:');
    console.log('   admin@slopex.id | operator@slopex.id | viewer@slopex.id');
    console.log('   Password: slopex2026');
  } catch (e) {
    console.error('[SEED] Auto-seed gagal:', e.message);
  }
}

module.exports = { autoSeedDemoAccounts };
