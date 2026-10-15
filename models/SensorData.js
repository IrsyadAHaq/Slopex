const { DB } = require('../config/db');

const SensorDataModel = {
  collection: 'sensor_data',

  // Hitung risk score dari data sensor (SNI 8235:2017 & Kriteria SLOPEX)
  computeRisk(soilDangkal, soilDalam, magnitude) {
    const soilMax = Math.max(parseFloat(soilDangkal) || 0, parseFloat(soilDalam) || 0);
    const tiltRiskVal = Math.abs(parseFloat(magnitude) || 0);

    // Soil Risk (VWC)
    const soilRisk = Math.min((soilMax / 85) * 100, 100);

    // Perubahan Kemiringan ADXL345:
    // Aman: < 1.0° (Risk < 50%)
    // Waspada: 1.0° - 2.0° (Risk 50% - 74%)
    // Bahaya: > 2.0° (Risk >= 75%)
    let tiltRisk = 0;
    if (tiltRiskVal < 1.0) {
      tiltRisk = (tiltRiskVal / 1.0) * 49;
    } else if (tiltRiskVal <= 2.0) {
      tiltRisk = 50 + ((tiltRiskVal - 1.0) / 1.0) * 24;
    } else {
      tiltRisk = Math.min(100, 75 + ((tiltRiskVal - 2.0) / 1.0) * 25);
    }

    return Math.round(soilRisk * 0.6 + tiltRisk * 0.4);
  },

  // Tentukan status dari risk score
  getStatus(riskScore) {
    if (riskScore >= 75) return 'BAHAYA';
    if (riskScore >= 50) return 'WASPADA';
    return 'AMAN';
  },

  async create(data) {
    const { soilDangkal, soilDalam, magnitude } = data;
    const riskScore   = this.computeRisk(soilDangkal, soilDalam, magnitude);
    const statusDevice = data.statusDevice || this.getStatus(riskScore);

    const { saveImmediately } = require('../config/db');
    const doc = await DB.insert(this.collection, {
      deviceId:     data.deviceId || 'SLOPEX-001',
      soilDangkal:  parseFloat(soilDangkal) || 0,
      soil1:        parseFloat(soilDangkal) || 0,
      soilDalam:    parseFloat(soilDalam) || 0,
      soil2:        parseFloat(soilDalam) || 0,
      magnitude:    parseFloat(magnitude) || 0,
      tiltX:        parseFloat(magnitude) || 0,
      tiltY:        0,
      gpsLat:       data.gpsLat ? parseFloat(data.gpsLat) : -6.92556,
      gpsLng:       data.gpsLng ? parseFloat(data.gpsLng) : 107.77383,
      
      vSolar:       data.vSolar != null ? parseFloat(data.vSolar) : null,
      iSolar:       data.iSolar != null ? parseInt(data.iSolar) : null,
      vBuck:        data.vBuck != null ? parseFloat(data.vBuck) : null,
      iBuck:        data.iBuck != null ? parseInt(data.iBuck) : null,
      vAki:         data.vAki != null ? parseFloat(data.vAki) : null,
      iAki:         data.iAki != null ? parseInt(data.iAki) : null,
      
      statusDevice,
      statusRelay:  data.statusRelay || 'MATI (STANDBY)',
      riskScore,
      drainageActive: data.drainageActive || false
    });
    saveImmediately(this.collection);
    return doc;
  },

  getLatest(deviceId) {
    const query = {};
    if (deviceId) query.deviceId = deviceId;
    const rows = DB.find(this.collection, query, { sort: { createdAt: -1 }, limit: 1 });
    return rows[0] || null;
  },

  getHistory({ deviceId, hours = 24, limit = 2000 } = {}) {
    // Batasi maksimum history 14 hari (336 jam) untuk ditampilkan di frontend
    const cappedHours = Math.min(parseInt(hours) || 24, 336);
    const since = new Date(Date.now() - cappedHours * 60 * 60 * 1000).toISOString();
    const query = { createdAt: { $gte: since } };
    if (deviceId) query.deviceId = deviceId;
    
    const docs = DB.find(this.collection,
      query,
      { sort: { createdAt: -1 }, limit: parseInt(limit) }
    );
    return docs.reverse();
  },

  getStats(deviceId) {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const query = {};
    if (deviceId) query.deviceId = deviceId;
    
    const all   = DB.find(this.collection, query);
    const last24 = DB.find(this.collection, { ...query, createdAt: { $gte: since } });

    const avgRisk = last24.length
      ? Math.round(last24.reduce((a, b) => a + (b.riskScore || 0), 0) / last24.length)
      : 0;
    const maxRisk = last24.length
      ? Math.max(...last24.map(d => d.riskScore || 0))
      : 0;
    const dangerCount = last24.filter(d => d.statusDevice === 'BAHAYA').length;
    const waspCount   = last24.filter(d => d.statusDevice === 'WASPADA').length;

    const avgSoilDangkal = last24.length
      ? parseFloat((last24.reduce((a, b) => a + (b.soilDangkal || b.soil1 || 0), 0) / last24.length).toFixed(1))
      : 0;
    const avgSoilDalam = last24.length
      ? parseFloat((last24.reduce((a, b) => a + (b.soilDalam || b.soil2 || 0), 0) / last24.length).toFixed(1))
      : 0;
    const avgMagnitude = last24.length
      ? parseFloat((last24.reduce((a, b) => a + (b.magnitude || b.tiltX || 0), 0) / last24.length).toFixed(1))
      : 0;

    return {
      totalReadings:  all.length,
      readings24h:    last24.length,
      avgRisk24h:     avgRisk,
      maxRisk24h:     maxRisk,
      avgSoilDangkal,
      avgSoilDalam,
      avgMagnitude,
      dangerCount24h: dangerCount,
      waspCount24h:   waspCount
    };
  },

  async insertMany(dataArray) {
    return DB.insertMany(this.collection, dataArray);
  },

  async deleteAll() {
    return DB.clear(this.collection);
  }
};

module.exports = SensorDataModel;
