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

  // Normalisasi data sensor agar tidak ada null/undefined/missing values saat di-render frontend
  normalize(doc) {
    if (!doc) return null;
    const s1 = typeof doc.soilDangkal === 'number' ? doc.soilDangkal : (typeof doc.soil1 === 'number' ? doc.soil1 : 0);
    const s2 = typeof doc.soilDalam === 'number' ? doc.soilDalam : (typeof doc.soil2 === 'number' ? doc.soil2 : 0);
    const mag = typeof doc.magnitude === 'number' ? doc.magnitude : (typeof doc.tiltX === 'number' ? doc.tiltX : 0);
    const vwc = doc.vwc != null ? parseFloat(doc.vwc) : parseFloat(((s1 + s2) / 2).toFixed(2));
    const slopeDeg = doc.slopeDeg != null ? parseFloat(doc.slopeDeg) : 30.0;
    const rainfall = doc.rainfall != null ? parseFloat(doc.rainfall) : 2000.0;
    const risk = typeof doc.riskScore === 'number' ? doc.riskScore : (doc.statusDevice === 'BAHAYA' ? 75 : (doc.statusDevice === 'WASPADA' ? 50 : 25));
    const status = doc.statusDevice || (risk >= 75 ? 'BAHAYA' : (risk >= 50 ? 'WASPADA' : 'AMAN'));
    const relay = doc.statusRelay || (risk >= 75 ? 'MENYALA (AKTIF)' : 'MATI (STANDBY)');

    return {
      id: doc.id,
      deviceId: doc.deviceId || 'SLOPEX-001',
      soilDangkal: parseFloat(s1.toFixed(1)),
      soil1: parseFloat(s1.toFixed(1)),
      soilDalam: parseFloat(s2.toFixed(1)),
      soil2: parseFloat(s2.toFixed(1)),
      vwc,
      magnitude: parseFloat(mag.toFixed(2)),
      tiltX: parseFloat(mag.toFixed(2)),
      slopeDeg,
      rainfall,
      riskScore: risk,
      statusDevice: status,
      statusRelay: relay,
      weightedScore: doc.weightedScore || 1.5,
      probabilities: doc.probabilities || { aman: 80, waspada: 15, bahaya: 5 },
      vSolar: doc.vSolar != null ? parseFloat(parseFloat(doc.vSolar).toFixed(2)) : 0,
      iSolar: doc.iSolar != null ? parseInt(doc.iSolar) : 0,
      vAki: doc.vAki != null ? parseFloat(parseFloat(doc.vAki).toFixed(2)) : 12.6,
      iAki: doc.iAki != null ? parseInt(doc.iAki) : 0,
      gpsLat: doc.gpsLat != null ? parseFloat(doc.gpsLat) : -6.92556,
      gpsLng: doc.gpsLng != null ? parseFloat(doc.gpsLng) : 107.77383,
      createdAt: doc.createdAt || new Date().toISOString(),
      timestamp: doc.createdAt || new Date().toISOString()
    };
  },

  async create(data) {
    const { soilDangkal, soilDalam, magnitude, slopeDeg, slope, rainfall, curahHujan } = data;
    
    // Evaluasi menggunakan Random Forest & Weighted Risk Scoring Engine (Proposal SLOPEX)
    const evalResult = riskEngine.evaluateRisk({
      soilDangkal,
      soilDalam,
      magnitude,
      slope: slopeDeg !== undefined ? slopeDeg : slope,
      rainfall: rainfall !== undefined ? rainfall : curahHujan
    });

    const riskScore = evalResult.riskScore;
    const statusDevice = data.statusDevice || evalResult.statusDevice;
    const s1 = parseFloat(soilDangkal) || 0;
    const s2 = parseFloat(soilDalam) || 0;
    const mag = parseFloat(magnitude) || 0;

    const { saveImmediately } = require('../config/db');
    const doc = await DB.insert(this.collection, {
      deviceId:     data.deviceId || 'SLOPEX-001',
      soilDangkal:  s1,
      soil1:        s1, // alias backward compat
      soilDalam:    s2,
      soil2:        s2, // alias backward compat
      vwc:          evalResult.features.vwc,
      magnitude:    mag,
      tiltX:        mag, // alias backward compat
      slopeDeg:     evalResult.features.slopeDeg,
      rainfall:     evalResult.features.curahHujan,
      weightedScore: evalResult.weightedScore,
      scores:       evalResult.scores,
      probabilities: evalResult.probabilities,
      gpsLat:       data.gpsLat ? parseFloat(data.gpsLat) : -6.92556,
      gpsLng:       data.gpsLng ? parseFloat(data.gpsLng) : 107.77383,
      
      vSolar:       data.vSolar != null ? parseFloat(data.vSolar) : 0,
      iSolar:       data.iSolar != null ? parseInt(data.iSolar) : 0,
      vAki:         data.vAki != null ? parseFloat(data.vAki) : 12.6,
      iAki:         data.iAki != null ? parseInt(data.iAki) : 0,
      
      statusDevice,
      statusRelay:  data.statusRelay || (riskScore >= 75 ? 'MENYALA (AKTIF)' : 'MATI (STANDBY)'),
      riskScore,
      drainageActive: riskScore >= 75
    });
    saveImmediately(this.collection);
    return this.normalize(doc);
  },

  getLatest(deviceId) {
    const query = {};
    if (deviceId) query.deviceId = deviceId;
    const rows = DB.find(this.collection, query, { sort: { createdAt: -1 }, limit: 1 });
    return rows[0] ? this.normalize(rows[0]) : null;
  },

  getHistory({ deviceId, hours = 24, limit = 2000 } = {}) {
    // Batasi maksimum history 14 hari (336 jam) untuk ditampilkan di frontend
    const cappedHours = Math.min(parseInt(hours) || 24, 336);
    const since = new Date(Date.now() - cappedHours * 60 * 60 * 1000).toISOString();
    const query = { createdAt: { $gte: since } };
    if (deviceId) query.deviceId = deviceId;
    
    let docs = DB.find(this.collection,
      query,
      { sort: { createdAt: -1 }, limit: parseInt(limit) }
    );

    // Fallback proteksi: jika rentang jam terakhir kosong, ambil data tersimpan terbaru agar grafik tidak blank/error
    if (docs.length === 0) {
      docs = DB.find(this.collection,
        deviceId ? { deviceId } : {},
        { sort: { createdAt: -1 }, limit: Math.min(parseInt(limit), 200) }
      );
    }

    return docs.map(d => this.normalize(d)).reverse();
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
