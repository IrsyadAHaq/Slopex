// ===== MONITORING MODULE =====
const Monitoring = {
  charts: {},
  currentTiltHours: 6,
  currentSoilHours: 6,

  async init() {
    await this.loadHistory();
  },

  async loadHistory() {
    try {
      const { ok, data } = await API.get('/sensor/history?hours=6&limit=1000');
      if (ok && data.data) {
        this.renderTiltChart(data.data);
        this.renderSoilChart(data.data);
      }
    } catch (e) {
      console.error('Monitoring load error:', e);
    }
  },

  renderTiltChart(historyData) {
    const ctx = document.getElementById('tilt-chart');
    if (!ctx) return;
    if (this.charts.tilt) { this.charts.tilt.destroy(); this.charts.tilt = null; }

    const labels = historyData.map(d =>
      new Date(d.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    );

    this.charts.tilt = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Magnitude (°)',
            data: historyData.map(d => Math.abs(d.magnitude || d.tiltX || 0)),
            borderColor: '#D97706',
            backgroundColor: 'rgba(217,119,6,0.1)',
            borderWidth: 2, pointRadius: 0, tension: 0.4, fill: true
          },
          {
            label: 'Batas Bahaya (2°)',
            data: historyData.map(() => 2),
            borderColor: '#E53E3E',
            borderWidth: 1.5, borderDash: [5, 5],
            pointRadius: 0, fill: false
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        layout: { padding: { bottom: 4 } },
        plugins: {
          legend: { labels: { color: '#294E93', font: { size: 11 }, boxWidth: 20 } },
          tooltip: { mode: 'index', intersect: false }
        },
        scales: {
          x: {
            ticks: { color: '#6497B1', maxTicksLimit: 8, font: { size: 10 } },
            grid: { color: 'rgba(100,151,177,0.1)' }, border: { display: false }
          },
          y: {
            ticks: { color: '#6497B1', font: { size: 10 } },
            grid: { color: 'rgba(100,151,177,0.1)' },
            border: { display: false }, suggestedMax: 5
          }
        }
      }
    });
  },

  renderSoilChart(historyData) {
    const ctx = document.getElementById('soil-chart');
    if (!ctx) return;
    if (this.charts.soil) { this.charts.soil.destroy(); this.charts.soil = null; }

    const labels = historyData.map(d =>
      new Date(d.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    );

    this.charts.soil = new Chart(ctx, {
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
            label: 'Batas Kritis (75%)',
            data: historyData.map(() => 75),
            borderColor: '#E53E3E',
            borderWidth: 1.5, borderDash: [5, 5],
            pointRadius: 0, fill: false
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        layout: { padding: { bottom: 4 } },
        plugins: {
          legend: { labels: { color: '#294E93', font: { size: 11 }, boxWidth: 20 } },
          tooltip: { mode: 'index', intersect: false }
        },
        scales: {
          x: {
            ticks: { color: '#6497B1', maxTicksLimit: 8, font: { size: 10 } },
            grid: { color: 'rgba(100,151,177,0.1)' }, border: { display: false }
          },
          y: {
            min: 0, max: 100,
            ticks: { color: '#6497B1', font: { size: 10 }, stepSize: 25 },
            grid: { color: 'rgba(100,151,177,0.1)' }, border: { display: false }
          }
        }
      }
    });
  },

  updateReadings(sensor) {
    if (!sensor || !sensor.timestamp) return;
    
    // Update "Nilai Sensor Live" di sidebar monitoring
    const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    const setBar = (id, pct, bg) => { 
      const el = document.getElementById(id); 
      if (el) { el.style.width = Math.min(100, Math.max(0, pct)) + '%'; if(bg) el.style.background = bg; } 
    };

    const s1 = sensor.soilDangkal || sensor.soil1 || 0;
    const s2 = sensor.soilDalam || sensor.soil2 || 0;
    const mag = sensor.magnitude || sensor.tiltX || 0;
    const risk = sensor.riskScore || 0;

    setEl('mon-soil1', s1.toFixed(1) + '%');
    setEl('mon-soil2', s2.toFixed(1) + '%');
    setEl('mon-magnitude', parseFloat(mag).toFixed(1) + '°');
    setEl('mon-risk2', risk + '%');

    setBar('mon-soil1-bar', s1);
    setBar('mon-soil2-bar', s2);
    setBar('mon-magnitude-bar', (parseFloat(mag) / 90) * 100);
    
    const riskBg = risk >= 75 ? 'var(--danger)' : risk >= 50 ? 'var(--warning)' : 'var(--success)';
    setBar('mon-risk-bar2', risk, riskBg);

    const timeLabel = new Date(sensor.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

    // Update Tilt Chart
    if (this.charts.tilt) {
      const chart = this.charts.tilt;
      chart.data.labels.push(timeLabel);
      chart.data.datasets[0].data.push(Math.abs(sensor.magnitude || sensor.tiltX || 0));
      chart.data.datasets[1].data.push(2);

      const maxLimit = (this.currentTiltHours === 336) ? 2016 : (this.currentTiltHours === 168 ? 1008 : (this.currentTiltHours === 24 ? 288 : 100));
      if (chart.data.labels.length > maxLimit) {
        chart.data.labels.shift();
        chart.data.datasets.forEach(ds => ds.data.shift());
      }
      chart.update();
    }

    // Update Soil Chart
    if (this.charts.soil) {
      const chart = this.charts.soil;
      chart.data.labels.push(timeLabel);
      chart.data.datasets[0].data.push(s1);
      chart.data.datasets[1].data.push(s2);
      chart.data.datasets[2].data.push(75);

      const maxLimit = (this.currentSoilHours === 336) ? 2016 : (this.currentSoilHours === 168 ? 1008 : (this.currentSoilHours === 24 ? 288 : 100));
      if (chart.data.labels.length > maxLimit) {
        chart.data.labels.shift();
        chart.data.datasets.forEach(ds => ds.data.shift());
      }
      chart.update();
    }

    // Update table in Reports if it's active
    const reportsPage = document.getElementById('page-reports');
    if (reportsPage && reportsPage.classList.contains('active')) {
      this.renderSensorTable('reports-table-body');
    }
  },

  historyFilterDays: 1,
  
  setHistoryFilter(days, btn) {
    this.historyFilterDays = days;
    document.querySelectorAll('.time-filter-btn').forEach(b => {
      b.classList.remove('active');
      b.style.background = 'transparent';
      b.style.color = 'var(--text-muted)';
      b.style.boxShadow = 'none';
    });
    btn.classList.add('active');
    btn.style.background = 'var(--white)';
    btn.style.color = 'var(--blue-medium)';
    btn.style.boxShadow = 'var(--shadow-sm)';
    
    document.getElementById('history-subtitle').innerText = `Data ${days} Hari Terakhir`;
    this.renderSensorTable('reports-table-body');
  },

  async renderSensorTable(tbodyId = 'reports-table-body') {
    try {
      const tbody = document.getElementById(tbodyId);
      if (tbody) tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:32px"><i class="fas fa-spinner fa-spin" style="font-size:20px;margin-bottom:8px;display:block"></i>Memuat data...</td></tr>';

      const hours = (this.historyFilterDays || 1) * 24;
      const { ok, data } = await API.get(`/sensor/history?hours=${hours}&limit=1000`);
      if (!ok || !data.data) return;

      if (!tbody) return;

      if (data.data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:30px">Belum ada data sensor dari ESP32 pada rentang waktu ini.</td></tr>';
        return;
      }

      tbody.innerHTML = data.data.reverse().map(row => {
        const risk = row.riskScore || 0;
        const cls = risk >= 75 ? 'danger' : risk >= 50 ? 'warning' : 'safe';
        const label = risk >= 75 ? 'BAHAYA' : risk >= 50 ? 'WASPADA' : 'AMAN';
        const time = new Date(row.createdAt).toLocaleString('id-ID');
        return `
          <tr>
            <td style="color:var(--text-muted);font-size:12px">${time}</td>
            <td>${(row.soilDangkal||row.soil1||0).toFixed(1)}%</td>
            <td>${(row.soilDalam||row.soil2||0).toFixed(1)}%</td>
            <td>${(row.magnitude||row.tiltX||0).toFixed(1)}°</td>
            <td><span class="summary-status-badge ${cls}">${label}</span></td>
          </tr>
        `;
      }).join('');
    } catch (e) {
      console.error('Sensor table error:', e);
    }
  },

  async loadReportsStats() {
    try {
      const { ok, data } = await API.get('/sensor/stats');
      if (ok && data.stats) {
        const s = data.stats;
        const setEl = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
        setEl('rep-total', s.readings24h != null ? s.readings24h : '--');
        setEl('rep-maxrisk', (s.maxRisk24h != null ? s.maxRisk24h : '--') + '%');
        setEl('rep-avgs1', (s.avgSoilDangkal != null ? s.avgSoilDangkal : (s.avgSoil1 != null ? s.avgSoil1 : '--')) + '%');
        setEl('rep-avgs2', (s.avgSoilDalam != null ? s.avgSoilDalam : (s.avgSoil2 != null ? s.avgSoil2 : '--')) + '%');
        setEl('rep-avgmag', (s.avgMagnitude != null ? s.avgMagnitude : '--') + '°');
      }
    } catch (e) {
      console.error('Load reports stats error:', e);
    }
  },

  async setChartRange(type, hours, btn) {
    if (type === 'tilt') {
      this.currentTiltHours = hours;
      // Update active button styling
      btn.parentElement.querySelectorAll('button').forEach(b => {
        b.style.background = 'transparent';
        b.style.color = 'var(--text-muted)';
        b.style.boxShadow = 'none';
      });
      btn.style.background = 'var(--white)';
      btn.style.color = 'var(--blue-medium)';
      btn.style.boxShadow = 'var(--shadow-sm)';
      
      const { ok, data } = await API.get(`/sensor/history?hours=${hours}&limit=1000`);
      if (ok && data.data) {
        this.renderTiltChart(data.data);
      }
    } else {
      this.currentSoilHours = hours;
      // Update active button styling
      btn.parentElement.querySelectorAll('button').forEach(b => {
        b.style.background = 'transparent';
        b.style.color = 'var(--text-muted)';
        b.style.boxShadow = 'none';
      });
      btn.style.background = 'var(--white)';
      btn.style.color = 'var(--blue-medium)';
      btn.style.boxShadow = 'var(--shadow-sm)';

      const { ok, data } = await API.get(`/sensor/history?hours=${hours}&limit=1000`);
      if (ok && data.data) {
        this.renderSoilChart(data.data);
      }
    }
  }
};

