const DrainageLog = require('../models/DrainageLog');
const SensorData  = require('../models/SensorData');
const { sendDownlink } = require('../utils/lora');

let io = null;
const setIO = (socketIO) => { io = socketIO; };

// In-memory state
let drainageState = {
  isOpen:       false,
  zone:         'Z1',
  lastAction:   null,
  lastActionBy: 'system',
  mode:         'auto'   // 'auto' | 'manual'
};

const getState = () => drainageState;

// ----------------------------------------------------------------
// POST /api/drainage/mode — Switch Auto/Manual
// ----------------------------------------------------------------
const setMode = async (req, res) => {
  try {
    const { mode } = req.body;
    if (!['auto', 'manual'].includes(mode))
      return res.status(400).json({ success: false, message: 'Mode harus "auto" atau "manual".' });

    if (req.user?.isDemo) {
      console.log(`[DRAINAGE] 🔒 Akun DEMO (${req.user.email}). Perubahan mode diblokir (403).`);
      return res.status(403).json({
        success: false,
        isDemo: true,
        message: '🔒 Mode Demo: Akses kontrol fisik/kritis dibatasi (Read-Only). Anda hanya memiliki izin pemantauan.',
        mode: drainageState.mode
      });
    }

    drainageState.mode = mode;

    const ioRef = io;
    if (ioRef) ioRef.emit('drainageModeUpdate', { mode });

    console.log(`[DRAINAGE] Mode diubah ke: ${mode.toUpperCase()} oleh ${req.user?.name || 'user'}`);

    res.json({
      success: true,
      message: `Mode drainase diubah ke ${mode.toUpperCase()}.`,
      mode: drainageState.mode
    });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Gagal mengubah mode drainase.', error: e.message });
  }
};

// ----------------------------------------------------------------
// POST /api/drainage/control — Manual (Admin/Operator)
// ----------------------------------------------------------------
const control = async (req, res) => {
  try {
    const { action, zone = 'Z1', reason } = req.body;
    if (!['open', 'close'].includes(action))
      return res.status(400).json({ success: false, message: 'Action harus "open" atau "close".' });

    // ===== DEMO MODE: Blocked with 403 =====
    if (req.user?.isDemo) {
      console.log(`[DRAINAGE-CONTROL] 🔒 Akun DEMO (${req.user.email}). Aksi '${action}' DITOLAK (403).`);
      return res.status(403).json({
        success: false,
        isDemo: true,
        message: '🔒 Mode Demo: Akses kontrol fisik/kritis dibatasi (Read-Only). Anda hanya memiliki izin pemantauan.',
        state: drainageState
      });
    }

    const latest = SensorData.getLatest();
    const log = await DrainageLog.create({
      action, zone,
      triggeredBy:     'manual',
      triggeredByUser: req.user?.id,
      triggeredByName: req.user?.name || 'user',
      reason:          reason || `Manual ${action} oleh ${req.user?.name || 'user'}`,
      riskScoreAtTime: latest?.riskScore || 0
    });

    drainageState = {
      ...drainageState,
      isOpen:       action === 'open',
      zone,
      lastAction:   new Date().toISOString(),
      lastActionBy: req.user?.name || 'user'
    };

    // Kirim downlink ke hardware Lora via ChirpStack
    try {
      await sendDownlink(action);
      console.log(`[DRAINAGE-CONTROL] Downlink '${action}' terkirim ke alat.`);
    } catch (dlErr) {
      console.warn(`[DRAINAGE-CONTROL] Gagal kirim downlink ke alat:`, dlErr.message);
    }

    const ioRef = io;
    if (ioRef) ioRef.emit('drainageUpdate', {
      isOpen:    drainageState.isOpen,
      zone,
      action,
      by:        req.user?.name || 'user',
      trigger:   'manual',
      mode:      drainageState.mode,
      timestamp: new Date()
    });

    res.json({
      success: true,
      message: `Drainase zona ${zone} berhasil ${action === 'open' ? 'dibuka' : 'ditutup'}.`,
      state:   drainageState,
      log
    });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Gagal mengontrol drainase.', error: e.message });
  }
};

// ----------------------------------------------------------------
// autoControl — dipanggil otomatis dari sensorController
// ----------------------------------------------------------------
const autoControl = async (action, zone = 'Z1', reason, riskScore, ioInstance) => {
  try {
    const log = await DrainageLog.create({
      action, zone,
      triggeredBy:     'auto',
      triggeredByUser: null,
      triggeredByName: 'SLOPEX-AI',
      reason,
      riskScoreAtTime: riskScore || 0
    });

    drainageState = {
      ...drainageState,
      isOpen:       action === 'open',
      zone,
      lastAction:   new Date().toISOString(),
      lastActionBy: 'SLOPEX-AI (Otomatis)'
    };

    // Kirim downlink ke hardware Lora via ChirpStack
    try {
      await sendDownlink(action);
      console.log(`[AUTO-DRAINAGE] Downlink '${action}' terkirim ke alat.`);
    } catch (dlErr) {
      console.warn(`[AUTO-DRAINAGE] Gagal kirim downlink ke alat:`, dlErr.message);
    }

    const ioRef = ioInstance || io;
    if (ioRef) ioRef.emit('drainageUpdate', {
      isOpen:    drainageState.isOpen,
      zone,
      action,
      by:        'SLOPEX-AI',
      trigger:   'auto',
      riskScore,
      mode:      drainageState.mode,
      timestamp: new Date()
    });

    return log;
  } catch (e) {
    console.error('[AUTO-DRAINAGE] Error:', e.message);
  }
};

// ----------------------------------------------------------------
// GET /api/drainage/status
// ----------------------------------------------------------------
const getStatus = (req, res) => {
  try {
    const lastLog = DrainageLog.getLatest();
    res.json({ success: true, state: drainageState, lastLog });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Gagal mengambil status drainase.' });
  }
};

// GET /api/drainage/logs
const getLogs = (req, res) => {
  try {
    const logs = DrainageLog.getLogs({ limit: parseInt(req.query.limit) || 20 });
    res.json({ success: true, count: logs.length, logs });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Gagal mengambil riwayat drainase.' });
  }
};

module.exports = { control, getStatus, getLogs, setIO, getState, autoControl, setMode };
