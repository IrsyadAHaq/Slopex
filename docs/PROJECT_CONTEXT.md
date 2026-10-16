# SLOPEX — Project Context & Architectural Documentation
> **Single Source of Truth** untuk pengembang dan agen AI. Terakhir diperbarui: 15 Oktober 2026.

---

## 1. Project Overview & Objectives

**SLOPEX (Slope Extension System)** adalah sistem *Early Warning System* (EWS) dan mitigasi bencana tanah longsor pintar terintegrasi yang dikembangkan oleh tim Universitas Padjadjaran (PKM-KC 2026).

### A. Tujuan & Fungsi Utama
1. **Pemantauan Geoteknik Mandiri & Real-Time**: Akuisisi data kelembapan tanah (*Volumetric Water Content* / VWC via sensor kapasitif) dan pergerakan/perubahan kemiringan (*Tilt* via akselerometer ADXL345) yang ditenagai panel surya & baterai (dimonitor oleh INA219).
2. **Komunikasi Jarak Jauh (LoRaWAN)**: Transmisi data dari end-node di lereng ke ChirpStack Gateway melalui frekuensi AS923, memungkinkan operasi di lokasi blank spot seluler.
3. **Analisis Risiko & Kepatuhan SNI 8235:2017**: Klasifikasi kondisi lereng ke dalam tiga tingkat bahaya:
   - **Aman (< 50%)**
   - **Waspada (50% – 74%)**
   - **Bahaya (≥ 75%)**
4. **Respons Aktif Terotomasi (Katup Drainase)**: Pengendalian katup solenoid (*drainage valve*) secara otomatis ketika lereng mencapai ambang batas saturasi air/risiko tinggi, guna mengurangi tekanan air pori tanah.
5. **Peringatan Dini Multi-Kanal**:
   - Notifikasi push WhatsApp bot otomatis kepada tim satgas dan operator desa.
   - Peringatan sirine/buzzer lapangan via LoRa downlink.
6. **SLOPEX AI Assistant**: Chatbot konsultasi terkontekstualisasi menggunakan model LLM (LLaMA 3.2 via self-hosted Ollama) dengan guardrail domain mitigasi geoteknik.

### B. Target Pengguna
- BPBD, Relawan Siaga Bencana, Pemerintah Desa rawan longsor (contoh: Desa Cihanjuang, Sumedang), serta peneliti geoteknik/BRIN.

---

## 2. Tech Stack & Dependencies

- **Runtime & Bahasa**: Node.js (v20+ Bullseye), Vanilla JavaScript (ES6+), C/C++ (ESP32 Firmware di repositori terpisah).
- **Web Framework**: Express.js (v4.19.2) dengan arsitektur RESTful API & Server-Sent Events (SSE).
- **Komunikasi Real-Time**: Socket.IO (v4.7.5) untuk sinkronisasi dashboard web & event gateway.
- **Basis Data**: Flat JSON File Document-Store (`data/*.json`) dengan memory caching & atomic file persistence (`config/db.js`).
- **AI Engine**: LLaMA 3.2 (Self-hosted Ollama API pada `http://172.16.0.244:11434`).
- **IoT & Telemetri**: ChirpStack v4 REST/gRPC Downlink API & HTTP Uplink Webhook Decoder.
- **WhatsApp Integration**: `whatsapp-web.js` (Puppeteer/Chromium/Firefox daemon di folder `whatsapp-bot/`).
- **Frontend**: HTML5, Vanilla CSS (Glassmorphism design), Vanilla JS (Modular client), Leaflet.js (GIS Map), Chart.js (Grafik Dinamis).
- **DevOps & Container**: Docker, Docker Compose, Nginx Reverse Proxy (SSL/TLS).

---

## 3. Project Architecture & Directory Structure

