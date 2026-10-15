// ===== MAIN APP ORCHESTRATOR =====
const App = {
  currentPage: 'dashboard',
  pagesLoaded: new Set(),

  async initialize() {
    // Cek magic login
    const urlParams = new URLSearchParams(window.location.search);
    const magicToken = urlParams.get('magiclogin');
    if (magicToken) {
      try {
        const { ok, data } = await API.postPublic('/auth/magic-login', { token: magicToken });
        if (ok) {
          AppState.token = data.token;
          AppState.user = data.user;
          localStorage.setItem('slopex_token', data.token);
          localStorage.setItem('slopex_user', JSON.stringify(data.user));
          // Hapus token dari URL biar rapi
          window.history.replaceState({}, document.title, "/");
        } else {
          alert('Magic link gagal: ' + data.message);
        }
      } catch (err) {
        alert('Gagal menggunakan magic link: ' + err.message);
      }
    }

    if (!Auth.isLoggedIn()) {
      document.getElementById('auth-screen').style.display = 'flex';
      document.getElementById('app-wrapper').style.display = 'none';
      return;
    }

    // Refresh data user diam-diam di background agar nama/profil selalu terupdate
    try {
      const { ok, data } = await API.get('/auth/me');
      if (ok && data.user) {
        AppState.user = data.user;
        localStorage.setItem('slopex_user', JSON.stringify(data.user));
        Auth.updateUserUI();
      }
    } catch (e) {
      console.warn("Gagal refresh user data:", e.message);
    }

    // Sembunyikan auth screen, tampilkan app
    document.getElementById('auth-screen').style.display = 'none';
    document.getElementById('app-wrapper').style.display = 'flex';

    // Update UI user
    Auth.updateUserUI();

    // Koneksi Socket.IO
    SocketClient.connect();

    // Load dashboard
    await Dashboard.init();
    await Alerts.init();
    
    // Initialize Monitoring charts in background so they track real-time data seamlessly
    if (typeof Monitoring !== 'undefined') {
      await Monitoring.init();
      this.pagesLoaded.add('monitoring');
    }

    // Clear AI chat history and DOM content from previous user sessions
    AIChat.clearChat();

    console.log('✅ SLOPEX App initialized');
  },

  switchPage(pageId, navEl = null) {
    // Update halaman aktif
    this.currentPage = pageId;

    // Sembunyikan semua halaman
    document.querySelectorAll('.page-content').forEach(p => p.classList.remove('active'));
    const targetPage = document.getElementById('page-' + pageId);
    if (targetPage) targetPage.classList.add('active');

    // Update nav aktif
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    if (navEl) navEl.classList.add('active');

    // Lazy init halaman yang belum pernah dibuka
    if (!this.pagesLoaded.has(pageId)) {
      this.pagesLoaded.add(pageId);
      this.initPage(pageId);
    }

    // Khusus map: trigger resize
    if (pageId === 'map') {
      MapModule.init();
      MapModule.refresh();
    }

    // Tutup sidebar di mobile
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (sidebar && window.innerWidth < 768) {
      sidebar.classList.remove('mobile-open');
      if (overlay) overlay.classList.remove('visible');
    }

    // Sync mobile bottom nav active state
    document.querySelectorAll('.mobile-nav-item').forEach(item => item.classList.remove('active'));
    const mobNavEl = document.getElementById('mob-nav-' + pageId);
    if (mobNavEl) mobNavEl.classList.add('active');
  },

  async initPage(pageId) {
    switch (pageId) {
      case 'monitoring':
        await Monitoring.init();
        break;
      case 'map':
        MapModule.init();
        break;
      case 'reports':
        await Monitoring.renderSensorTable('reports-table-body');
        if (typeof Monitoring.loadReportsStats === 'function') {
          await Monitoring.loadReportsStats();
        }
        break;
      case 'settings':
        this.loadSettings();
        break;
    }
  },

  loadSettings() {
    if (!AppState.user) return;
    const set = (id, val) => { const e = document.getElementById(id); if (e) e.value = val; };
    set('settings-name',         AppState.user.name || '');
    set('settings-email',        AppState.user.email || '');
    set('settings-institution',  AppState.user.institution || '');
    set('settings-whatsapp',     AppState.user.whatsapp || '');
    set('settings-role-display', AppState.user.role ? AppState.user.role.charAt(0).toUpperCase() + AppState.user.role.slice(1) : '');
  }
};

// ===== GLOBAL HELPERS =====
function switchPage(pageId, navEl) {
  App.switchPage(pageId, navEl);
}

function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  if (sidebar) sidebar.classList.toggle('mobile-open');
  if (overlay) overlay.classList.toggle('visible');
}

function toggleNotif() {
  const panel = document.getElementById('notif-panel');
  if (!panel) return;
  const wasHidden = !panel.classList.contains('visible');
  panel.classList.toggle('visible');

  // When opening the panel, auto-mark visible unread notifications as read
  if (wasHidden) {
    autoReadVisibleNotifs();
    setupNotifObserver();
  } else {
    teardownNotifObserver();
  }
}

