// ===== MAP MODULE (Leaflet.js) =====
const MapModule = {
  map: null,
  deviceMarker: null,
  riskCircle: null,
  initialized: false,

  // Lokasi Statis Stasiun Pemantauan SLOPEX (Gedung Geofisika FMIPA UNPAD Jatinangor)
  STATIC_LAT: -6.92556,
  STATIC_LNG: 107.77383,
  LOCATION_LABEL: 'Gedung Geofisika FMIPA UNPAD Jatinangor',

  init() {
    if (this.initialized) return;

    const mapEl = document.getElementById('leaflet-map');
    if (!mapEl) return;

    this.map = L.map('leaflet-map', {
      center: [this.STATIC_LAT, this.STATIC_LNG],
      zoom: 18,
      zoomControl: true
    });
    
    // Layer OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a> contributors',
      maxZoom: 19
    }).addTo(this.map);

    // Custom icon untuk SLOPEX device
    const slopexIcon = L.divIcon({
      html: `
        <div style="
          background: linear-gradient(135deg, #0A2A66, #294E93);
          border: 3px solid #3174B2;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          width: 36px; height: 36px;
          box-shadow: 0 4px 12px rgba(1,31,75,0.4);
          display: flex; align-items: center; justify-content: center;
        ">
          <div style="transform: rotate(45deg); color: white; font-size: 14px; margin-left:2px; margin-top:2px;">
            📡
          </div>
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 36],
      popupAnchor: [0, -38]
    });

    // Tambah marker default perangkat SLOPEX pada lokasi statis
    this.deviceMarker = L.marker([this.STATIC_LAT, this.STATIC_LNG], { icon: slopexIcon })
      .addTo(this.map)
      .bindPopup(this.buildPopupContent(null));

    // Risk zone circle
    this.riskCircle = L.circle([this.STATIC_LAT, this.STATIC_LNG], {
      radius: 150,
      color: '#276749',
      fillColor: '#276749',
      fillOpacity: 0.15,
      weight: 2
    }).addTo(this.map);

    // Tambah kontrol skala
    L.control.scale({ imperial: false }).addTo(this.map);

    this.initialized = true;

    // Update dengan data terkini jika sudah ada
    if (AppState.latestSensor) {
      this.updateDeviceMarker(AppState.latestSensor);
    }
  },

  updateDeviceMarker(sensor) {
    if (!this.map || !sensor) return;

    // Selalu gunakan koordinat statis stasiun SLOPEX
    const lat = this.STATIC_LAT;
    const lng = this.STATIC_LNG;
    const risk = sensor.riskScore || 0;
    const deviceStatusStr = (sensor.statusDevice && sensor.statusDevice !== 'AMAN' && sensor.statusDevice !== 'WASPADA' && sensor.statusDevice !== 'BAHAYA')
      ? sensor.statusDevice 
      : 'ONLINE';

    // Pindahkan marker
    if (this.deviceMarker) {
      this.deviceMarker.setLatLng([lat, lng]);
      this.deviceMarker.setPopupContent(this.buildPopupContent(sensor));
    }

    // Update warna risk circle
    const color = risk >= 75 ? '#E53E3E' : risk >= 50 ? '#DD6B20' : '#276749';
    if (this.riskCircle) {
      this.riskCircle.setLatLng([lat, lng]);
      this.riskCircle.setStyle({
        color,
        fillColor: color
      });
    }

    // Update HTML text elements on map page
    const mapStatusEl = document.getElementById('map-status');
    const mapRiskEl = document.getElementById('map-risk');
    if (mapStatusEl) {
      mapStatusEl.textContent = deviceStatusStr;
      mapStatusEl.style.color = deviceStatusStr === 'ONLINE' ? '#276749' : '#E53E3E';
    }
    if (mapRiskEl) mapRiskEl.textContent = risk + '%';
  },

  buildPopupContent(sensor) {
    if (!sensor) {
      return `
        <div style="font-family: 'Inter', sans-serif; min-width: 220px;">
          <div style="font-weight: 700; color: #011F4B; font-size: 14px; margin-bottom: 8px;">
            📡 SLOPEX-001 (Stasiun Jatinangor)
          </div>
          <div style="color: #6497B1; font-size: 12px;">Menunggu data sensor...</div>
          <div style="margin-top:6px; font-size:11px; color:#6497B1;">
            📍 ${this.LOCATION_LABEL}
          </div>
        </div>
      `;
    }

    const deviceStatusStr = (sensor.statusDevice && sensor.statusDevice !== 'AMAN' && sensor.statusDevice !== 'WASPADA' && sensor.statusDevice !== 'BAHAYA')
      ? sensor.statusDevice 
      : 'ONLINE';
    const statusColor = deviceStatusStr === 'ONLINE' ? '#276749' : '#E53E3E';
    const risk = sensor.riskScore || 0;
    const time = sensor.timestamp ? new Date(sensor.timestamp).toLocaleString('id-ID') : '-';

    const s1 = sensor.soil1 != null ? sensor.soil1 : (sensor.soilDangkal != null ? sensor.soilDangkal : 0);
    const s2 = sensor.soil2 != null ? sensor.soil2 : (sensor.soilDalam != null ? sensor.soilDalam : 0);
    const mag = sensor.magnitude != null ? sensor.magnitude : 0;

    return `
      <div style="font-family: 'Inter', sans-serif; min-width: 230px; padding: 4px;">
        <div style="font-weight: 700; color: #011F4B; font-size: 14px; margin-bottom: 10px; display: flex; align-items: center; justify-content: space-between;">
          <span>📡 SLOPEX-001</span>
          <span style="background: ${statusColor}; color: white; padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: 600;">
            ${deviceStatusStr}
          </span>
        </div>
        <table style="width: 100%; font-size: 12px; border-collapse: collapse;">
          <tr><td style="color:#6497B1; padding: 2px 0;">Soil 1</td><td style="font-weight:600; color:#011F4B; text-align:right;">${s1.toFixed(1)}%</td></tr>
          <tr><td style="color:#6497B1; padding: 2px 0;">Soil 2</td><td style="font-weight:600; color:#011F4B; text-align:right;">${s2.toFixed(1)}%</td></tr>
          <tr><td style="color:#6497B1; padding: 2px 0;">Kemiringan</td><td style="font-weight:600; color:#011F4B; text-align:right;">${mag.toFixed(1)}°</td></tr>
          <tr><td style="color:#6497B1; padding: 2px 0;">Risk Score</td>
            <td style="font-weight:700; color:${risk >= 75 ? '#E53E3E' : risk >= 50 ? '#DD6B20' : '#276749'}; text-align:right;">${risk}%</td>
          </tr>
        </table>
        <div style="margin-top:8px; font-size:11px; color:#6497B1;">
          🕐 ${time}
        </div>
        <div style="margin-top:4px; font-size:11px; color:#6497B1;">
          📍 ${this.LOCATION_LABEL}
        </div>
      </div>
    `;
  },

  // Resize map ketika tab berubah
  refresh() {
    if (this.map) {
      setTimeout(() => this.map.invalidateSize(), 200);
    }
  }
};