```text
slopexV100/
├── config/                  # Konfigurasi basis data, seeder, dan konstanta global
│   ├── db.js                # Driver flat JSON database (in-memory caching & flush)
│   └── seeder.js            # Auto-seed akun demo awal (admin, operator, viewer)
├── controllers/             # Layer pemrosesan logika bisnis & request-response
│   ├── aiController.js      # Integrasi LLaMA 3.2 (Ollama), guardrail pesan, rag context
│   ├── alertController.js   # Manajemen notifikasi sistem & riwayat alert
│   ├── authController.js    # Login, registrasi, JWT signing, password hashing
│   ├── drainageController.js# Otomasi & audit trail katup drainase solenoid
│   ├── loraController.js    # Webhook decoder buffer ChirpStack & API downlink sirine
│   └── sensorController.js  # Telemetri, evaluasi risiko, dan auto-drainage trigger
├── data/                    # Penyimpanan fisik data JSON (Persisted via Docker volume)
│   ├── alerts.json          # Riwayat peringatan dini yang terpicu
│   ├── drainage_logs.json   # Audit trail buka-tutup katup drainase
│   ├── sensor_data.json     # Data time-series telemetri sensor & energi
│   └── users.json           # Data akun pengguna, role, dan token JWT
├── docs/                    # Dokumentasi lengkap, proposal, & technical context
│   ├── LAPORAN_SLOPEX_LENGKAP.docx # Laporan kemajuan & proposal PKM
│   ├── LAPORAN_SLOPEX_LENGKAP.md   # Versi markdown laporan
│   ├── PROJECT_CONTEXT.md          # Dokumen ini (Single source of truth)
│   └── PROJECT_DOCUMENTATION.md    # Catatan arsitektur teknis lama
├── middleware/              # Express middleware layer
│   └── authMiddleware.js    # Verifikasi token JWT & proteksi otorisasi Role
├── models/                  # Abstraksi data & akses ke DB engine
│   ├── Alert.js             # Model query peringatan
│   ├── DrainageLog.js       # Model audit log drainase
│   ├── SensorData.js        # Model data sensor & kalkulasi risk score
│   └── User.js              # Model pengguna & autentikasi
├── public/                  # Aset frontend statis (Client Dashboard)
│   ├── css/styles.css       # Desain antarmuka (Glassmorphism & responsive)
│   ├── js/                  # Modul client-side (dashboard, map GIS, AI chat, sockets)
│   ├── logo.png             # Branding aset SLOPEX
│   └── index.html           # Single Page Application (SPA) utama
├── routes/                  # Express Router routing table
│   ├── aiRoutes.js          # Rute POST /api/ai/chat & /api/ai/analyze
│   ├── alertRoutes.js       # Rute GET & PUT /api/alerts
│   ├── authRoutes.js        # Rute /api/auth (login, me, register)
│   ├── drainageRoutes.js    # Rute /api/drainage (status, toggle, logs)
│   ├── loraRoutes.js        # Rute /api/lora (webhook, downlink, events)
│   └── sensorRoutes.js      # Rute /api/sensor (latest, history, metrics)
├── scripts/                 # Utilitas DevOps, bundling, dan reporting
│   ├── create_docs.py       # Generator berkas Word dokumen resmi
│   ├── deploy.js            # Skrip SFTP & remote SSH container deployment
│   ├── get-logs.js          # Skrip penampil remote container logs
│   └── zip.js               # Skrip packaging slopex.zip untuk deploy
├── utils/                   # Helper fungsional independen
│   ├── email.js             # Transporter SMTP Nodemailer
│   ├── lora.js              # HTTP client helper ke ChirpStack
│   └── whatsapp.js          # Helper pengiriman pesan notifikasi WhatsApp
├── whatsapp-bot/            # Service bot WhatsApp mandiri (Puppeteer daemon)
│   └── index.js             # Listener, command handler (!status, !alert), & cron
├── .dockerignore
├── .env                     # Secrets & environment variables aktif (Dilarang commit)
├── .env.example             # Template variabel lingkungan untuk developer baru
├── .gitignore
├── Dockerfile               # Konfigurasi build container Linux Bullseye
├── docker-compose.yml       # Konfigurasi orchestrator & volume persistence
├── nodemon.json
├── package.json             # Manifest dependensi & skrip NPM
└── server.js                # Core App Entrypoint (Server bootstrapper & Socket.IO)
```

---

## 4. Core Features & Business Logic Flow

