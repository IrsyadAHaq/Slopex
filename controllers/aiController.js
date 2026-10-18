// ===== AI CONTROLLER — Ollama API (Llama 3.2) =====
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first'); // FIX BUGS DNS IPv6
const SensorData = require('../models/SensorData');
const Alert      = require('../models/Alert');
const axios      = require('axios');

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://172.16.0.244:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3:latest';

// ----------------------------------------------------------------
// System prompt
// ----------------------------------------------------------------
const SYSTEM_PROMPT = `Anda adalah "SLOPEX AI", asisten kecerdasan buatan cerdas, ramah, dan profesional untuk sistem pemantauan mitigasi bencana tanah longsor SLOPE-X (Universitas Padjadjaran PKM-KC 2026).
Sistem ini mematuhi standar nasional **SNI 8235:2017 (Sistem peringatan dini gerakan tanah)**.

PEDOMAN UTAMA BANTUAN & RESPON:
- Jawablah semua pertanyaan pengguna secara ramah, santun, jelas, dan informatif.
- Utamakan memberikan informasi mengenai kondisi sensor real-time lereng, analisis risiko longsor, status drainase, dan geofisika.
- Jika pengguna meminta contoh program atau penjelasan teknis umum, Anda boleh memberikan bantuan/penjelasan yang ringkas, terstruktur, dan bermanfaat secara sopan.

STANDAR SNI 8235:2017:
- **Waspada (Kuning)**: Curah hujan tinggi / getaran awal.
- **Siaga (Oranye)**: Peningkatan getaran & pergerakan tanah awal.
- **Awas (Merah)**: Curah hujan ekstrem & percepatan tanah signifikan.`;

// Helper: Smart Off-Topic & Code Validator with Greeting Normalization
function isOffTopicOrCodeRequest(msg) {
  if (!msg || !msg.trim()) return false;
  const lower = msg.toLowerCase().trim();
  
  // Normalisasi pengulangan huruf (contoh: "haiiiii" -> "haii", "halooo" -> "haloo")
  const normalizedMsg = lower.replace(/(.)\1{2,}/g, '$1$1');

  // Explicit Blacklist: Strict off-topic topics (Politics, Games, Movies)
  const explicitBlacklist = [
    'soal kalkulus', 'turunan integral', 'd/dx', 'persamaan matematika rumit',
    'resep masakan', 'game online', 'humor receh', 'cerita lucu', 'film bioskop',
    'politik indonesia', 'presiden indonesia', 'sejarah dunia lama'
  ];

  if (explicitBlacklist.some(term => lower.includes(term) || normalizedMsg.includes(term))) {
    return true;
  }

  return false;
}

// Helper: Deteksi Bahasa (Indonesia vs Inggris/Lainnya)
function detectLanguage(msg) {
  if (!msg) return 'id';
  const lower = msg.toLowerCase();
  const englishWords = ['what', 'how', 'why', 'who', 'where', 'when', 'is', 'are', 'the', 'hello', 'can', 'you', 'tell', 'me', 'please', 'explain', 'landslide', 'system', 'hazard', 'safety'];
  const count = englishWords.filter(w => new RegExp(`\\b${w}\\b`, 'i').test(lower)).length;
  return count >= 2 ? 'en' : 'id';
}

function getRefusalMessage(lang) {
  if (lang === 'en') {
    return "I am sorry, I am SLOPEX AI specifically programmed for landslide mitigation and SLOPEX systems. I cannot generate programming code or answer questions outside this scope.";
  }
  return "Mohon maaf, saya adalah SLOPEX AI yang hanya diprogram khusus untuk mitigasi bencana tanah longsor dan sistem SLOPEX. Saya tidak dapat membuatkan kode program atau menjawab pertanyaan di luar konteks ini.";
}

function formatHistory(historyArr) {
  return historyArr.map(m => ({
    role: m.role === 'assistant' ? 'assistant' : (m.role === 'system' ? 'system' : 'user'),
    content: m.content
  }));
}

// Helper: Axios dengan Retry
async function axiosWithRetry(url, options, retries = 3, delay = 1500) {
  try {
    return await axios({ url, ...options });
  } catch (error) {
    if (retries <= 1 || !error.code || !['EAI_AGAIN', 'ENOTFOUND', 'ECONNRESET', 'ETIMEDOUT'].includes(error.code)) {
      throw error;
    }
    await new Promise(res => setTimeout(res, delay));
    return axiosWithRetry(url, options, retries - 1, delay * 1.5);
  }
}

