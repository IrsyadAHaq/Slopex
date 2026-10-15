const SensorData = require('../models/SensorData');
const Alert      = require('../models/Alert');

let io = null;
const setIO = (socketIO) => { io = socketIO; };

// Referensi ke drainageController untuk auto-drainase
let _drainageCtrl = null;
const setDrainageCtrl = (ctrl) => { _drainageCtrl = ctrl; };

// ----------------------------------------------------------------
// POST /api/sensor/data  — endpoint untuk ESP32
// Header: X-Api-Key: <DEVICE_API_KEY>
// ----------------------------------------------------------------
const receiveData = async (req, res) => {
  try {
    console.log('[API] Menerima data dari ESP32:', req.body);
    const { soilDangkal, soilDalam, magnitude, gpsLat, gpsLng, statusDevice, deviceId, vSolar, iSolar, vBuck, iBuck, vAki, iAki, statusRelay } = req.body;

    if (soilDangkal === undefined || soilDalam === undefined || magnitude === undefined)
      return res.status(400).json({ success: false, message: 'Wajib: soilDangkal, soilDalam, magnitude' });

    const doc = await SensorData.create({ deviceId, soilDangkal, soilDalam, magnitude, gpsLat, gpsLng, statusDevice, vSolar, iSolar, vBuck, iBuck, vAki, iAki, statusRelay });

    // 1. Cek threshold & buat alert
    await checkAndCreateAlert(doc);

    // 2. Auto-drainase sesuai proposal: Risk >= 75% -> buka drainase otomatis
    await checkAutoDrainage(doc);

    // 3. Broadcast real-time via Socket.IO ke semua client
    if (io) io.emit('sensorUpdate', {
      deviceId:     doc.deviceId,
      soilDangkal:  doc.soilDangkal,
      soilDalam:    doc.soilDalam,
      magnitude:    doc.magnitude,
      gpsLat:       doc.gpsLat,
      gpsLng:       doc.gpsLng,
      riskScore:    doc.riskScore,
      statusDevice: doc.statusDevice,
      vSolar:       doc.vSolar,
      iSolar:       doc.iSolar,
      vBuck:        doc.vBuck,
      iBuck:        doc.iBuck,
      vAki:         doc.vAki,
      iAki:         doc.iAki,
      statusRelay:  doc.statusRelay,
      timestamp:    doc.createdAt
    });

    res.status(201).json({
      success:   true,
      message:   'Data tersimpan.',
      riskScore: doc.riskScore,
      status:    doc.statusDevice,
      deviceId:  doc.deviceId
    });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Gagal menyimpan data.', error: e.message });
  }
};

// ----------------------------------------------------------------
// Auto-drainase logic sesuai proposal PKM-KC:
// - Buka otomatis jika Risk Score >= 75%
// - Tutup otomatis jika Risk Score < 50% (kondisi aman)
// - HANYA jika mode = 'auto' (jika manual, skip)
// ----------------------------------------------------------------
async function checkAutoDrainage(doc) {
  if (!_drainageCtrl) return;

  // CEK MODE: Jika manual, jangan auto-kontrol
  const currentState = _drainageCtrl.getState();
  if (currentState.mode === 'manual') return;

  const { riskScore, soilDangkal, soilDalam, magnitude } = doc;

  // Kondisi buka: Risk >= 75% DAN drainase belum terbuka
  if (riskScore >= 75 && !currentState.isOpen) {
    const reason = `Auto-buka: Risk Score ${riskScore}% >= 75%. ` +
      `Dangkal=${soilDangkal}%, Dalam=${soilDalam}%, Mag=${magnitude?.toFixed(2)}deg`;

    await _drainageCtrl.autoControl('open', 'Z1', reason, riskScore, io);
    console.log(`[AUTO-DRAINAGE] DIBUKA - ${reason}`);
  }

  // Kondisi tutup: Risk < 50% DAN drainase sedang terbuka
  if (riskScore < 50 && currentState.isOpen) {
    const reason = `Auto-tutup: Risk Score ${riskScore}% < 50%. Kondisi lereng kembali aman.`;
    await _drainageCtrl.autoControl('close', 'Z1', reason, riskScore, io);
    console.log(`[AUTO-DRAINAGE] DITUTUP - ${reason}`);
  }
}

// ----------------------------------------------------------------
// Alert threshold sesuai proposal
// ----------------------------------------------------------------
async function checkAndCreateAlert(doc) {
  const { soilDangkal, soilDalam, magnitude, riskScore, deviceId } = doc;

  if (riskScore >= 75) {
    const alert = await Alert.create({
      deviceId, type: 'danger', severity: 'danger',
      title:   'BAHAYA - Risiko Longsor Tinggi',
      message: `Risk: ${riskScore}%. Dangkal=${soilDangkal}%, Dalam=${soilDalam}%, Mag=${magnitude?.toFixed(2)}deg. Drainase otomatis diaktifkan.`,
      sensorSnapshot: { soilDangkal, soilDalam, magnitude, riskScore }
    });
    if (io) io.emit('newAlert', alert);

    // Otomatis Trigger Notifikasi WA Bot jika terkonfigurasi
    try {
      const whatsapp = require('../utils/whatsapp');
      if (whatsapp && typeof whatsapp.sendAlert === 'function') {
        await whatsapp.sendAlert(alert);
      }
    } catch (waErr) {
      console.warn('[WA-ALERT] Notice:', waErr.message);
    }

  } else if (riskScore >= 50) {
    const alert = await Alert.create({
      deviceId, type: 'warning', severity: 'warning',
      title:   'WASPADA - Monitoring Ditingkatkan',
      message: `Risk: ${riskScore}%. Parameter mendekati batas kritis. Pantau kondisi lereng secara berkala.`,
      sensorSnapshot: { soilDangkal, soilDalam, magnitude, riskScore }
    });
    if (io) io.emit('newAlert', alert);

    try {
      const whatsapp = require('../utils/whatsapp');
      if (whatsapp && typeof whatsapp.sendAlert === 'function') {
        await whatsapp.sendAlert(alert);
      }
    } catch (waErr) {
      console.warn('[WA-ALERT] Notice:', waErr.message);
    }
  }
}

// ----------------------------------------------------------------
// GET /api/sensor/latest
// ----------------------------------------------------------------
const getLatest = (req, res) => {
  try {
    const deviceId = req.query.deviceId;
    const data     = SensorData.getLatest(deviceId);
    res.json({ success: true, data: data || null });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Gagal mengambil data terbaru.' });
  }
};

// GET /api/sensor/history
const getHistory = (req, res) => {
  try {
    const { hours = 24, deviceId, limit = 2000 } = req.query;
    const data = SensorData.getHistory({ deviceId, hours: parseInt(hours), limit: parseInt(limit) });
    res.json({ success: true, count: data.length, data });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Gagal mengambil riwayat.' });
  }
};

// GET /api/sensor/stats
const getStats = (req, res) => {
  try {
    const stats = SensorData.getStats(req.query.deviceId);
    res.json({ success: true, stats });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Gagal mengambil statistik.' });
  }
};

module.exports = { receiveData, getLatest, getHistory, getStats, setIO, setDrainageCtrl, checkAndCreateAlert, checkAutoDrainage };

