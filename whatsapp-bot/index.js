const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const axios = require('axios');
const path = require('path');
const fs = require('fs');
const express = require('express');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const API_URL = process.env.SLOPEX_API_URL || 'http://localhost:3000/api';
const POLL_INTERVAL = parseInt(process.env.POLL_INTERVAL) || 5000;
const NOTIFY_NUMBERS = (process.env.NOTIFY_NUMBERS || '').split(',').map(n => n.trim() + '@c.us');
const RISK_WARNING = parseInt(process.env.RISK_THRESHOLD_WARNING) || 50;
const RISK_DANGER = parseInt(process.env.RISK_THRESHOLD_DANGER) || 75;
const COOLDOWN_MS = (parseInt(process.env.NOTIF_COOLDOWN_MINUTES) || 5) * 60000;
const DAILY_REPORT_ENABLED = process.env.DAILY_REPORT_ENABLED === 'true';
const DAILY_REPORT_TIME = process.env.DAILY_REPORT_TIME || '07:00';

let lastAlertTime = 0;
let lastDailyReportDay = -1;
let jwtToken = null;
let knownUserIds = new Set();

const isDocker = process.env.IS_DOCKER === 'true';

const client = new Client({
    authStrategy: new LocalAuth({ dataPath: path.join(__dirname, '.wwebjs_auth') }),
    puppeteer: { 
        executablePath: isDocker ? '/usr/bin/chromium' : '/usr/bin/firefox',
        headless: true,
        args: [
            '--no-sandbox', 
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu'
        ] 
    }
});

function formatWhatsAppNumber(num) {
    let clean = (num || '').toString().replace(/\D/g, '');
    if (!clean) return '';
    if (clean.startsWith('0')) {
        clean = '62' + clean.slice(1);
    }
    if (!clean.endsWith('@c.us')) {
        clean = clean + '@c.us';
    }
    return clean;
}

async function getUsers() {
    const usersFile = path.join(__dirname, '..', 'data', 'users.json');
    try {
        if (fs.existsSync(usersFile)) {
            const raw = fs.readFileSync(usersFile, 'utf8');
            return JSON.parse(raw);
        }
    } catch (e) {
        console.error('[SLOPEX WA BOT] Gagal membaca users.json:', e.message);
    }
    return [];
}

async function getAllRecipients() {
    const users = await getUsers();
    const numbersSet = new Set();

    for (const u of users) {
        if (u.whatsapp) {
            const formatted = formatWhatsAppNumber(u.whatsapp);
            if (formatted) numbersSet.add(formatted);
        }
    }
    for (const num of NOTIFY_NUMBERS) {
        if (num && num !== '@c.us') {
            const formatted = formatWhatsAppNumber(num);
            if (formatted) numbersSet.add(formatted);
        }
    }
    return Array.from(numbersSet);
}

async function initKnownUsers() {
    const users = await getUsers();
    users.forEach(u => knownUserIds.add(u.id));
    console.log(`[SLOPEX WA BOT] Berhasil memuat ${knownUserIds.size} user terdaftar.`);
}

async function sendConnectionNotification() {
    console.log('[SLOPEX WA BOT] Mengirim notifikasi aktif ke pengguna terdaftar...');
    const recipients = await getAllRecipients();
    
    for (const target of recipients) {
        const msg = `🤖 *SLOPEX INFO BOT* 🤖\n`
            + `=========================\n`
            + `✅ *Koneksi Berhasil!*\n\n`
            + `Bot WhatsApp SLOPEX (Smart Landslide Prevention System) saat ini telah aktif dan terhubung dengan server utama.\n\n`
            + `Sistem pemantauan lereng Jatinangor saat ini berjalan normal dan mematuhi standar *SNI 8235:2017*.\n\n`
            + `Anda akan menerima notifikasi otomatis jika:\n`
            + `1. Status lereng berubah ke *WASPADA* ⚠️\n`
            + `2. Status lereng berubah ke *BAHAYA* 🚨\n`
            + `3. Laporan harian terjadwal dikirim 📊\n\n`
            + `*Menu Interaktif:* (Balas chat ini)\n`
            + `- Ketik *!status* untuk mengecek kondisi sensor saat ini.\n`
            + `- Ketik *!bantuan* untuk info detail standar mitigasi.\n\n`
            + `_Terima kasih telah menggunakan sistem SLOPEX._\n`
            + `=========================`;
        try {
            await client.sendMessage(target, msg);
            console.log(`[SLOPEX WA BOT] Notifikasi aktif dikirim ke: ${target}`);
        } catch (err) {
            console.error(`[SLOPEX WA BOT] Gagal mengirim notifikasi ke ${target}:`, err.message);
        }
    }
}

