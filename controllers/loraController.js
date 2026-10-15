const http = require('http');
const jwt = require('jsonwebtoken');
const SensorData = require('../models/SensorData');
const User = require('../models/User');
const sensorController = require('./sensorController');

let io = null;
let sseClients = [];

// Cache internal untuk menggabungkan FPort 1 & FPort 2 dari ChirpStack
let sensorCache = {
    deviceId: 'SLOPEX-001',
    soilDangkal: 0,
    soilDalam: 0,
    magnitude: 0,
    vSolar: 0,
    iSolar: 0,
    vAki: 0,
    iAki: 0,
    statusRelay: 'MATI (STANDBY)'
};

const loraController = {
    setIO(ioInstance) {
        io = ioInstance;
    },

    // SSE Endpoint handler (/events)
    handleSSE(req, res) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders();
        sseClients.push(res);
        req.on('close', () => {
            sseClients = sseClients.filter(c => c !== res);
        });
    },

    // Webhook ChirpStack handler (/webhook & /api/lora/webhook)
    async handleWebhook(req, res) {
        try {
            const payload = req.body;
            
            if (payload && payload.data) {
                const buf = Buffer.from(payload.data, 'base64');
                const fPort = payload.fPort;
                let dataUpdated = false;

                if (fPort === 1 && buf.length === 6) {
                    // 1. DECODE PAKET GEOTEKNIK (6 Byte)
                    sensorCache.soilDangkal = buf.readUInt8(0);
                    sensorCache.soilDalam = buf.readUInt8(1);
                    sensorCache.magnitude = parseFloat((buf.readUInt16BE(2) / 100).toFixed(2));
                    sensorCache.statusRelay = buf.readUInt8(5) === 1 ? 'MENYALA (AKTIF)' : 'MATI (STANDBY)';

                    console.log("\n[WEBHOOK] DATA GEOTEKNIK MASUK (FPort 1)");
                    dataUpdated = true;

                } else if (fPort === 2 && buf.length === 8) {
                    // 2. DECODE PAKET ENERGI (8 Byte)
                    sensorCache.vSolar = parseFloat((buf.readUInt16BE(0) / 100).toFixed(2));
                    sensorCache.iSolar = buf.readInt16BE(2);
                    sensorCache.vAki = parseFloat((buf.readUInt16BE(4) / 100).toFixed(2));
                    sensorCache.iAki = buf.readInt16BE(6);

                    console.log("\n[WEBHOOK] DATA ENERGI MASUK (FPort 2)");
                    dataUpdated = true;

                } else {
                    console.log(`[PERINGATAN] Mengabaikan payload: Panjang data ${buf.length} byte di FPort ${fPort}.`);
                }

                // Jika ada data yang diupdate, simpan ke Database
                if (dataUpdated) {
                    const doc = await SensorData.create(sensorCache);

                    // Cek Alert & Auto Drainase
                    await sensorController.checkAndCreateAlert(doc);
                    await sensorController.checkAutoDrainage(doc);

                    // Broadcast ke Web Real-time via Socket.IO
                    if (io) {
                        io.emit('sensorUpdate', {
                            deviceId:     doc.deviceId,
                            soilDangkal:  doc.soilDangkal,
                            soil1:        doc.soil1,
                            soilDalam:    doc.soilDalam,
                            soil2:        doc.soil2,
                            magnitude:    doc.magnitude,
                            tiltX:        doc.tiltX,
                            tiltY:        doc.tiltY,
                            gpsLat:       doc.gpsLat,
                            gpsLng:       doc.gpsLng,
                            riskScore:    doc.riskScore,
                            statusDevice: doc.statusDevice,
                            vSolar:       doc.vSolar,
                            iSolar:       doc.iSolar,
                            vBuck:        doc.vBuck,
                            iBuck:        doc.iBuck,
                            vAki:         doc.vAki,
                            iAki:         doc.iAki,
                            statusRelay:  doc.statusRelay,
                            timestamp:    doc.createdAt
                        });
                    }

                    // Broadcast ke endpoint SSE
                    const timeStr = new Date(doc.createdAt).toLocaleTimeString('id-ID');
                    sseClients.forEach(client => {
                        client.write(`data: ${JSON.stringify({
                            waktu: timeStr,
                            soilDangkal: doc.soilDangkal,
                            soilDalam: doc.soilDalam,
                            magnitude: doc.magnitude,
                            vSolar: doc.vSolar,
                            iSolar: doc.iSolar,
                            vAki: doc.vAki,
                            iAki: doc.iAki,
                            statusRelay: doc.statusRelay
                        })}\n\n`);
                    });

                    console.log('[WEBHOOK] Data Cache Berhasil Disimpan ke Database!');
                }
            }
            res.status(200).send('Webhook Diterima');
        } catch (error) {
            console.error("[WEBHOOK] Gagal memproses:", error);
            res.status(500).send('Error');
        }
    },

    // Downlink handler (/api/downlink & /api/lora/downlink)
    async handleDownlink(req, res) {
        const aksi = req.body.action;

        console.log(`\n====================================================`);
        console.log(`[DOWNLINK] Aksi yang diminta: ${aksi}`);

        const CHIRPSTACK_API_KEY = process.env.CHIRPSTACK_API_KEY || ""; 
        const DEV_EUI = process.env.CHIRPSTACK_DEV_EUI || "c43a28a44e6e9ac3"; 
        const CHIRPSTACK_IP = process.env.CHIRPSTACK_IP || "172.16.0.204";
        const CHIRPSTACK_PORT = parseInt(process.env.CHIRPSTACK_PORT, 10) || 8090;

        // ===== CEK AKUN DEMO =====
        let isDemo = false;
        try {
            const authHeader = req.headers.authorization;
            if (authHeader && authHeader.startsWith('Bearer ')) {
                const token = authHeader.split(' ')[1];
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                const user = await User.findById(decoded.id);
                if (user && user.role !== 'admin' && user.role !== 'operator') {
                    console.log(`[DOWNLINK] ❌ Akses ditolak untuk role '${user.role}' (${user.email}).`);
                    return res.status(403).json({ success: false, error: 'Akses ditolak. Role Viewer tidak dapat mengontrol sirine.' });
                }
                if (user && user.isDemo) {
                    isDemo = true;
                    console.log(`[DOWNLINK] ⚠️  Akun DEMO terdeteksi (${user.email}). Perintah TIDAK dikirim ke hardware.`);
                }
            }
        } catch (e) {
            // Token tidak valid / tidak ada — lanjut
        }

        // Jika demo, balas sukses tapi tidak kirim ke ChirpStack
        if (isDemo) {
            return res.status(200).json({
                success: true,
                demoMode: true,
                message: `[DEMO] Perintah '${aksi}' diterima — tidak dikirim ke alat (mode demonstrasi).`
            });
        }

        let dataBase64 = "";
        if (aksi === "relay" || aksi === "on" || aksi === "off") {
            dataBase64 = "AQ==";
        } else if (aksi === "buzzer") {
            dataBase64 = "Ag==";
        } else if (aksi === "reset") {
            dataBase64 = "AA==";
        } else {
            console.log(`[GAGAL] Perintah tidak dikenali: ${aksi}`);
            return res.status(400).json({ success: false, error: "Aksi tidak dikenali" });
        }

        try {
            const data = JSON.stringify({
                queueItem: {
                    devEui: DEV_EUI, 
                    confirmed: false,
                    data: dataBase64,
                    fPort: 10
                }
            });

            const options = {
                hostname: CHIRPSTACK_IP,
                port: CHIRPSTACK_PORT,
                path: `/api/devices/${DEV_EUI}/queue`,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Grpc-Metadata-Authorization': `Bearer ${CHIRPSTACK_API_KEY}`
                }
            };

            const request = http.request(options, (response) => {
                let responseBody = '';
                response.on('data', (chunk) => {
                    responseBody += chunk;
                });

                response.on('end', () => {
                    if (response.statusCode >= 200 && response.statusCode < 300) {
                        console.log(`[DOWNLINK] Perintah '${aksi}' berhasil masuk antrean ChirpStack!`);
                        res.status(200).json({ success: true, message: `Sukses mengirim perintah ${aksi}!` });
                    } else {
                        console.log(`[DOWNLINK] Ditolak ChirpStack. Status: ${response.statusCode}`);
                        res.status(500).json({ success: false, error: "Ditolak ChirpStack", details: responseBody }); 
                    }
                });
            });

            request.on('error', (error) => {
                console.error(`[DOWNLINK] Gagal terhubung ke ChirpStack:`, error.message);
                res.status(500).json({ success: false, error: "Gagal terhubung ke peladen ChirpStack" });
            });

            request.write(data);
            request.end();

        } catch (error) {
            console.error(`[DOWNLINK] Error:`, error);
            res.status(500).json({ success: false, error: "Terjadi kesalahan internal" });
        }
    }
};

module.exports = loraController;