// IntersectionObserver instance for auto-reading scrolled-into-view notifications
let _notifObserver = null;

function setupNotifObserver() {
  teardownNotifObserver(); // clean up any previous observer
  const listEl = document.getElementById('notif-list');
  if (!listEl) return;

  _notifObserver = new IntersectionObserver((entries) => {
    let anyMarked = false;
    entries.forEach(entry => {
      if (entry.isIntersecting && entry.target.classList.contains('unread')) {
        entry.target.classList.remove('unread');
        const alertId = entry.target.dataset.id;
        if (alertId) {
          API.put(`/alerts/${alertId}/acknowledge`, {}).catch(() => {});
          // Mark in local state too
          const a = AppState.alerts.find(x => x.id === alertId);
          if (a) a.acknowledged = true;
        }
        anyMarked = true;
      }
    });
    if (anyMarked) updateNotifBadge();
  }, { root: listEl, threshold: 0.5 });

  // Observe all notification items
  listEl.querySelectorAll('.notif-item').forEach(item => {
    _notifObserver.observe(item);
  });
}

function teardownNotifObserver() {
  if (_notifObserver) {
    _notifObserver.disconnect();
    _notifObserver = null;
  }
}

function autoReadVisibleNotifs() {
  const listEl = document.getElementById('notif-list');
  if (!listEl) return;
  const listRect = listEl.getBoundingClientRect();
  let anyMarked = false;

  listEl.querySelectorAll('.notif-item.unread').forEach(item => {
    const itemRect = item.getBoundingClientRect();
    // Item is visible if it overlaps with the scroll container
    if (itemRect.top < listRect.bottom && itemRect.bottom > listRect.top) {
      item.classList.remove('unread');
      const alertId = item.dataset.id;
      if (alertId) {
        API.put(`/alerts/${alertId}/acknowledge`, {}).catch(() => {});
        const a = AppState.alerts.find(x => x.id === alertId);
        if (a) a.acknowledged = true;
      }
      anyMarked = true;
    }
  });
  if (anyMarked) updateNotifBadge();
}

function updateNotifBadge() {
  const unreadCount = document.querySelectorAll('.notif-item.unread').length;
  const dot = document.getElementById('notif-dot');
  if (dot) dot.style.display = unreadCount > 0 ? 'block' : 'none';
}