async function broadcastEmergencyAlert(alertObj) {
    const now = Date.now();
    if (now - lastAlertTime < COOLDOWN_MS) {
        console.log('[SLOPEX WA BOT] Alert masih dalam periode cooldown, skip broadcast.');
        return;
    }

    const recipients = await getAllRecipients();
    if (recipients.length === 0) return;

    const snap = alertObj.sensorSnapshot || {};
    const riskScore = snap.riskScore != null ? snap.riskScore : (alertObj.riskScore || 0);
    const s1 = snap.soilDangkal != null ? snap.soilDangkal : (snap.soil1 != null ? snap.soil1 : 0);
    const s2 = snap.soilDalam != null ? snap.soilDalam : (snap.soil2 != null ? snap.soil2 : 0);
    const vwc = snap.vwc != null ? snap.vwc : ((s1 + s2) / 2);
    const mag = snap.magnitude != null ? snap.magnitude : 0;
    const slope = snap.slopeDeg != null ? snap.slopeDeg : 30;
    const rain = snap.rainfall != null ? snap.rainfall : 2000;
    const isDanger = alertObj.severity === 'danger' || riskScore >= RISK_DANGER;

    const msg = `🚨 *SLOPEX PERINGATAN DINI* 🚨\n`
        + `=========================\n`
        + (isDanger ? `🔴 *STATUS: BAHAYA (AWAS)*\n` : `🟡 *STATUS: WASPADA (SIAGA)*\n`)
        + `${alertObj.message || alertObj.title || 'Terdeteksi peningkatan risiko longsor di area pantauan.'}\n\n`
        + `📊 *DATA SENSOR & GEOTEKNIK:*\n`
        + `- Risk Score: *${riskScore}%*\n`
        + `- VWC (Kadar Air Rata-rata): *${vwc.toFixed(1)}%*\n`
        + `- Perubahan Kemiringan (Tilt): *${typeof mag === 'number' ? mag.toFixed(2) : mag}°*\n`
        + `- Sudut Lereng Asli (Slope): ${slope}°\n`
        + `- Curah Hujan Wilayah: ${rain} mm/tahun\n\n`
        + `⚠️ *Instruksi Mitigasi (SNI 8235:2017):*\n`
        + (isDanger
            ? `• Segera evakuasi ke titik kumpul aman!\n• Sirine & drainase otomatis diaktifkan!`
            : `• Periksa area lereng & sistem drainase.`) + `\n`
        + `=========================`;

    console.log(`[SLOPEX WA BOT] Broadcasting darurat ke ${recipients.length} nomor...`);
    for (const target of recipients) {
        try {
            await client.sendMessage(target, msg);
            console.log(`[SLOPEX WA BOT] Emergency alert sent to ${target}`);
        } catch (err) {
            console.error(`[SLOPEX WA BOT] Gagal mengirim alert ke ${target}:`, err.message);
        }
    }
    lastAlertTime = now;
}

