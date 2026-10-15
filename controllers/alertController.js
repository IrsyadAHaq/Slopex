const Alert = require('../models/Alert');

const getAlerts = (req, res) => {
  try {
    const { acknowledged, limit = 20 } = req.query;
    const opts = { limit: parseInt(limit) };
    if (acknowledged !== undefined) opts.acknowledged = acknowledged === 'true';
    const alerts     = Alert.find(opts);
    const unreadCount = Alert.countUnread();
    res.json({ success: true, count: alerts.length, unreadCount, alerts });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Gagal mengambil alert.' });
  }
};

const acknowledgeAlert = async (req, res) => {
  try {
    const alert = await Alert.acknowledgeById(req.params.id, req.user.id);
    if (!alert) return res.status(404).json({ success: false, message: 'Alert tidak ditemukan.' });
    res.json({ success: true, alert });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Gagal mengakui alert.' });
  }
};

const acknowledgeAll = async (req, res) => {
  try {
    await Alert.acknowledgeAll(req.user.id);
    res.json({ success: true, message: 'Semua alert telah ditandai terbaca.' });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Gagal mengakui semua alert.' });
  }
};

module.exports = { getAlerts, acknowledgeAlert, acknowledgeAll };