### A. Alur Ingestion Telemetri Sensor (Uplink ChirpStack)
1. **Penerimaan Uplink**: ChirpStack Gateway mengirimkan payload Base64 ke `POST /webhook` (atau `/api/lora/webhook`).
2. **Buffer Splitting Decoder**:
   - `FPort 1` (6 Byte): Parsing data geoteknik (`soilDangkal`, `soilDalam`, `magnitude`, `statusRelay`).
   - `FPort 2` (8 Byte): Parsing data daya solar & aki (`vSolar`, `iSolar`, `vAki`, `iAki`).
3. **Penyatuan Cache & Kalkulasi Risiko**: Data dari kedua port digabung dalam `sensorCache`, lalu dihitung nilai risiko (`riskScore`) dan status bahayanya (`statusDevice`) di `SensorData.js`.
4. **Evaluasi Otomasi & Notifikasi**:
   - Jika `riskScore >= 75` (Bahaya) atau `soilDalam >= BATAS_AKTIF`: Katup drainase otomatis dibuka (memanggil `drainageController.triggerAutoDrainage`).
   - Jika status berubah menjadi Waspada/Bahaya: Catat alert baru ke `Alert.js` dan kirim trigger ke WhatsApp Bot.
5. **Real-Time Broadcast**: Data dipancarkan ke client dashboard melalui `Socket.IO` event `sensorUpdate` dan SSE `/events`.

### B. Alur Kontrol Katup Drainase & Sirine (Downlink)
1. Permintaan kontrol datang dari antarmuka Web (`POST /api/downlink` atau `/api/drainage/toggle`).
2. Sistem memeriksa token otorisasi:
   - **Viewer**: Ditolak (403 Forbidden).
   - **Demo Account**: Perintah disimulasikan (tidak dikirim ke alat fisik).
   - **Admin / Operator**: Permintaan di-encode menjadi byte LoRaWAN downlink (`0x01` relay, `0x02` buzzer, `0x00` reset), lalu dimasukkan ke antrean perangkat di ChirpStack via REST API.