// ----------------------------------------------------------------
// POST /api/ai/chat — Response Biasa (Non-Streaming)
// ----------------------------------------------------------------
const chat = async (req, res) => {
  try {
    const { message, conversationHistory = [] } = req.body;
    if (!message?.trim()) return res.status(400).json({ success: false, message: 'Pesan kosong.' });

    const lang = detectLanguage(message);

    // Fast Backend Guardrail Check
    if (isOffTopicOrCodeRequest(message)) {
      return res.json({ success: true, response: getRefusalMessage(lang), sensorContextUsed: false });
    }

    const latestSensor = SensorData.getLatest();
    let sensorContext = '[DATA SENSOR: Belum ada data]';
    if (latestSensor) {
      const vwc = latestSensor.vwc != null ? latestSensor.vwc : (((latestSensor.soilDangkal || latestSensor.soil1 || 0) + (latestSensor.soilDalam || latestSensor.soil2 || 0)) / 2);
      const tilt = latestSensor.magnitude != null ? latestSensor.magnitude : (latestSensor.tiltX || 0);
      const slope = latestSensor.slopeDeg != null ? latestSensor.slopeDeg : 30;
      const rain = latestSensor.rainfall != null ? latestSensor.rainfall : 2000;
      sensorContext = `[DATA SENSOR REAL-TIME]: Risk Score ${latestSensor.riskScore}%, Status: ${latestSensor.statusDevice}, VWC (Kadar Air Tanah): ${vwc.toFixed(1)}%, Magnitude Tilt: ${typeof tilt === 'number' ? tilt.toFixed(2) : tilt}°, Kemiringan Lereng: ${slope}°, Curah Hujan Wilayah: ${rain} mm/tahun.`;
    }

    const historyData = formatHistory(conversationHistory.slice(-4));
    const langDirective = lang === 'en'
      ? '[DIRECTIVE: Respond in English in a warm, friendly tone. Provide clear summaries if asked for explanations.]'
      : '[DIRECTIVE: Jawablah dalam Bahasa Indonesia yang ramah dan bersahabat. Berikan rangkuman terstruktur yang rapi jika diminta penjelasan.]';

    const body = {
      model: OLLAMA_MODEL,
      messages: [
        { role: 'system', content: `${SYSTEM_PROMPT}\n\n${langDirective}\n\n[INFO SISTEM - KONDISI SAAT INI]: ${sensorContext}` },
        ...historyData,
        { role: 'user', content: message }
      ],
      stream: false
    };

    const url = `${OLLAMA_URL}/api/chat`;
    
    const response = await axiosWithRetry(url, {
      method: 'POST',
      data: body,
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000
    });

    const text = response.data.message?.content || "";
    res.json({ success: true, response: text, sensorContextUsed: !!latestSensor });
  } catch (e) {
    res.status(500).json({ success: false, message: 'AI error: ' + (e.response?.data?.error || e.message) });
  }
};

// ----------------------------------------------------------------
// POST /api/ai/analyze
// ----------------------------------------------------------------
const analyzeCurrentCondition = async (req, res) => {
  try {
    const latest = SensorData.getLatest();
    if (!latest) return res.json({ success: true, analysis: 'Tidak ada data sensor.' });

    const vwc = latest.vwc != null ? latest.vwc : (((latest.soilDangkal || latest.soil1 || 0) + (latest.soilDalam || latest.soil2 || 0)) / 2);
    const tilt = latest.magnitude != null ? latest.magnitude : (latest.tiltX || 0);
    const slope = latest.slopeDeg != null ? latest.slopeDeg : 30;
    const rain = latest.rainfall != null ? latest.rainfall : 2000;

    const prompt = `Analisis kondisi lereng SLOPEX saat ini:
- Risk Score: ${latest.riskScore}%
- Status Evaluasi: ${latest.statusDevice}
- Kadar Air Tanah (VWC): ${vwc.toFixed(1)}%
- Perubahan Kemiringan (ADXL345): ${typeof tilt === 'number' ? tilt.toFixed(2) : tilt}°
- Kemiringan Lereng Asli: ${slope}°
- Curah Hujan Wilayah: ${rain} mm/tahun

Berikan rangkuman terstruktur:
1) Interpretasi kondisi geoteknik & hidrologi lereng
2) Tingkat urgensi mitigasi (AMAN / WASPADA / BAHAYA sesuai SNI 8235:2017)
3) Rekomendasi tindakan lapangan operasional`;

    const body = {
      model: OLLAMA_MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt }
      ],
      stream: false
    };

    const url = `${OLLAMA_URL}/api/chat`;
    const response = await axiosWithRetry(url, {
      method: 'POST',
      data: body,
      headers: { 'Content-Type': 'application/json' }
    });

    res.json({ success: true, analysis: response.data.message?.content || "", sensor: latest });
  } catch (e) {
    res.status(500).json({ success: false, message: 'AI error: ' + e.message });
  }
};

