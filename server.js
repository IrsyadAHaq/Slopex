require('dotenv').config();
const express    = require('express');
const http       = require('http');
const { Server } = require('socket.io');
const cors       = require('cors');
const rateLimit  = require('express-rate-limit');
const path       = require('path');

const { connectDB }            = require('./config/db');
const { autoSeedDemoAccounts } = require('./config/seeder');

const sensorController   = require('./controllers/sensorController');
const drainageController = require('./controllers/drainageController');
const loraController     = require('./controllers/loraController');

const authRoutes     = require('./routes/authRoutes');
const sensorRoutes   = require('./routes/sensorRoutes');
const aiRoutes       = require('./routes/aiRoutes');
const drainageRoutes = require('./routes/drainageRoutes');
const alertRoutes    = require('./routes/alertRoutes');
const loraRoutes     = require('./routes/loraRoutes');

// ===== INIT =====
const app    = express();
const server = http.createServer(app);
const io     = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  pingTimeout: 60000
});

// Inject Socket.IO instance
sensorController.setIO(io);
drainageController.setIO(io);
loraController.setIO(io);

// Inject drainage controller ke sensor (untuk auto-drainase)
sensorController.setDrainageCtrl(drainageController);

// Load database lokal dari file JSON & jalankan seeder
connectDB();
autoSeedDemoAccounts();

// ===== MIDDLEWARE =====
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/api/', rateLimit({
  windowMs: 15 * 60 * 1000, max: 500,
  message: { success: false, message: 'Terlalu banyak request. Coba lagi nanti.' }
}));

// ===== STATIC FILES =====
app.use(express.static(path.join(__dirname, 'public')));

// ===== API ROUTES =====
app.use('/api/auth',     authRoutes);
app.use('/api/sensor',   sensorRoutes);
app.use('/api/ai',       aiRoutes);
app.use('/api/drainage', drainageRoutes);
app.use('/api/alerts',   alertRoutes);
app.use('/api/lora',     loraRoutes);

// Kompatibilitas route root untuk Webhook ChirpStack, Downlink, dan SSE
app.post('/webhook',      (req, res) => loraController.handleWebhook(req, res));
app.post('/api/downlink', (req, res) => loraController.handleDownlink(req, res));
app.get('/events',        (req, res) => loraController.handleSSE(req, res));

app.get('/api/health', (req, res) =>
  res.json({ success: true, message: 'SLOPEX API berjalan normal', timestamp: new Date().toISOString() })
);

// Fallback SPA
app.get('*', (req, res) =>
  res.sendFile(path.join(__dirname, 'public', 'index.html'))
);

// Error handler global
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.stack);
  res.status(500).json({ success: false, message: 'Internal Server Error' });
});

// ===== SOCKET.IO =====
io.on('connection', (socket) => {
  console.log(`[SOCKET] Client terhubung: ${socket.id}`);

  socket.on('requestLatest', () => {
    try {
      const SensorData = require('./models/SensorData');
      const latest = SensorData.getLatest();
      if (latest) {
        socket.emit('sensorUpdate', {
          deviceId:     latest.deviceId,
          soilDangkal:  latest.soilDangkal || latest.soil1,
          soil1:        latest.soil1,
          soilDalam:    latest.soilDalam || latest.soil2,
          soil2:        latest.soil2,
          magnitude:    latest.magnitude || latest.tiltX,
          tiltX:        latest.tiltX,
          tiltY:        latest.tiltY,
          gpsLat:       latest.gpsLat,
          gpsLng:       latest.gpsLng,
          riskScore:    latest.riskScore,
          statusDevice: latest.statusDevice,
          vSolar:       latest.vSolar,
          iSolar:       latest.iSolar,
          vBuck:        latest.vBuck,
          iBuck:        latest.iBuck,
          vAki:         latest.vAki,
          iAki:         latest.iAki,
          statusRelay:  latest.statusRelay,
          timestamp:    latest.createdAt
        });
      }
    } catch (e) {
      console.error('Socket requestLatest error:', e.message);
    }
  });

  socket.on('disconnect', () => console.log(`[SOCKET] Client terputus: ${socket.id}`));
});

// ===== START SERVER =====
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log('\n=====================================================');
  console.log('   SLOPEX - Smart Landslide Prevention System');
  console.log('   Universitas Padjadjaran | PKM-KC 2026');
  console.log('=====================================================');
  console.log(`   Server  : http://localhost:${PORT}`);
  console.log('   Database: Local JSON (data/)');
  console.log('   Socket.IO ready for ESP32 & Web Client');
  console.log('   AI Engine: LLaMA 3.2 (Self-Hosted Ollama)');
  console.log('=====================================================\n');
});

module.exports = { app, server, io };
