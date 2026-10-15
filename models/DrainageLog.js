const { DB } = require('../config/db');

const DrainageLogModel = {
  collection: 'drainage_logs',

  async create(data) {
    const { saveImmediately } = require('../config/db');
    const doc = await DB.insert(this.collection, {
      deviceId:        data.deviceId || 'SLOPEX-001',
      action:          data.action,
      zone:            data.zone || 'Z1',
      triggeredBy:     data.triggeredBy || 'auto',
      triggeredByUser: data.triggeredByUser || null,
      triggeredByName: data.triggeredByName || 'Sistem',
      reason:          data.reason || 'Threshold terlampaui',
      riskScoreAtTime: data.riskScoreAtTime || 0,
      isActive:        data.action === 'open'
    });
    saveImmediately(this.collection);
    return doc;
  },

  getLogs({ deviceId = 'SLOPEX-001', limit = 20 } = {}) {
    return DB.find(this.collection, { deviceId }, { sort: { createdAt: -1 }, limit });
  },

  getLatest(deviceId = 'SLOPEX-001') {
    const rows = DB.find(this.collection, { deviceId }, { sort: { createdAt: -1 }, limit: 1 });
    return rows[0] || null;
  },

  async deleteAll() {
    return DB.clear(this.collection);
  }
};

module.exports = DrainageLogModel;
