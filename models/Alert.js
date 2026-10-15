const { DB } = require('../config/db');

const AlertModel = {
  collection: 'alerts',

  async create(data) {
    const { saveImmediately } = require('../config/db');
    const doc = await DB.insert(this.collection, {
      deviceId:        data.deviceId || 'SLOPEX-001',
      type:            data.type,
      severity:        data.severity,
      title:           data.title,
      message:         data.message,
      sensorSnapshot:  data.sensorSnapshot || null,
      acknowledged:    false,
      acknowledgedBy:  null,
      acknowledgedAt:  null
    });
    saveImmediately(this.collection);
    return doc;
  },

  async createMany(dataArray) {
    const results = [];
    for (const d of dataArray) results.push(await this.create(d));
    return results;
  },

  find({ acknowledged, limit = 20 } = {}) {
    const filter = {};
    if (acknowledged !== undefined) filter.acknowledged = acknowledged;
    return DB.find(this.collection, filter, { sort: { createdAt: -1 }, limit });
  },

  findById(id) {
    return DB.findById(this.collection, id);
  },

  countUnread(deviceId = 'SLOPEX-001') {
    return DB.count(this.collection, { deviceId, acknowledged: false });
  },

  async acknowledgeById(id, userId) {
    const { saveImmediately } = require('../config/db');
    const res = await DB.updateById(this.collection, id, {
      acknowledged:    true,
      acknowledgedBy:  userId,
      acknowledgedAt:  new Date().toISOString()
    });
    saveImmediately(this.collection);
    return res;
  },

  async acknowledgeAll(userId) {
    const { saveImmediately } = require('../config/db');
    const count = await DB.updateMany(this.collection, { acknowledged: false }, {
      acknowledged:   true,
      acknowledgedBy: userId,
      acknowledgedAt: new Date().toISOString()
    });
    saveImmediately(this.collection);
    return count;
  },

  async deleteAll() {
    return DB.clear(this.collection);
  }
};

module.exports = AlertModel;
