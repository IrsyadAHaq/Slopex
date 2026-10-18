const User = require('../models/User');
const { DB, saveImmediately } = require('./db');
const riskEngine = require('../utils/riskEngine');

/**
 * Auto-seeder untuk data time-series sensor realistis 14 hari
 * Aligned with Random Forest Model (Slope 35%, Rain 30%, VWC 25%, Tilt 10%)
 */
async function autoSeedSensorData() {
  try {
    const existing = DB.find('sensor_data', {});
    const now = Date.now();
    const threeDaysAgo = now - 3 * 24 * 60 * 60 * 1000;
    
    // Cek apakah data sudah cukup dan memiliki data baru dalam 3 hari terakhir
    const hasRecentData = existing.some(d => new Date(d.createdAt).getTime() >= threeDaysAgo);
    if (existing.length >= 200 && hasRecentData) {
      console.log(`[SEED] Sensor data sudah lengkap (${existing.length} entri), skip auto-seed sensor.`);
      return;
    }

    console.log('[SEED] Menyiapkan data riwayat time-series 14 hari sesuai spesifikasi proposal SLOPEX...');

    // Buat data 14 hari dengan interval 30 menit (total 672 data points)
    const TOTAL_POINTS = 672;
    const INTERVAL_MS = 30 * 60 * 1000;
    const docs = [];

    for (let i = 0; i < TOTAL_POINTS; i++) {
      const timestamp = new Date(now - (TOTAL_POINTS - 1 - i) * INTERVAL_MS);
      const dayProgress = i / TOTAL_POINTS; // 0.0 s.d. 1.0 (Hari 1 s.d. Hari 14)
      const hour = timestamp.getHours();

      // Skenario 14 hari:
      // Hari 0 - 4   (0.00 - 0.28): Musim kering, stabil AMAN
      // Hari 5 - 7   (0.29 - 0.50): Hujan mulai turun, masuk WASPADA
      // Hari 8 - 10  (0.51 - 0.72): Badai hujan tropis ekstrem, kadar air jenuh, pergeseran lereng, status BAHAYA
      //                              -> Katup drainase aktif otomatis
      // Hari 11 - 13 (0.73 - 0.92): Air terkuras via drainase, lereng stabil kembali, status turun ke WASPADA -> AMAN
      // Hari 14      (0.93 - 1.00): Kondisi stabil terkini di lapangan (siap dimonitoring)

      let baseSoilDangkal = 34.0;
      let baseSoilDalam = 37.0;
      let baseTilt = 0.25;
      let rainIntensity = 1200; // mm/tahun
      let isRelayActive = false;

      if (dayProgress < 0.29) {
        // Fase 1: Kering
        baseSoilDangkal = 32.0 + Math.sin(i * 0.1) * 2.5;
        baseSoilDalam = 36.0 + Math.sin(i * 0.08) * 1.8;
        baseTilt = 0.22 + Math.cos(i * 0.15) * 0.05;
        rainIntensity = 800 + Math.sin(i * 0.2) * 200;
      } else if (dayProgress < 0.51) {
        // Fase 2: Hujan awal
        const p = (dayProgress - 0.29) / 0.22;
        baseSoilDangkal = 35.0 + p * 20.0 + Math.sin(i * 0.2) * 3.0;
        baseSoilDalam = 38.0 + p * 16.0 + Math.sin(i * 0.15) * 2.0;
        baseTilt = 0.25 + p * 0.35 + Math.cos(i * 0.2) * 0.08;
        rainIntensity = 1600 + p * 600;
      } else if (dayProgress < 0.73) {
        // Fase 3: Badai puncak (Bahaya longsor)
        const p = (dayProgress - 0.51) / 0.22;
        baseSoilDangkal = 72.0 + Math.sin(p * Math.PI) * 11.5 + (Math.random() * 2.0);
        baseSoilDalam = 68.0 + Math.sin(p * Math.PI) * 11.0 + (Math.random() * 1.5);
        baseTilt = 0.70 + Math.sin(p * Math.PI) * 1.05 + (Math.random() * 0.15);
        rainIntensity = 2400 + Math.sin(p * Math.PI) * 500;
        isRelayActive = baseSoilDangkal >= 75.0;
      } else if (dayProgress < 0.93) {
        // Fase 4: Drainase bekerja mengalirkan air
        const p = (dayProgress - 0.73) / 0.20;
        baseSoilDangkal = 75.0 - p * 34.0 + Math.sin(i * 0.2) * 2.0;
        baseSoilDalam = 72.0 - p * 28.0 + Math.sin(i * 0.15) * 1.5;
        baseTilt = 1.20 - p * 0.82 + Math.cos(i * 0.2) * 0.05;
        rainIntensity = 1800 - p * 800;
        isRelayActive = p < 0.35; // Masih aktif di awal fase pembuangan
      } else {
        // Fase 5: Kondisi live terkini (Aman & terkendali)
        const p = (dayProgress - 0.93) / 0.07;
        baseSoilDangkal = 42.0 + Math.sin(i * 0.3) * 1.8;
        baseSoilDalam = 45.5 + Math.cos(i * 0.25) * 1.5;
        baseTilt = 0.32 + Math.sin(i * 0.3) * 0.04;
        rainIntensity = 1100 + Math.cos(i * 0.4) * 150;
      }

      // Evaluasi melalui Random Forest Engine resmi
      const evalRes = riskEngine.evaluateRisk({
        soilDangkal: baseSoilDangkal,
        soilDalam: baseSoilDalam,
        magnitude: baseTilt,
        slope: 30.0,
        rainfall: rainIntensity
      });

      // Profil daya realistis Solar Panel & Baterai Aki 12V
      let vSolar = 0.1;
      let iSolar = 0;
      let vAki = 12.5;
      let iAki = -120; // mAh discharge saat malam

      if (hour >= 6 && hour <= 18) {
        // Siklus matahari siang hari
        const sunIntensity = Math.sin(((hour - 6) / 12) * Math.PI);
        vSolar = parseFloat((12.8 + sunIntensity * 5.2 + (Math.random() * 0.3)).toFixed(2));
        iSolar = Math.round(sunIntensity * 850 + Math.random() * 40);
        vAki = parseFloat((12.7 + sunIntensity * 1.4 + (Math.random() * 0.15)).toFixed(2));
        iAki = Math.round(sunIntensity * 650 - 100); // Pengisian positif
      } else {
        // Malam hari
        vSolar = parseFloat((0.08 + Math.random() * 0.12).toFixed(2));
        iSolar = 0;
        vAki = parseFloat((12.4 + Math.random() * 0.25).toFixed(2));
        iAki = -Math.round(90 + Math.random() * 50);
      }

      docs.push({
        deviceId: 'SLOPEX-001',
        soilDangkal: parseFloat(baseSoilDangkal.toFixed(1)),
        soil1: parseFloat(baseSoilDangkal.toFixed(1)),
        soilDalam: parseFloat(baseSoilDalam.toFixed(1)),
        soil2: parseFloat(baseSoilDalam.toFixed(1)),
        vwc: evalRes.features.vwc,
        magnitude: parseFloat(baseTilt.toFixed(2)),
        tiltX: parseFloat(baseTilt.toFixed(2)),
        slopeDeg: 30.0,
        rainfall: parseFloat(rainIntensity.toFixed(0)),
        weightedScore: evalRes.weightedScore,
        scores: evalRes.scores,
        probabilities: evalRes.probabilities,
        riskScore: evalRes.riskScore,
        statusDevice: evalRes.statusDevice,
        statusRelay: isRelayActive || evalRes.riskScore >= 75 ? 'MENYALA (AKTIF)' : 'MATI (STANDBY)',
        drainageActive: isRelayActive || evalRes.riskScore >= 75,
        vSolar,
        iSolar,
        vAki,
        iAki,
        gpsLat: -6.92556,
        gpsLng: 107.77383,
        createdAt: timestamp.toISOString(),
        updatedAt: timestamp.toISOString()
      });
    }

    // Bersihkan data lama jika hanya ada sedikit data dummy usang
    if (existing.length < 50) {
      await DB.clear('sensor_data');
    }
    await DB.insertMany('sensor_data', docs);
    saveImmediately('sensor_data');

    console.log(`[SEED] Berhasil membuat ${docs.length} data sensor time-series 14 hari realistis.`);
  } catch (e) {
    console.error('[SEED] Gagal seed sensor data:', e.message);
  }
}

/**
 * Auto-seeder untuk akun demonstrasi awal
 */
async function autoSeedDemoAccounts() {
  // Tunggu sebentar agar DB sempat dimuat
  await new Promise(r => setTimeout(r, 1000));

  try {
    const existingUsers = await User.findAll();
    if (!existingUsers || existingUsers.length === 0) {
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
    }

    // Jalankan seeding data time-series sensor
    await autoSeedSensorData();

  } catch (e) {
    console.error('[SEED] Auto-seed gagal:', e.message);
  }
}

module.exports = { autoSeedDemoAccounts, autoSeedSensorData };