3. Aksi dicatat secara permanen di [data/drainage_logs.json](file:///c:/Users/Irsyad/OneDrive/Dokumen/Vscode/slopexV100/data/drainage_logs.json) sebagai jejak audit (*audit trail*).

### C. Alur SLOPEX AI Chatbot
1. Pesan pengguna dikirim ke `POST /api/ai/chat`.
2. **Guardrail Layer**: Evaluasi pesan melalui blacklist filter & pendeteksi bahasa. Pesan di luar konteks mitigasi geoteknik/bencana ditolak dengan pesan standar.
3. **Context Injection**: Sistem menyuntikkan status sensor terkini (`latestSensor.riskScore`, `soil1`) ke dalam prompt sistem.
4. **Inference**: Mengirim payload ke model Ollama `llama3.2:latest` dan mengembalikan respons teks terstruktur.

---

## 5. Coding Standards & Conventions

1. **Aturan Secrets & Credentials**:
   - **DILARANG KERAS** menulis token, IP privat, API key, atau password langsung di source code.
   - Semua rahasia wajib dimuat melalui `process.env.*` dan didaftarkan pada `.env.example`.
2. **Prinsip Arsitektur (Modular MVC)**:
   - `routes/` hanya bertugas mendefinisikan URL endpoint dan middleware.
   - `controllers/` menangani logika bisnis, parsing request, dan response format.
   - `models/` menangani skema, validasi struktur objek, dan pemanggilan operasi data (`config/db.js`).
   - `server.js` murni sebagai inisialisasi (*bootstrapper*). Jangan menaruh logika bisnis langsung di dalamnya.
3. **Database Integrity**:
   - Basis data menggunakan penyimpanan flat JSON. Selalu gunakan helper `DB.insert`, `DB.find`, atau `DB.update` dari `config/db.js` agar data tidak korup saat proses penulisan bersamaan.
4. **Preservasi Data Produksi**:
   - Direktori `data/` dan `whatsapp-bot/.wwebjs_auth` adalah persisten. Saat melakukan bundling (`scripts/zip.js`) atau deployment, folder ini **TIDAK BOLEH** ditimpa atau dihapus.

---

## 6. Changelog & Project History

### Refactoring & Audit (15 Oktober 2026):
- **Sanitasi Kredensial**: Seluruh API key ChirpStack dan kredensial SSH/SFTP dipindahkan dari kode mentah ke file `.env`. Dibuatkan `.env.example`.
- **Pembersihan Dependensi Mati**: Menghapus paket `@google/generative-ai` yang sudah tidak terpakai setelah migrasi ke LLaMA 3.2.
- **Restrukturisasi DevOps & Tooling**:
  - Dibuat folder `scripts/` untuk mengisolasi `deploy.js`, `get-logs.js`, `zip.js`, dan `create_docs.py`.
  - Menghapus file sampah `scratch/test_fix.js`, `test-model.js`, dan arsip lama `slopex.zip`.
  - Menambahkan script NPM: `npm run bundle`, `npm run deploy`, `npm run remote:logs`.
- **Modularisasi `server.js`**:
  - Memisahkan logika Webhook LoRaWAN, SSE, dan API Downlink ke `controllers/loraController.js` & `routes/loraRoutes.js`.
  - Memindahkan inisialisasi akun demo ke `config/seeder.js`.
  - Menyederhanakan `server.js` dari 404 baris menjadi ~145 baris.
- **Restrukturisasi Dokumentasi**:
  - Dibuat folder `docs/` untuk merapikan berkas laporan `LAPORAN_SLOPEX_LENGKAP.*` dan dokumentasi proyek.
  - Menghapus direktori kosong `scratch/`.

### Implementasi Random Forest & Weighted Risk Engine (16 Oktober 2026):
- **Engine Baru `utils/riskEngine.js`**:
  - Mengonversi 100% logika `RF2.py` dan aturan scoring SNI 8235:2017 ke dalam JavaScript murni (zero-dependency).
  - Mengintegrasikan 4 parameter geoteknik: Slope Lereng (35%), Curah Hujan (30%), VWC Kadar Air Tanah (25%), dan Magnitude Tilt ADXL345 (10%).
  - Interpolasi mulus skor berbobot (1.00 s.d. 4.30) ke persentase Dashboard (0% - 100%) dengan pemetaan status SNI: Aman (<50%), Waspada (50%-74%), Bahaya (>=75%).
  - Estimasi probabilitas kelas model Random Forest ensemble (Aman, Waspada, Bahaya).
- **Integrasi Menyeluruh**:
  - `models/SensorData.js`: Menghitung risiko via `riskEngine.evaluateRisk()`, menyimpan parameter geoteknik (`vwc`, `slopeDeg`, `rainfall`, `weightedScore`, `scores`, `probabilities`).
  - `controllers/sensorController.js` & `controllers/loraController.js`: Menerima parameter geoteknik dan mem-broadcast via Socket.IO real-time.
  - `controllers/aiController.js`: Menyuntikkan 4 parameter geoteknik terkini ke konteks model LLaMA 3.2.
  - `whatsapp-bot/index.js`: Format notifikasi darurat dan command `!status` kini menampilkan metrik geoteknik lengkap.

---

## 7. Known Issues & Roadmap Berikutnya

1. **Konsumsi Memori WhatsApp Bot**:
   - **Kondisi**: `whatsapp-web.js` menjalankan browser headless (Puppeteer/Chromium) yang memakan RAM cukup besar (~300–500 MB) pada VPS kecil.
   - **Roadmap**: Pertimbangkan integrasi alternatif via Baileys (socket-based) jika VPS menghadapi keterbatasan memori.
2. **Database Concurrency**:
   - **Kondisi**: Flat JSON database memadai untuk prototipe pengujian lab/lapangan, namun perlu migrasi ke SQLite atau PostgreSQL jika node sensor bertambah banyak (> 10 alat).
3. **Penyempurnaan Dataset Training Lapangan**:
   - **Kondisi**: Dataset saat ini masih berbasis 40 skenario augmentasi grid.
   - **Roadmap**: Menambahkan data time-series curah hujan dinamis (misal data API BMKG lokal atau rain gauge sensor otomatis).
