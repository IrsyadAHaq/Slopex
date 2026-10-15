// ===== DASHBOARD MODULE =====
const Dashboard = {
  charts: {},
  currentHours: 1,
  currentLimit: 60,
  powerFilterDays: 1,

  async init() {
    await this.loadLatestData();
    await this.loadHistory();
    await this.loadStats();
    await this.loadDrainageStatus();
  },

  async loadLatestData() {
    try {
      const { ok, data } = await API.get('/sensor/latest');
      if (ok && data.data) {
        AppState.latestSensor = data.data;
        this.updateReadings(data.data);
        this.updateStatusBadge(data.data.statusDevice, data.data.riskScore);
        MapModule.updateDeviceMarker(data.data);
      } else {
        this.showNoDataState();
      }
    } catch (e) {
      console.error('Load latest error:', e);
    }
  },

  async loadHistory() {
    try {
      // Load default 1 hour for trend chart
      const resChart = await API.get('/sensor/history?hours=1&limit=60');
      if (resChart.ok && resChart.data.data) {
        this.renderHistoryChart(resChart.data.data);
      }
      // Load default 24 hours for power history table (matches default '1 Hari' active filter)
      const resPower = await API.get('/sensor/history?hours=24&limit=1000');
      if (resPower.ok && resPower.data.data) {
        this.renderPowerHistoryTable(resPower.data.data);
      }
    } catch (e) {
      console.error('Load history error:', e);
    }
  },

  async loadStats() {
    try {
      const { ok, data } = await API.get('/sensor/stats');
      if (ok && data.stats) {
        const s = data.stats;
        this.setElText('stat-total-readings', s.readings24h != null ? s.readings24h : '--');
        this.setElText('stat-max-risk', (s.maxRisk24h != null ? s.maxRisk24h : '--') + '%');
      }
    } catch (e) {
      console.error('Load stats error:', e);
    }
  },

  async loadDrainageStatus() {
    try {
      const { ok, data } = await API.get('/drainage/status');
      if (ok) {
        AppState.drainageOpen = data.state?.isOpen || false;
        AppState.drainageMode = data.state?.mode || 'auto';
        this.updateDrainageUI(AppState.drainageOpen);
        this.updateDrainageModeUI(AppState.drainageMode);
      }
    } catch (e) {
      console.error('Load drainage error:', e);
    }
  },

  updateReadings(sensor) {
    if (!sensor) return;

    // Summary top cards
    const s1 = sensor.soilDangkal || 0;
    const s2 = sensor.soilDalam || 0;
    const mag = sensor.magnitude || 0;
    const risk = sensor.riskScore || 0;

    this.setElText('val-soilDangkal', s1.toFixed(1));
    this.setElText('val-soilDalam', s2.toFixed(1));
    this.setElText('val-magnitude', typeof mag === 'number' ? mag.toFixed(2) : mag);
    
    this.setElText('val-vSolar', sensor.vSolar != null ? sensor.vSolar : '--');
    this.setElText('val-iSolar', sensor.iSolar != null ? sensor.iSolar : '--');
    this.setElText('val-vBuck', sensor.vBuck != null ? sensor.vBuck : '--');
    this.setElText('val-iBuck', sensor.iBuck != null ? sensor.iBuck : '--');
    this.setElText('val-vAki', sensor.vAki != null ? sensor.vAki : '--');
    this.setElText('val-iAki', sensor.iAki != null ? sensor.iAki : '--');

    const relayEl = document.getElementById('val-relay');
    if (relayEl) {
      relayEl.textContent = sensor.statusRelay || 'STANDBY';
      relayEl.style.background = (sensor.statusRelay && sensor.statusRelay.includes('AKTIF')) ? 'var(--success)' : 'var(--bg-tertiary)';
    }

    // Risk value
    const riskValEl = document.getElementById('risk-score-val');
    if (riskValEl) riskValEl.innerHTML = risk + '<span>%</span>';

    // Risk gauge fill (if exists)
    const gaugeEl = document.getElementById('risk-gauge-fill');
    if (gaugeEl) {
      gaugeEl.style.width = risk + '%';
      gaugeEl.style.background = risk >= 75 ? '#E53E3E' : risk >= 50 ? '#DD6B20' : '#276749';
    }

    // Timestamp
    if (sensor.timestamp) {
      const time = new Date(sensor.timestamp).toLocaleTimeString('id-ID', {
        hour: '2-digit', minute: '2-digit', second: '2-digit'
      });
      this.setElText('last-update-time', time);
    }

    // Status badge
    this.updateStatusBadge(sensor.statusDevice, risk);

    // Update Tingkat Risiko Longsor Panel (Row 2)
    const ringVal = document.getElementById('risk-ring-val');
    if (ringVal) ringVal.textContent = risk + '%';
    const ring = document.getElementById('risk-ring');
    if (ring) {
      const offset = 251.2 - (251.2 * risk / 100);
      ring.style.strokeDashoffset = offset;
      ring.style.stroke = risk >= 75 ? '#E53E3E' : risk >= 50 ? '#DD6B20' : '#276749';
    }
    const rBadge = document.getElementById('risk-detail-badge');
    if (rBadge) {
      const resolved = sensor.statusDevice || (risk >= 75 ? 'BAHAYA' : risk >= 50 ? 'WASPADA' : 'AMAN');
      rBadge.textContent = resolved;
      rBadge.className = 'summary-status-badge ' + (resolved === 'BAHAYA' ? 'badge-danger' : resolved === 'WASPADA' ? 'badge-warning' : 'badge-safe');
    }

    const brS1 = document.getElementById('risk-breakdown-s1'); if (brS1) brS1.textContent = s1.toFixed(1) + '%';
    const brS2 = document.getElementById('risk-breakdown-s2'); if (brS2) brS2.textContent = s2.toFixed(1) + '%';
    const brTilt = document.getElementById('risk-breakdown-tilt'); 
    if (brTilt) brTilt.textContent = typeof mag === 'number' ? mag.toFixed(2) + '°' : mag + '°';

    const bS1 = document.getElementById('risk-br-s1'); if (bS1) bS1.style.width = Math.min(100, s1) + '%';
    const bS2 = document.getElementById('risk-br-s2'); if (bS2) bS2.style.width = Math.min(100, s2) + '%';
    const bTilt = document.getElementById('risk-br-tilt'); if (bTilt) bTilt.style.width = Math.min(100, (mag / 90) * 100) + '%';

    // Update real-time history chart
    if (this.charts.history && sensor.timestamp) {
      const chart = this.charts.history;
      const timeLabel = new Date(sensor.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
      chart.data.labels.push(timeLabel);
      chart.data.datasets[0].data.push(s1);
      chart.data.datasets[1].data.push(s2);
      chart.data.datasets[2].data.push(mag);
      chart.data.datasets[3].data.push(risk);

      const maxLimit = Dashboard.currentLimit || 60;
      if (chart.data.labels.length > maxLimit) {
        chart.data.labels.shift();
        chart.data.datasets.forEach(ds => ds.data.shift());
      }
      chart.update();
    }

    // Also update monitoring page
    if (typeof Monitoring !== 'undefined') Monitoring.updateReadings(sensor);

    // Update AI tab sidebar snapshot
    this.setElText('ai-soilDangkal', s1.toFixed(1));
    this.setElText('ai-soilDalam', s2.toFixed(1));
    this.setElText('ai-magnitude', typeof mag === 'number' ? mag.toFixed(1) : parseFloat(mag).toFixed(1));
    const aiRiskEl = document.getElementById('ai-risk');
    if (aiRiskEl) {
      aiRiskEl.textContent = risk + '%';
      aiRiskEl.style.color = risk >= 75 ? 'var(--danger)' : risk >= 50 ? 'var(--warning)' : 'var(--success)';
    }
  },

  updateStatusBadge(status, riskScore) {
    const badge = document.getElementById('status-badge-main');
    if (!badge) return;

    const resolved = status ||
      (riskScore >= 75 ? 'BAHAYA' : riskScore >= 50 ? 'WASPADA' : 'AMAN');

    badge.textContent = resolved;
    badge.className = 'scard-badge ' + (
      resolved === 'BAHAYA' ? 'badge-danger' :
      resolved === 'WASPADA' ? 'badge-warning' : 'badge-safe'
    );
  },

  updateDrainageUI(isOpen) {
    const btn1 = document.getElementById('drainage-toggle-btn');
    const btn2 = document.getElementById('drainage-main-btn');
    const statusEl = document.getElementById('drainage-status-text');
    const ledEl = document.getElementById('drainage-led');

    const updateBtn = (b) => {
      if (!b) return;
      b.textContent = isOpen ? '🔒 Tutup Drainase' : '🔓 Buka Drainase';
      b.className = isOpen ? 'control-btn danger' : 'control-btn success';
      b.disabled = false;
    };

    updateBtn(btn1);
    updateBtn(btn2);

    if (statusEl) {
      statusEl.textContent = isOpen ? 'AKTIF — Katup Terbuka' : 'STANDBY — Katup Tertutup';
      statusEl.style.color = isOpen ? 'var(--danger)' : 'var(--success)';
    }
    if (ledEl) {
      ledEl.style.background = isOpen ? '#E53E3E' : '#48BB78';
      ledEl.style.boxShadow = isOpen ? '0 0 12px #E53E3E' : '0 0 12px #48BB78';
    }
  },

  renderHistoryChart(historyData) {
    const ctx = document.getElementById('history-chart');
    if (!ctx) return;

    if (this.charts.history) { this.charts.history.destroy(); this.charts.history = null; }

    const labels = historyData.map(d =>
      new Date(d.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    );

    this.charts.history = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Soil Dangkal (%)',
            data: historyData.map(d => d.soilDangkal || d.soil1 || 0),
            borderColor: '#3174B2',
            backgroundColor: 'rgba(49,116,178,0.08)',
            borderWidth: 2, pointRadius: 0, tension: 0.4, fill: true
          },
          {
            label: 'Soil Dalam (%)',
            data: historyData.map(d => d.soilDalam || d.soil2 || 0),
            borderColor: '#2A68A7',
            backgroundColor: 'rgba(42,104,167,0.08)',
            borderWidth: 2, pointRadius: 0, tension: 0.4, fill: true
          },
          {
            label: 'Kemiringan (°)',
            data: historyData.map(d => d.magnitude || 0),
            borderColor: '#F6AD55',
            backgroundColor: 'rgba(246,173,85,0.08)',
            borderWidth: 2, pointRadius: 0, tension: 0.4, fill: false
          },
          {
            label: 'Risk Score (%)',
            data: historyData.map(d => d.riskScore),
            borderColor: '#E53E3E',
            backgroundColor: 'rgba(229,62,62,0.04)',
            borderWidth: 2, pointRadius: 0, tension: 0.4, fill: false
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        layout: { padding: { bottom: 4 } },
        plugins: {
          legend: {
            position: 'top',
            labels: { color: '#294E93', font: { size: 11 }, boxWidth: 20, padding: 16 }
          },
          tooltip: { mode: 'index', intersect: false }
        },
        scales: {
          x: {
            ticks: { color: '#6497B1', maxTicksLimit: 8, font: { size: 10 } },
            grid: { color: 'rgba(100,151,177,0.1)' },
            border: { display: false }
          },
          y: {
            min: 0, max: 100,
            ticks: { color: '#6497B1', font: { size: 10 }, stepSize: 25 },
            grid: { color: 'rgba(100,151,177,0.1)' },
            border: { display: false }
          }
        }
      }
    });
  },

  renderPowerHistoryTable(historyData) {
    const tbody = document.getElementById('power-history-tbody');
    if (!tbody) return;

    if (!historyData || historyData.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="padding: 15px; text-align: center; color: var(--text-muted);">Tidak ada riwayat daya</td></tr>';
      return;
    }

    tbody.innerHTML = '';
    historyData.forEach(d => {
      this.prependPowerHistoryRow(d);
    });
  },

  prependPowerHistoryRow(sensor) {
    const tbody = document.getElementById('power-history-tbody');
    if (!tbody) return;

    const emptyRow = tbody.querySelector('td[colspan="5"]');
    if (emptyRow) emptyRow.parentElement.remove();

    const rawTime = sensor.timestamp || sensor.createdAt || sensor.waktu;
    let time = '--:--:--';
    if (rawTime) {
      const parsedDate = new Date(rawTime);
      if (!isNaN(parsedDate.getTime())) {
        time = parsedDate.toLocaleTimeString('id-ID', {
          hour: '2-digit', minute: '2-digit', second: '2-digit'
        });
      } else if (typeof rawTime === 'string') {
        time = rawTime;
      }
    }

    const tr = document.createElement('tr');
    tr.style.borderBottom = '1px solid var(--border-color)';
    tr.innerHTML = `
      <td>${time}</td>
      <td>${sensor.vSolar != null ? parseFloat(sensor.vSolar).toFixed(2) : '--'}</td>
      <td>${sensor.iSolar != null ? sensor.iSolar : '--'}</td>
      <td>${sensor.vAki != null ? parseFloat(sensor.vAki).toFixed(2) : '--'}</td>
      <td>${sensor.iAki != null ? sensor.iAki : '--'}</td>
    `;
    
    tbody.insertBefore(tr, tbody.firstChild);
  },

  async exportPowerHistoryCSV() {
    if (!AppState.latestSensor) {
      showToast('Tidak ada data untuk diexport', 'warning');
      return;
    }
    showToast('Mengunduh data daya (CSV)...', 'info');
    try {
      const { ok, data } = await API.get('/sensor/history?hours=24&limit=1000');
      if (!ok || !data.data) { showToast('Gagal mengambil data', 'danger'); return; }

      let csvContent = "\uFEFFWaktu,V Solar (V),I Solar (mA),V Aki (V),I Aki (mA)\n";
      data.data.forEach(row => {
        const time = new Date(row.createdAt).toLocaleString('id-ID');
        csvContent += `"${time}",${(row.vSolar != null ? parseFloat(row.vSolar).toFixed(2) : '--')},${(row.iSolar != null ? row.iSolar : '--')},${(row.vAki != null ? parseFloat(row.vAki).toFixed(2) : '--')},${(row.iAki != null ? row.iAki : '--')}\r\n`;
      });

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `riwayat-daya-${new Date().toISOString().slice(0,10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      showToast('Data CSV daya berhasil diunduh!', 'success');
    } catch (e) {
      showToast('Error export CSV: ' + e.message, 'danger');
    }
  },

  showNoDataState() {
    this.setElText('last-update-time', 'Menunggu data ESP32...');
  },

  setElText(id, content) {
    const el = document.getElementById(id);
    if (el) el.textContent = content;
  },

  setEl(id, content) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = content;
  },

  updateDrainageModeUI(mode) {
    const cb = document.getElementById('drainage-mode-checkbox');
    if (cb) {
      cb.checked = (mode === 'auto');
    }
    const label = document.getElementById('drainage-mode-text');
    if (label) {
      label.textContent = mode === 'auto' ? 'Mode Otomatis (AI)' : 'Mode Manual (Tanpa AI)';
    }
    const note = document.getElementById('drainage-auto-note');
    if (note) {
      note.style.display = mode === 'auto' ? 'block' : 'none';
    }
  },

  async toggleDrainageMode() {
    const role = AppState.user?.role;
    if (role !== 'admin' && role !== 'operator') {
      showToast('Hanya Admin/Operator yang dapat mengubah mode drainase', 'warning');
      this.updateDrainageModeUI(AppState.drainageMode);
      return;
    }

    // Demo mode check
    if (AppState.user?.isDemo) {
      showToast('🔒 Mode Demo: Perubahan mode tidak berlaku pada akun demo.', 'warning');
      this.updateDrainageModeUI(AppState.drainageMode);
      return;
    }

    const cb = document.getElementById('drainage-mode-checkbox');
    const targetMode = cb ? (cb.checked ? 'auto' : 'manual') : (AppState.drainageMode === 'auto' ? 'manual' : 'auto');

    try {
      const { ok, data } = await API.post('/drainage/mode', { mode: targetMode });
      if (ok) {
        AppState.drainageMode = data.mode;
        showToast(data.message || 'Mode drainase berhasil diubah!', 'success');
      } else {
        showToast(data.message || 'Gagal mengubah mode', 'danger');
      }
    } catch (e) {
      showToast('Error: ' + e.message, 'danger');
    } finally {
      this.updateDrainageModeUI(AppState.drainageMode);
    }
  },

  async setPowerHistoryFilter(days, btn) {
    this.powerFilterDays = days;
    btn.parentElement.querySelectorAll('.time-filter-btn').forEach(b => {
      b.classList.remove('active');
      b.style.background = 'transparent';
      b.style.color = 'var(--text-muted)';
      b.style.boxShadow = 'none';
    });
    btn.classList.add('active');
    btn.style.background = 'var(--white)';
    btn.style.color = 'var(--blue-medium)';
    btn.style.boxShadow = 'var(--shadow-sm)';

    const hours = days * 24;
    try {
      const { ok, data } = await API.get(`/sensor/history?hours=${hours}&limit=1000`);
      if (ok && data.data) {
        this.renderPowerHistoryTable(data.data);
      }
    } catch (e) {
      console.error('Power history filter error:', e);
    }
  }
};

// ===== DRAINAGE TOGGLE =====
async function toggleDrainage() {
  const role = AppState.user?.role;
  if (role !== 'admin' && role !== 'operator') {
    showToast('Hanya Admin/Operator yang dapat mengontrol drainase', 'warning');
    return;
  }

  const action = AppState.drainageOpen ? 'close' : 'open';

  const title = action === 'open' ? "Buka Drainase?" : "Tutup Drainase?";
  const msg = action === 'open' 
    ? "Anda akan MEMBUKA katup drainase secara manual.<br><br>Pastikan kondisi di lapangan aman. Lanjutkan?"
    : "Anda akan MENUTUP katup drainase.<br><br>Lanjutkan?";
  const type = action === 'open' ? 'danger' : 'info';

  window.showCustomConfirm(title, msg, type, async () => {
    const btns = [
      document.getElementById('drainage-toggle-btn'),
      document.getElementById('drainage-main-btn')
    ].filter(Boolean);

    btns.forEach(b => { b.disabled = true; b.textContent = 'Mengirim...'; });

    try {
      const { ok, data } = await API.post('/drainage/control', {
        action, zone: 'Z1',
        reason: `Manual ${action} oleh ${AppState.user?.name || 'user'}`
      });

      if (ok) {
        if (data.demoMode) {
          showToast('🔒 Mode Demo: Aksi tidak benar-benar tersimpan ke riwayat.', 'warning');
          // Jangan ubah AppState atau refresh log — state tetap seperti sebelumnya
        } else {
          AppState.drainageOpen = action === 'open';
          showToast(data.message || 'Berhasil!', 'success');
          Monitoring.fetchDrainageLogs();
        }
      } else {
        showToast(data.error || 'Gagal mengubah status', 'danger');
      }
    } catch (e) {
      showToast('Error: ' + e.message, 'danger');
    } finally {
      Dashboard.updateDrainageUI(AppState.drainageOpen);
    }
  });
}

async function refreshData() {
  const icon = document.getElementById('refresh-icon');
  if (icon) {
    icon.style.animation = 'spin 0.8s linear infinite';
    setTimeout(() => { icon.style.animation = ''; }, 800);
  }
  await Dashboard.loadLatestData();
  showToast('Data diperbarui!', 'success');
}

async function loadDrainageLogs() {
  try {
    const { ok, data } = await API.get('/drainage/logs?limit=10');
    if (!ok || !data.logs) return;

    const tbody = document.getElementById('drainage-log-body');
    if (!tbody) return;

    if (data.logs.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:24px">Belum ada riwayat drainase</td></tr>';
      return;
    }

    tbody.innerHTML = data.logs.map(log => {
      const time = new Date(log.createdAt).toLocaleString('id-ID');
      const actionLabel = log.action === 'open' ? '🔓 BUKA' : '🔒 TUTUP';
      const actionClass = log.action === 'open' ? 'badge-warning' : 'badge-safe';
      const by = log.triggeredByName || log.triggeredBy || 'system';
      return `
        <tr>
          <td style="color:var(--text-muted);font-size:12px">${time}</td>
          <td><span class="summary-status-badge ${actionClass}">${actionLabel}</span></td>
          <td><strong>${by}</strong></td>
          <td>${log.riskScoreAtTime || 0}%</td>
          <td><span style="font-size:12px;color:var(--text-muted)">${log.reason || '-'}</span></td>
        </tr>
      `;
    }).join('');
  } catch (e) {
    console.error('Error loading drainage logs:', e);
  }
}