function watchNewUsers() {
    const usersFile = path.join(__dirname, '..', 'data', 'users.json');
    console.log('[SLOPEX WA BOT] Memulai watcher untuk pendaftaran user baru...');
    
    fs.watchFile(usersFile, { interval: 1000 }, async (curr, prev) => {
        if (curr.mtime > prev.mtime) {
            console.log('[SLOPEX WA BOT] Terdeteksi perubahan pada database user, memeriksa pendaftaran baru...');
            const users = await getUsers();
            for (const user of users) {
                if (!knownUserIds.has(user.id)) {
                    knownUserIds.add(user.id);

                    if (!user.isVerified) {
                        const adminMsg = `⚠️ *PERMOHONAN AKUN BARU SLOPEX* ⚠️\n`
                            + `=========================\n`
                            + `Ada pendaftaran akun baru yang membutuhkan verifikasi:\n\n`
                            + `👤 *Nama:* ${user.name}\n`
                            + `📧 *Email:* ${user.email}\n`
                            + `🛡️ *Role:* ${user.role.toUpperCase()}\n`
                            + `🏛️ *Instansi:* ${user.institution || '-'}\n`
                            + `📱 *WA:* ${user.whatsapp || '-'}\n\n`
                            + `Silakan periksa & verifikasi akun di menu Pengaturan SLOPEX Dashboard.\n`
                            + `=========================`;

                        for (const num of NOTIFY_NUMBERS) {
                            if (!num || num === '@c.us') continue;
                            try {
                                await client.sendMessage(formatWhatsAppNumber(num), adminMsg);
                            } catch (e) {
                                console.error(`[SLOPEX WA BOT] Gagal notif verifikasi ke ${num}:`, e.message);
                            }
                        }
                    }

                    if (user.whatsapp) {
                        const target = formatWhatsAppNumber(user.whatsapp);
                        if (!target) continue;
                        const msgStr = user.isVerified 
                            ? `🤖 *SLOPEX INFO BOT* 🤖\n`
                                + `=========================\n`
                                + `🎉 *Selamat Bergabung!*\n\n`
                                + `Halo *${user.name}*, nomor Anda telah terdaftar dalam sistem pemantauan mitigasi bencana tanah longsor *SLOPEX* (Universitas Padjadjaran PKM-KC 2026).\n\n`
                                + `Nomor ini akan otomatis menerima peringatan dini jika terdeteksi aktivitas pergerakan tanah atau curah hujan tinggi yang berisiko pada lereng pantauan sesuai standar *SNI 8235:2017*.\n\n`
                                + `*Menu Interaktif:* (Balas chat ini)\n`
                                + `- Ketik *!status* untuk mengecek kondisi sensor saat ini.\n`
                                + `- Ketik *!bantuan* untuk info detail standar mitigasi.\n\n`
                                + `_Mari bersama-sama menjaga keselamatan lingkungan!_\n`
                                + `=========================`
                            : `🤖 *SLOPEX INFO BOT* 🤖\n`
                                + `=========================\n`
                                + `⏳ *Permohonan Pendaftaran Terkirim*\n\n`
                                + `Halo *${user.name}*, permohonan pendaftaran akun *${user.role.toUpperCase()}* Anda telah kami terima.\n\n`
                                + `Akun Anda saat ini dalam proses verifikasi oleh Tim Administrator SLOPEX. Anda akan menerima notifikasi setelah akun disetujui.\n\n`
                                + `_Terima kasih atas partisipasi Anda._\n`
                                + `=========================`;

                        try {
                            await client.sendMessage(target, msgStr);
                            console.log(`[SLOPEX WA BOT] Notifikasi pendaftaran dikirim ke: ${user.name} (${target})`);
                        } catch (err) {
                            console.error(`[SLOPEX WA BOT] Gagal mengirim notifikasi pendaftaran ke ${user.name}:`, err.message);
                        }
                    }
                }
            }
        }
    });
}

client.on('qr', (qr) => {
    console.log('\n[SLOPEX WA BOT] Silakan scan QR Code di bawah menggunakan WhatsApp Anda:');
    qrcode.generate(qr, { small: true });
});

client.on('ready', async () => {
    console.log('[SLOPEX WA BOT] Bot WhatsApp telah berhasil terhubung dan siap!');
    await initKnownUsers();
    startPolling();
    await sendConnectionNotification();
    watchNewUsers();
});

