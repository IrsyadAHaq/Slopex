const { DB } = require('../config/db');
const riskEngine = require('../utils/riskEngine');

const SensorDataModel = {
  collection: 'sensor_data',

  // Hitung evaluasi risiko lengkap dari data sensor (SNI 8235:2017 & Random Forest RF2.py)
  evaluate(data) {
    return riskEngine.evaluateRisk(data);
  },

  // Hitung risk score dari data sensor (Backwards-compatibility)
  computeRisk(soilDangkal, soilDalam, magnitude, slope, rainfall) {
    const res = riskEngine.evaluateRisk({ soilDangkal, soilDalam, magnitude, slope, rainfall });
    return res.riskScore;
  },

  // Tentukan status dari risk score
  getStatus(riskScore) {
    if (riskScore >= 75) return 'BAHAYA';
    if (riskScore >= 50) return 'WASPADA';
    return 'AMAN';
  },

  async create(data) {
    const { soilDangkal, soilDalam, magnitude, slopeDeg, slope, rainfall, curahHujan } = data;
    
    // Evaluasi menggunakan Random Forest & Weighted Risk Scoring Engine
    const evalResult = riskEngine.evaluateRisk({
      soilDangkal,
      soilDalam,
      magnitude,
      slope: slopeDeg !== undefined ? slopeDeg : slope,
      rainfall: rainfall !== undefined ? rainfall : curahHujan
    });

    const riskScore = evalResult.riskScore;
    const statusDevice = data.statusDevice || evalResult.statusDevice;

    const { saveImmediately } = require('../config/db');
    const doc = await DB.insert(this.collection, {
      deviceId:     data.deviceId || 'SLOPEX-001',
      soilDangkal:  parseFloat(soilDangkal) || 0,
      soil1:        parseFloat(soilDangkal) || 0,
      soilDalam:    parseFloat(soilDalam) || 0,
      soil2:        parseFloat(soilDalam) || 0,
      vwc:          evalResult.features.vwc,
      magnitude:    parseFloat(magnitude) || 0,
      tiltX:        parseFloat(magnitude) || 0,
      tiltY:        0,
      slopeDeg:     evalResult.features.slopeDeg,
      rainfall:     evalResult.features.curahHujan,
      weightedScore: evalResult.weightedScore,
      scores:       evalResult.scores,
      probabilities: evalResult.probabilities,
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
