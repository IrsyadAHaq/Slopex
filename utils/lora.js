const http = require('http');

const CHIRPSTACK_API_KEY = process.env.CHIRPSTACK_API_KEY || "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJjaGlycHN0YWNrIiwiaXNzIjoiY2hpcnBzdGFjayIsInN1YiI6IjExNTk5MDM5LTg5OWUtNDJjYS1iNmU2LTA1NTA5NzU3YzI2YSIsInR5cCI6ImtleSJ9.fkLrMdXQCY61OUUZUfCE0qLRwyqI0m_1lRGvc7bf5UA"; 
const DEV_EUI = process.env.DEV_EUI || "c43a28a44e6e9ac3"; 
const CHIRPSTACK_HOST = process.env.CHIRPSTACK_HOST || '172.16.0.204';
const CHIRPSTACK_PORT = process.env.CHIRPSTACK_PORT || 8090;

function sendDownlink(action) {
  return new Promise((resolve, reject) => {
    let payloadBase64 = "";
    if (action === "relay" || action === "open") {
      payloadBase64 = "AQ=="; // 0x01 (relay/pompa menyala)
    } else if (action === "buzzer") {
      payloadBase64 = "Ag=="; // 0x02 (buzzer/sirine menyala)
    } else if (action === "reset" || action === "close" || action === "off") {
      payloadBase64 = "AA=="; // 0x00 (standby/kembali ke otomatis/matikan semua)
    } else {
      return reject(new Error("Perintah tidak dikenali: " + action));
    }

    const data = JSON.stringify({
      queueItem: {
        devEui: DEV_EUI, 
        confirmed: false,
        data: payloadBase64,
        fPort: 10
      }
    });

    const options = {
      hostname: CHIRPSTACK_HOST,
      port: CHIRPSTACK_PORT,
      path: `/api/devices/${DEV_EUI}/queue`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Grpc-Metadata-Authorization': `Bearer ${CHIRPSTACK_API_KEY}`
      }
    };

    console.log(`[CHIRPSTACK-DOWNLINK] Mengirim perintah '${action}' (payload: ${payloadBase64}) ke ${CHIRPSTACK_HOST}:${CHIRPSTACK_PORT}`);

    const request = http.request(options, (response) => {
      let responseBody = '';
      response.on('data', (chunk) => {
        responseBody += chunk;
      });

      response.on('end', () => {
        if (response.statusCode >= 200 && response.statusCode < 300) {
          console.log(`[CHIRPSTACK-DOWNLINK] ✅ Sukses mengirim perintah '${action}'!`);
          resolve({ success: true, payloadBase64 });
        } else {
          console.warn(`[CHIRPSTACK-DOWNLINK] ❌ Ditolak ChirpStack. Status: ${response.statusCode}`);
          reject(new Error(`Ditolak ChirpStack (Status: ${response.statusCode}). Detail: ${responseBody}`));
        }
      });
    });

    request.on('error', (error) => {
      console.error(`[CHIRPSTACK-DOWNLINK] ❌ Gagal terhubung ke ChirpStack:`, error.message);
      reject(new Error(`Gagal terhubung ke peladen ChirpStack: ${error.message}`));
    });

    request.write(data);
    request.end();
  });
}

module.exports = { sendDownlink };