// ===== ALERTS MODULE =====
const Alerts = {
  async init() {
    await this.loadAlerts();
  },

  async loadAlerts() {
    try {
      const { ok, data } = await API.get('/alerts?acknowledged=false&limit=10');
      if (!ok) return;

      AppState.alerts = data.alerts || [];
      this.renderNotificationPanel(data.alerts);

      // Update bell dot using shared helper
      updateNotifBadge();
    } catch (e) {
      console.error('Load alerts error:', e);
    }
  },

  renderNotificationPanel(alerts) {
    const container = document.getElementById('notif-list');
    if (!container) return;

    if (!alerts || alerts.length === 0) {
      container.innerHTML = '<p style="text-align:center;color:var(--text-muted);font-size:13px;padding:20px">Tidak ada notifikasi baru</p>';
      return;
    }

    container.innerHTML = alerts.map(alert => {
      const icon = alert.severity === 'danger' ? 'fa-radiation' :
        alert.severity === 'warning' ? 'fa-triangle-exclamation' : 'fa-circle-info';
      const color = alert.severity === 'danger' ? 'var(--danger)' :
        alert.severity === 'warning' ? 'var(--warning)' : 'var(--blue-medium)';
      const time = new Date(alert.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
      return `
        <div class="notif-item unread" data-id="${alert.id}">
          <div class="notif-icon" style="background:${color}20;color:${color}">
            <i class="fas ${icon}"></i>
          </div>
          <div class="notif-content">
            <p class="notif-title">${alert.title}</p>
            <p class="notif-body">${alert.message}</p>
            <p class="notif-time">${time}</p>
          </div>
        </div>
      `;
    }).join('');
  },

  addNotification(alert) {
    AppState.alerts.unshift(alert);
    const container = document.getElementById('notif-list');
    if (!container) return;

    const icon = alert.severity === 'danger' ? 'fa-radiation' : 'fa-triangle-exclamation';
    const color = alert.severity === 'danger' ? 'var(--danger)' : 'var(--warning)';
    const time = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

    const el = document.createElement('div');
    el.className = 'notif-item unread';
    el.innerHTML = `
      <div class="notif-icon" style="background:${color}20;color:${color}">
        <i class="fas ${icon}"></i>
      </div>
      <div class="notif-content">
        <p class="notif-title">${alert.title}</p>
        <p class="notif-body">${alert.message}</p>
        <p class="notif-time">${time}</p>
      </div>
    `;
    container.prepend(el);
  }
};

// markAllRead is defined in index.html inline script