client.on('message', async msg => {
    const text = msg.body.trim().toLowerCase();
    
    if (text === '!status') {
        const resData = await fetchSensorData();
        if (!resData || !resData.data) {
            msg.reply('❌ Gagal mengambil data sensor dari server. Belum ada data sensor masuk atau server sedang diproses.');
            return;
        }
        
        const sensor = resData.data;
        const riskScore = sensor.riskScore || 0;
        const soilDangkal = sensor.soilDangkal || sensor.soil1 || 0;
        const soilDalam = sensor.soilDalam || sensor.soil2 || 0;
        const magnitude = sensor.magnitude || sensor.tiltX || 0;
        const statusDevice = sensor.statusDevice || (riskScore >= 75 ? 'BAHAYA' : riskScore >= 50 ? 'WASPADA' : 'AMAN');
        const vSolar = sensor.vSolar != null ? sensor.vSolar : '-';
        const vAki = sensor.vAki != null ? sensor.vAki : '-';
        const statusRelay = sensor.statusRelay || 'MATI (STANDBY)';

        const statusStr = riskScore < 50 ? '✅ AMAN (NORMAL)' : (riskScore >= 75 ? '🚨 BAHAYA (AWAS)' : '⚠️ WASPADA (SIAGA)');
        
        const vwc = sensor.vwc != null ? sensor.vwc : ((soilDangkal + soilDalam) / 2);
        const slope = sensor.slopeDeg != null ? sensor.slopeDeg : 30;
        const rain = sensor.rainfall != null ? sensor.rainfall : 2000;

        const replyMsg = `📊 *STATUS SENSOR & RISIKO SLOPEX TERKINI* 📊\n`
            + `=========================\n`
            + `🔴 *Kondisi Lereng:* ${statusStr}\n`
            + `- Risk Score: *${riskScore}%* (Klasifikasi: ${statusDevice})\n`
            + `- VWC (Kadar Air Tanah): ${vwc.toFixed(1)}%\n`
            + `- Soil Atas / Bawah: ${soilDangkal}% / ${soilDalam}%\n`
            + `- Perubahan Sudut (Tilt): ${typeof magnitude === 'number' ? magnitude.toFixed(2) : magnitude}°\n`
            + `- Kemiringan Lereng Asli: ${slope}°\n`
            + `- Curah Hujan Wilayah: ${rain} mm/tahun\n`
            + `- Tegangan Solar / Aki: ${vSolar}V / ${vAki}V\n`
            + `- Status Katup Drainase: ${statusRelay}\n`
            + `=========================\n`
            + `_Data diperbarui secara real-time dari model Random Forest & SNI 8235._`;
        msg.reply(replyMsg);
    } else if (text === '!bantuan') {
        const replyMsg = `ℹ️ *PANDUAN MITIGASI SLOPEX (SNI 8235:2017)* ℹ️\n`
            + `=========================\n`
            + `*Tingkat Peringatan Dini & Tindakan:*\n\n`
            + `🟡 *WASPADA (Tingkat 1)*\n`
            + `Bunyi sirine lambat. Warga bersiap mengemasi barang-barang berharga dan bersiap evakuasi.\n\n`
            + `🟠 *SIAGA (Tingkat 2)*\n`
            + `Bunyi sirine sedang. Evakuasi kelompok rentan (lansia, anak-anak, disabilitas) dimulai.\n\n`
            + `🔴 *AWAS / BAHAYA (Tingkat 3)*\n`
            + `Bunyi sirine cepat. Evakuasi menyeluruh warga ke titik kumpul aman.\n\n`
            + `=========================\n`
            + `Sistem SLOPEX didesain oleh Universitas Padjadjaran (PKM-KC 2026).`;
        msg.reply(replyMsg);
    }
});

client.on('auth_failure', msg => {
    console.error('[SLOPEX WA BOT] Autentikasi Gagal:', msg);
});

async function loginToSlopex() {
    try {
        const res = await axios.post(`${API_URL}/auth/login`, {
            email: process.env.SLOPEX_EMAIL || 'admin@slopex.id',
            password: process.env.SLOPEX_PASSWORD || 'slopex2026'
        });
        jwtToken = res.data.token;
        console.log('[SLOPEX WA BOT] Berhasil login ke sistem SlopeX.');
    } catch (err) {
        console.error('[SLOPEX WA BOT] Gagal login ke SlopeX:', err.response?.data || err.message);
    }
}

async function fetchSensorData() {
    if (!jwtToken) await loginToSlopex();
    if (!jwtToken) return null;

    try {
        const res = await axios.get(`${API_URL}/sensor/latest`, {
            headers: { Authorization: `Bearer ${jwtToken}` }
        });
        return res.data;
    } catch (err) {
        if (err.response?.status === 401) {
            console.log('[SLOPEX WA BOT] Token expired, mencoba login ulang...');
            jwtToken = null;
        }
        return null;
    }
}

