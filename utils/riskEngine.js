/**
 * SLOPEX - Random Forest & Weighted Risk Scoring Engine (SNI 8235:2017)
 * Diadopsi langsung dari modul RF2.py (PKM-KC 2026 Universitas Padjadjaran)
 * 
 * Parameter Input:
 * 1. Slope (Kemiringan Lereng asli dalam derajat: °)
 * 2. Curah Hujan (Rainfall dalam mm/tahun)
 * 3. VWC (Volumetric Water Content tanah dalam %: rata-rata Soil Dangkal & Soil Dalam)
 * 4. Magnitude Tilt (Perubahan sudut kemiringan sensor ADXL345 dalam derajat: °)
 */

// Bobot resmi sesuai Lampiran 15 Laporan Resmi SLOPEX
const WEIGHTS = {
  SLOPE: 0.35, // 35%
  RAIN:  0.30, // 30%
  VWC:   0.25, // 25%
  TILT:  0.10  // 10%
};

// Nilai default jika sensor lapangan tidak mengirimkan slope & curah hujan secara langsung
// Default lokasi Desa Cihanjuang, Cimanggung, Sumedang
const DEFAULTS = {
  SLOPE: parseFloat(process.env.DEFAULT_SLOPE) || 30.0,
  RAIN:  parseFloat(process.env.DEFAULT_RAINFALL) || 2000.0
};

/**
 * 1. Scoring VWC (%)
 * < 50%       = 1
 * 50% - < 80% = 2
 * >= 80%      = 3
 */
function scoreVWC(vwc) {
  const val = parseFloat(vwc) || 0;
  if (val < 50) return 1;
  if (val < 80) return 2;
  return 3;
}

/**
 * 2. Scoring Magnitude Tilt (°)
 * < 0.8°       = 1
 * 0.8° - 2.0°  = 2
 * > 2.0°       = 3
 */
function scoreTilt(tilt) {
  const val = Math.abs(parseFloat(tilt) || 0);
  if (val < 0.8) return 1;
  if (val <= 2.0) return 2;
  return 3;
}

/**
 * 3. Scoring Slope Lereng (°)
 * < 15°       = 1
 * 15° - < 22° = 2
 * 22° - < 30° = 3
 * 30° - < 35° = 4
 * >= 35°      = 5
 */
function scoreSlope(slope) {
  const val = parseFloat(slope) || 0;
  if (val < 15) return 1;
  if (val < 22) return 2;
  if (val < 30) return 3;
  if (val < 35) return 4;
  return 5;
}

/**
 * 4. Scoring Curah Hujan (mm/tahun)
 * < 1000 mm       = 1
 * 1000 - < 1500 mm = 2
 * 1500 - < 2000 mm = 3
 * 2000 - 2500 mm  = 4
 * > 2500 mm       = 5
 */
function scoreRain(rain) {
  const val = parseFloat(rain) || 0;
  if (val < 1000) return 1;
  if (val < 1500) return 2;
  if (val < 2000) return 3;
  if (val <= 2500) return 4;
  return 5;
}

/**
 * Hitung Weighted Risk Score (rentang 1.00 s.d. 4.10)
 */
function calculateWeightedScore(slopeScore, rainScore, vwcScore, tiltScore) {
  const score = (
    WEIGHTS.SLOPE * slopeScore +
    WEIGHTS.RAIN  * rainScore +
    WEIGHTS.VWC   * vwcScore +
    WEIGHTS.TILT  * tiltScore
  );
  return parseFloat(score.toFixed(4));
}

/**
 * Klasifikasi Kelas Risiko sesuai RF2.py
 * 1.00 - < 2.33 = Aman
 * 2.33 - < 3.67 = Waspada
 * 3.67 - 5.00   = Bahaya
 */
function classifyRisk(weightedScore) {
  if (weightedScore < 2.33) {
    return 'AMAN';
  } else if (weightedScore < 3.67) {
    return 'WASPADA';
  } else {
    return 'BAHAYA';
  }
}

/**
 * Petakan Weighted Score (1.00 - maxScore) ke Persentase Risiko Dashboard (0% - 100%)
 * Mematuhi kriteria SNI 8235:2017 & Proposal SLOPEX:
 * - Aman:    < 50%
 * - Waspada: 50% - 74%
 * - Bahaya:  >= 75%
 */
