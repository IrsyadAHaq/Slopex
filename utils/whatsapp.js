const axios = require('axios');

const BOT_BRIDGE_URL = process.env.WA_BOT_BRIDGE_URL || 'http://localhost:3001';

/**
 * Kirim notifikasi darurat / peringatan dini ke WhatsApp Bot
 * @param {Object} alertData - Object alert dari Alert.create()
 */
async function sendAlert(alertData) {
  try {
    const response = await axios.post(`${BOT_BRIDGE_URL}/send-alert`, {
      title: alertData.title,
      message: alertData.message,
      severity: alertData.severity || alertData.type || 'warning',
      sensorSnapshot: alertData.sensorSnapshot || {}
    }, { timeout: 3000 });

    if (response.data && response.data.success) {
      console.log('[WA-UTILS] Alert berhasil dikirim ke Bot WhatsApp bridge.');
    }
    return response.data;
  } catch (err) {
    console.warn('[WA-UTILS] Notification bridge skip / offline:', err.message);
    return null;
  }
}

/**
 * Kirim notifikasi pendaftaran pengguna baru
 */
async function notifyUserRegistration(userData) {
  try {
    await axios.post(`${BOT_BRIDGE_URL}/user-registered`, {
      user: userData
    }, { timeout: 3000 });
  } catch (err) {
    // Silent fail if bot HTTP bridge is not listening
  }
}

module.exports = { sendAlert, notifyUserRegistration };