// ----------------------------------------------------------------
// POST /api/ai/chat-stream — Streaming text
// ----------------------------------------------------------------
const chatStream = async (req, res) => {
  try {
    const { message, conversationHistory = [] } = req.body;
    if (!message?.trim()) return res.end();

    const lang = detectLanguage(message);

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Transfer-Encoding', 'chunked');
    res.flushHeaders();

    // Fast Backend Guardrail Check
    if (isOffTopicOrCodeRequest(message)) {
      res.write(getRefusalMessage(lang));
      return res.end();
    }

    const latestSensor = SensorData.getLatest();
    let sensorContext = '[DATA SENSOR: Belum ada data]';
    if (latestSensor) {
      const vwc = latestSensor.vwc != null ? latestSensor.vwc : (((latestSensor.soilDangkal || latestSensor.soil1 || 0) + (latestSensor.soilDalam || latestSensor.soil2 || 0)) / 2);
      const tilt = latestSensor.magnitude != null ? latestSensor.magnitude : (latestSensor.tiltX || 0);
      const slope = latestSensor.slopeDeg != null ? latestSensor.slopeDeg : 30;
      const rain = latestSensor.rainfall != null ? latestSensor.rainfall : 2000;
      sensorContext = `[DATA SENSOR REAL-TIME]: Risk Score ${latestSensor.riskScore}%, Status: ${latestSensor.statusDevice}, VWC (Kadar Air Tanah): ${vwc.toFixed(1)}%, Magnitude Tilt: ${typeof tilt === 'number' ? tilt.toFixed(2) : tilt}°, Kemiringan Lereng: ${slope}°, Curah Hujan Wilayah: ${rain} mm/tahun.`;
    }

    const historyData = formatHistory(conversationHistory.slice(-4));
    const langDirective = lang === 'en'
      ? '[DIRECTIVE: Respond in English in a warm, friendly tone. Provide clear summaries if asked for explanations.]'
      : '[DIRECTIVE: Jawablah dalam Bahasa Indonesia yang ramah dan bersahabat. Berikan rangkuman terstruktur yang rapi jika diminta penjelasan.]';

    const body = {
      model: OLLAMA_MODEL,
      messages: [
        { role: 'system', content: `${SYSTEM_PROMPT}\n\n${langDirective}\n\n[INFO SISTEM - KONDISI SAAT INI]: ${sensorContext}` },
        ...historyData,
        { role: 'user', content: message }
      ],
      stream: true
    };

    const url = `${OLLAMA_URL}/api/chat`;

    const response = await axiosWithRetry(url, {
      method: 'POST',
      data: body,
      headers: { 'Content-Type': 'application/json' },
      responseType: 'stream',
      timeout: 30000
    });

    response.data.on('data', (chunk) => {
      const chunkStr = chunk.toString();
      const lines = chunkStr.split('\n').filter(l => l.trim() !== '');
      for (const line of lines) {
        try {
          const json = JSON.parse(line);
          const text = json.message?.content;
          if (text) {
             res.write(text);
          }
        } catch (err) {}
      }
    });

    response.data.on('end', () => res.end());
    response.data.on('error', () => res.end());

  } catch (e) {
    if (!res.headersSent) res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.write("\n\n⚠️ Gagal terhubung ke AI: " + (e.response?.statusText || e.message));
    res.end();
  }
};

module.exports = { chat, chatStream, analyzeCurrentCondition };