async function startPolling() {
    setInterval(async () => {
        const resData = await fetchSensorData();
        if (!resData || !resData.data) return;

        const sensorData = resData.data;
        const { riskScore = 0, soilDangkal = 0, soil1 = 0, soilDalam = 0, soil2 = 0, magnitude = 0, statusDevice } = sensorData;
        const s1 = soilDangkal || soil1 || 0;
        const s2 = soilDalam || soil2 || 0;
        const mag = magnitude || 0;

        // Cek threshold
        if (riskScore >= RISK_WARNING) {
            await broadcastEmergencyAlert({
                title: 'PERINGATAN DINI RISK THRESHOLD',
                message: `Terdeteksi peningkatan risiko longsor di area pantauan (${riskScore}%).`,
                severity: riskScore >= RISK_DANGER ? 'danger' : 'warning',
                sensorSnapshot: { riskScore, soilDangkal: s1, soilDalam: s2, magnitude: mag }
            });
        }

        // Cek Laporan Harian
        if (DAILY_REPORT_ENABLED) {
            const date = new Date();
            const currentHour = date.getHours().toString().padStart(2, '0');
            const currentMinute = date.getMinutes().toString().padStart(2, '0');
            const currentTimeStr = `${currentHour}:${currentMinute}`;

            if (currentTimeStr === DAILY_REPORT_TIME && date.getDate() !== lastDailyReportDay) {
                const statusStr = riskScore < 50 ? '✅ AMAN (NORMAL)' : (riskScore >= 75 ? '🚨 BAHAYA' : '⚠️ WASPADA');
                const dailyMsg = `*SLOPEX LAPORAN HARIAN*\n\n`
                    + `Berikut adalah ringkasan kondisi lereng pagi ini (${currentTimeStr}):\n\n`
                    + `📊 *STATUS: ${statusStr}*\n`
                    + `- Risk Score: *${riskScore}%*\n`
                    + `- Soil Dangkal: ${s1}%\n`
                    + `- Soil Dalam: ${s2}%\n`
                    + `- Kemiringan (Mag): ${mag}°\n\n`
                    + `Sistem berjalan normal. Semoga hari Anda menyenangkan!`;

                console.log(`[SLOPEX WA BOT] Mengirim laporan harian ke pengguna...`);
                const recipients = await getAllRecipients();
                for (let number of recipients) {
                    try {
                        await client.sendMessage(number, dailyMsg);
                    } catch (e) { }
                }
                lastDailyReportDay = date.getDate();
            }
        }

    }, POLL_INTERVAL);
}

// ===== BRIDGE HTTP SERVER UNTUK PROSES UTAMA BACKEND =====
const botApp = express();
botApp.use(express.json());

botApp.post('/send-alert', async (req, res) => {
    try {
        const { title, message, severity, sensorSnapshot } = req.body;
        console.log(`[WA-BRIDGE] Pemicu Notifikasi Darurat Diterima: ${title}`);
        await broadcastEmergencyAlert({ title, message, severity, sensorSnapshot });
        res.json({ success: true, message: 'Alert disiarkan ke WhatsApp' });
    } catch (e) {
        console.error('[WA-BRIDGE] Error kirim alert:', e.message);
        res.status(500).json({ success: false, error: e.message });
    }
});

botApp.post('/user-registered', async (req, res) => {
    try {
        console.log('[WA-BRIDGE] User terdaftar baru diterima via HTTP bridge.');
        await initKnownUsers();
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

const BOT_PORT = process.env.WA_BOT_PORT || 3001;
botApp.listen(BOT_PORT, () => {
    console.log(`[SLOPEX WA BOT] Bridge HTTP Server aktif di port ${BOT_PORT}`);
});

// Bersihkan Chromium lock files jika tertinggal dari sesi sebelumnya
const sessionDir = path.join(__dirname, '.wwebjs_auth', 'session');
if (fs.existsSync(sessionDir)) {
    try {
        const files = fs.readdirSync(sessionDir);
        for (const file of files) {
            if (file.startsWith('Singleton')) {
                fs.unlinkSync(path.join(sessionDir, file));
                console.log(`[SLOPEX WA BOT] Menghapus lock file: ${file}`);
            }
        }
    } catch (err) {
        console.warn('[SLOPEX WA BOT] Gagal membersihkan lock files:', err.message);
    }
}

console.log('[SLOPEX WA BOT] Memulai inisialisasi Bot WhatsApp...');
client.initialize();