function mapScoreToPercentage(weightedScore) {
  let percentage = 0;
  if (weightedScore < 2.33) {
    // Range Aman: 1.00 s.d. 2.33 dipetakan ke 0% - 49%
    const ratio = Math.max(0, (weightedScore - 1.00) / (2.33 - 1.00));
    percentage = Math.round(ratio * 49);
  } else if (weightedScore < 3.67) {
    // Range Waspada: 2.33 s.d. 3.67 dipetakan ke 50% - 74%
    const ratio = (weightedScore - 2.33) / (3.67 - 2.33);
    percentage = Math.round(50 + ratio * 24);
  } else {
    // Range Bahaya: 3.67 s.d. maxScore dipetakan ke 75% - 100%
    const maxPossible = (WEIGHTS.SLOPE * 5) + (WEIGHTS.RAIN * 5) + (WEIGHTS.VWC * 3) + (WEIGHTS.TILT * 3);
    const ratio = Math.min(1.0, (weightedScore - 3.67) / (maxPossible - 3.67));
    percentage = Math.round(75 + ratio * 25);
  }
  return Math.min(100, Math.max(0, percentage));
}

/**
 * Estimasi Probabilitas Random Forest Ensemble (Softmax approximation)
 */
function estimateProbabilities(weightedScore) {
  // Center point masing-masing kelas: Aman ~ 1.66, Waspada ~ 3.00, Bahaya ~ 3.88
  const centerAman = 1.66;
  const centerWaspada = 3.00;
  const centerBahaya = 3.88;
  const temperature = 0.55;

  const d1 = -Math.pow(weightedScore - centerAman, 2) / (2 * Math.pow(temperature, 2));
  const d2 = -Math.pow(weightedScore - centerWaspada, 2) / (2 * Math.pow(temperature, 2));
  const d3 = -Math.pow(weightedScore - centerBahaya, 2) / (2 * Math.pow(temperature, 2));

  const exp1 = Math.exp(d1);
  const exp2 = Math.exp(d2);
  const exp3 = Math.exp(d3);
  const total = exp1 + exp2 + exp3;

  return {
    aman: Math.round((exp1 / total) * 100),
    waspada: Math.round((exp2 / total) * 100),
    bahaya: Math.round((exp3 / total) * 100)
  };
}

/**
 * Engine Evaluasi Utama:
 * Menerima data sensor dan menghasilkan analisis risiko geoteknik lengkap
 */
function evaluateRisk({ soilDangkal, soilDalam, magnitude, slope, rainfall }) {
  const s1 = parseFloat(soilDangkal) || 0;
  const s2 = parseFloat(soilDalam) || 0;
  
  // Hitung VWC = (Soil_Dangkal + Soil_Dalam) / 2
  const vwc = parseFloat(((s1 + s2) / 2).toFixed(2));
  const tilt = Math.abs(parseFloat(magnitude) || 0);
  const slopeDeg = slope !== undefined && slope !== null ? parseFloat(slope) : DEFAULTS.SLOPE;
  const rain = rainfall !== undefined && rainfall !== null ? parseFloat(rainfall) : DEFAULTS.RAIN;

  const vwcScore = scoreVWC(vwc);
  const tiltScore = scoreTilt(tilt);
  const slopeScore = scoreSlope(slopeDeg);
  const rainScore = scoreRain(rain);

  const weightedScore = calculateWeightedScore(slopeScore, rainScore, vwcScore, tiltScore);
  const statusDevice = classifyRisk(weightedScore);
  const riskScore = mapScoreToPercentage(weightedScore);
  const probabilities = estimateProbabilities(weightedScore);

  return {
    riskScore,          // 0% - 100%
    statusDevice,       // 'AMAN' | 'WASPADA' | 'BAHAYA'
    weightedScore,      // 1.00 - 4.10
    features: {
      vwc,
      magnitudeTilt: tilt,
      slopeDeg,
      curahHujan: rain
    },
    scores: {
      vwcScore,
      tiltScore,
      slopeScore,
      rainScore
    },
    weights: WEIGHTS,
    probabilities
  };
}

module.exports = {
  WEIGHTS,
  DEFAULTS,
  scoreVWC,
  scoreTilt,
  scoreSlope,
  scoreRain,
  calculateWeightedScore,
  classifyRisk,
  mapScoreToPercentage,
  estimateProbabilities,
  evaluateRisk
};
