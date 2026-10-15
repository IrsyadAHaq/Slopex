// ===== SOCKET.IO CLIENT =====
const SocketClient = {
  connect() {
    if (AppState.socket?.connected) return;

    AppState.socket = io(SLOPEX_CONFIG.WS_URL, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 2000
    });

    AppState.socket.on('connect', () => {
      console.log('🔌 Socket.IO terhubung:', AppState.socket.id);
      // Minta data terbaru segera setelah connect
      AppState.socket.emit('requestLatest');
      updateConnectionStatus(true);
    });

    AppState.socket.on('disconnect', () => {
      console.warn('🔌 Socket.IO terputus');
      updateConnectionStatus(false);
    });

    AppState.socket.on('reconnect', (attempt) => {
      console.log(`🔌 Reconnected setelah ${attempt} percobaan`);
      updateConnectionStatus(true);
    });

    // ===== EVENT: Data sensor baru dari ESP32 =====
    AppState.socket.on('sensorUpdate', (data) => {
      console.log('📡 Data sensor baru:', data);
      AppState.latestSensor = data;
      Dashboard.updateReadings(data);
      Dashboard.updateStatusBadge(data.statusDevice || data.status, data.riskScore);
      MapModule.updateDeviceMarker(data);

      // Update halaman Devices — Kesehatan Daya & Baterai (real-time dari alat)
      if (data.vAki != null) {
        const vAki = data.vAki;
        const vAkiEl = document.getElementById('val-vAki');
        if (vAkiEl) vAkiEl.textContent = typeof vAki === 'number' ? vAki.toFixed(2) : vAki;

        // Estimasi level baterai: 11V = 0%, 14.4V = 100% (aki 12V lead-acid)
        const battPct = Math.max(0, Math.min(100, Math.round(((vAki - 11.0) / (14.4 - 11.0)) * 100)));
        const battEl = document.getElementById('dev-batt-level');
        const battBar = document.getElementById('dev-batt-bar');
        if (battEl) battEl.textContent = battPct + '%';
        if (battBar) {
          battBar.style.width = battPct + '%';
          battBar.style.background = battPct <= 20 ? 'var(--danger)' : battPct <= 40 ? 'var(--warning)' : 'var(--success)';
        }
      }
      if (data.iAki != null) {
        const iAkiEl = document.getElementById('val-iAki');
        if (iAkiEl) iAkiEl.textContent = data.iAki;
      }

      // Update Panel Surya
      if (data.vSolar != null) {
        const vSolEl = document.getElementById('val-vSolar');
        if (vSolEl) vSolEl.textContent = typeof data.vSolar === 'number' ? data.vSolar.toFixed(2) : data.vSolar;
      }
      if (data.iSolar != null) {
        const iSolEl = document.getElementById('val-iSolar');
        if (iSolEl) iSolEl.textContent = data.iSolar;
      }

      // Update tabel riwayat daya secara real-time
      if (typeof Dashboard !== 'undefined' && Dashboard.prependPowerHistoryRow) {
        Dashboard.prependPowerHistoryRow(data);
      }

      // Update Buck Converter
      if (data.vBuck != null) {
        const buckEl = document.getElementById('dev-voltage');
        if (buckEl) buckEl.textContent = typeof data.vBuck === 'number' ? data.vBuck.toFixed(2) + ' V' : data.vBuck + ' V';
      }

      // Update "Data Terakhir" pada devices page
      if (data.timestamp) {
        const lastSeenEl = document.getElementById('dev-last-seen');
        if (lastSeenEl) {
          lastSeenEl.textContent = new Date(data.timestamp).toLocaleTimeString('id-ID', {
            hour: '2-digit', minute: '2-digit', second: '2-digit'
          });
        }
      }
    });

    // ===== EVENT: Alert baru =====
    AppState.socket.on('newAlert', (alert) => {
      console.log('🚨 Alert baru:', alert);
      AppState.alerts.unshift(alert);
      Alerts.addNotification(alert);
      showToast(alert.title, alert.severity === 'danger' ? 'danger' : 'warning');

      // Update bell dot badge
      updateNotifBadge();

      // Buka notif-panel otomatis agar notifikasi baru langsung turun/terlihat
      const panel = document.getElementById('notif-panel');
      if (panel && !panel.classList.contains('visible')) {
        panel.classList.add('visible');
        // Setup observer & auto-read visible ones
        autoReadVisibleNotifs();
        setupNotifObserver();
      } else if (panel && panel.classList.contains('visible')) {
        // Panel already open — observe the newly prepended item
        const listEl = document.getElementById('notif-list');
        if (_notifObserver && listEl) {
          const firstItem = listEl.querySelector('.notif-item');
          if (firstItem) _notifObserver.observe(firstItem);
        }
      }
    });

    // ===== EVENT: Drainase berubah (manual & otomatis) =====
    AppState.socket.on('drainageUpdate', (data) => {
      AppState.drainageOpen = data.isOpen;
      Dashboard.updateDrainageUI(data.isOpen);

      const isAuto    = data.trigger === 'auto';
      const action    = data.isOpen ? 'dibuka' : 'ditutup';
      const trigger   = isAuto ? 'OTOMATIS (Risk Score ' + data.riskScore + '%)' : 'oleh ' + data.by;
      const toastType = data.isOpen ? 'warning' : 'success';

      showToast(`Drainase ${action} - ${trigger}`, toastType);

      // Reload log drainase jika halaman drainage aktif
      const drainPage = document.getElementById('page-drainage');
      if (drainPage && drainPage.classList.contains('active')) {
        loadDrainageLogs();
      }
    });

    // ===== EVENT: Mode drainase berubah =====
    AppState.socket.on('drainageModeUpdate', (data) => {
      AppState.drainageMode = data.mode;
      Dashboard.updateDrainageModeUI(data.mode);
      showToast(`Mode drainase diubah ke ${data.mode.toUpperCase()}`, 'info');
    });
  },

  disconnect() {
    if (AppState.socket) {
      AppState.socket.disconnect();
      AppState.socket = null;
    }
  }
};

function updateConnectionStatus(connected) {
  const indicator = document.getElementById('connection-status');
  const text = document.getElementById('connection-text');

  if (indicator) {
    indicator.style.background = connected ? '#48BB78' : '#E53E3E';
  }
  if (text) {
    text.textContent = connected ? 'Live' : 'Offline';
    text.style.color = connected ? '#48BB78' : '#E53E3E';
  }
}