window.kirimPerintah = function(aksi) {
  const role = AppState.user?.role;
  if (role !== 'admin' && role !== 'operator') {
    showToast('Akses ditolak: Role Viewer tidak dapat mengontrol sirine', 'warning');
    return;
  }

  const isBuzzer = aksi === 'buzzer';
  const title = isBuzzer ? "Bunyikan Sirine?" : "Matikan Sirine?";
  const msg = isBuzzer 
    ? "Anda akan MEMBUNYIKAN SIRINE di lokasi lapangan.<br><br>Apakah Anda benar-benar yakin ingin melanjutkan?" 
    : "Anda akan MEMATIKAN SIRINE dan mereset status ke kondisi Standby.<br><br>Lanjutkan?";
  const type = isBuzzer ? 'danger' : 'info';

  window.showCustomConfirm(title, msg, type, () => {
    fetch('/api/downlink', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AppState.token || ''}`
      },
      body: JSON.stringify({ action: aksi })
    }).then(res => res.json())
    .then(data => {
      if (data.success && data.demoMode) {
        showToast("🔒 Mode Demo: Perintah diterima tapi tidak dikirim ke alat fisik.", 'warning');
      } else if (data.success) {
        showToast("Perintah '" + aksi.toUpperCase() + "' berhasil dikirim ke alat.", 'success');
      } else {
        showToast("Gagal mengirim perintah: " + (data.error || ''), 'danger');
      }
    }).catch(err => {
      showToast("Gagal mengirim perintah: " + err.message, 'danger');
    });
  });
};

function showToast(msg, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  const icons = {
    success: 'fa-circle-check',
    warning: 'fa-triangle-exclamation',
    danger: 'fa-radiation',
    info: 'fa-circle-info'
  };

  toast.className = 'toast ' + (type !== 'info' ? type : '');
  toast.innerHTML = `<i class="fas ${icons[type] || icons.info}"></i><span>${msg}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

function showNodeDetail(node) {
  showToast(`Node ${node} — membuka detail monitoring`, 'info');
  App.switchPage('monitoring');
}

async function exportData() {
  if (!AppState.latestSensor) {
    showToast('Tidak ada data untuk diexport', 'warning');
    return;
  }
  showToast('Mengunduh data sensor...', 'info');
  try {
    const { ok, data } = await API.get('/sensor/history?hours=24&limit=1000');
    if (!ok) { showToast('Gagal mengambil data', 'danger'); return; }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `slopex-data-${new Date().toISOString().slice(0,10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('Data berhasil diunduh!', 'success');
  } catch (e) {
    showToast('Error export: ' + e.message, 'danger');
  }
}

async function exportCSV() {
  if (!AppState.latestSensor) {
    showToast('Tidak ada data untuk diexport', 'warning');
    return;
  }
  showToast('Mengunduh data sensor (CSV)...', 'info');
  try {
    const { ok, data } = await API.get('/sensor/history?hours=24&limit=1000');
    if (!ok || !data.data) { showToast('Gagal mengambil data', 'danger'); return; }

    let csvContent = "\uFEFFWaktu,Soil Dangkal (%),Soil Dalam (%),Magnitude (\u00B0),V Solar (V),I Solar (mA),V Aki (V),I Aki (mA),Status,Relay\n";
    data.data.forEach(row => {
      const time = new Date(row.createdAt).toLocaleString('id-ID');
      const statusTeks = row.statusDevice || 'AMAN';
      const statusRelay = row.statusRelay || 'MATI (STANDBY)';
      csvContent += `"${time}",${(row.soilDangkal || row.soil1 || 0).toFixed(1)},${(row.soilDalam || row.soil2 || 0).toFixed(1)},${(row.magnitude || row.tiltX || 0).toFixed(2)},${(row.vSolar || 0).toFixed(2)},${row.iSolar || 0},${(row.vAki || 0).toFixed(2)},${row.iAki || 0},"${statusTeks}","${statusRelay}"\r\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `slopex-data-${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('Data CSV berhasil diunduh!', 'success');
  } catch (e) {
    showToast('Error export CSV: ' + e.message, 'danger');
  }
}

async function saveSettings() {
  const name = document.getElementById('settings-name')?.value;
  const institution = document.getElementById('settings-institution')?.value;
  const whatsapp = document.getElementById('settings-whatsapp')?.value;

  try {
    const { ok, data } = await API.put('/auth/profile', { name, institution, whatsapp });
    if (ok) {
      AppState.user = { ...AppState.user, name, institution, whatsapp: data.user.whatsapp };
      localStorage.setItem('slopex_user', JSON.stringify(AppState.user));
      Auth.updateUserUI();
      showToast('Profil berhasil disimpan!', 'success');
    } else {
      showToast(data.message || 'Gagal menyimpan', 'danger');
    }
  } catch (e) {
    showToast('Error: ' + e.message, 'danger');
  }
}

// Close notif on outside click
document.addEventListener('click', (e) => {
  const panel = document.getElementById('notif-panel');
  if (panel?.classList.contains('visible')) {
    if (!panel.contains(e.target) && !e.target.closest('[onclick*="toggleNotif"]')) {
      panel.classList.remove('visible');
      teardownNotifObserver();
    }
  }
});

// ==================== CUSTOM CONFIRM MODAL ====================
window.showCustomConfirm = function(title, message, type, onConfirm) {
  const modal = document.getElementById('custom-confirm-modal');
  const box = document.getElementById('custom-confirm-box');
  const icon = document.getElementById('custom-confirm-icon');
  const titleEl = document.getElementById('custom-confirm-title');
  const msgEl = document.getElementById('custom-confirm-msg');
  const btnCancel = document.getElementById('custom-confirm-cancel');
  const btnOk = document.getElementById('custom-confirm-ok');

  if (!modal) return; // Fallback jika HTML modal tidak ada

  // Konfigurasi tipe
  if (type === 'danger') {
    icon.style.background = 'rgba(229,62,62,0.15)';
    icon.style.color = 'var(--danger)';
    icon.innerHTML = '<i class="fas fa-exclamation-triangle"></i>';
    btnOk.style.background = 'var(--danger)';
  } else {
    icon.style.background = 'rgba(100,151,177,0.15)';
    icon.style.color = 'var(--blue-medium)';
    icon.innerHTML = '<i class="fas fa-circle-info"></i>';
    btnOk.style.background = 'var(--blue-medium)';
  }

  titleEl.textContent = title;
  msgEl.innerHTML = message;

  modal.style.display = 'flex';
  
  // Animasi masuk
  setTimeout(() => {
    modal.style.opacity = '1';
    box.style.transform = 'translateY(0)';
  }, 10);

  const closeModal = () => {
    modal.style.opacity = '0';
    box.style.transform = 'translateY(-20px)';
    setTimeout(() => { modal.style.display = 'none'; }, 300);
    
    // Hapus Event Listener agar tidak double click
    btnCancel.removeEventListener('click', handleCancel);
    btnOk.removeEventListener('click', handleOk);
  };

  const handleCancel = () => closeModal();
  const handleOk = () => {
    closeModal();
    if (typeof onConfirm === 'function') onConfirm();
  };

  btnCancel.addEventListener('click', handleCancel);
  btnOk.addEventListener('click', handleOk);
};

// ===== BOOT =====
document.addEventListener('DOMContentLoaded', () => {
  App.initialize();
});
