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

  renderTiltChart(historyData, rangeHours) {
    const ctx = document.getElementById('tilt-chart');
    if (!ctx) return;
    if (this.charts.tilt) { this.charts.tilt.destroy(); this.charts.tilt = null; }

    const hours = rangeHours || this.currentTiltHours || 24;

    const labels = historyData.map(d => {
      const dt = new Date(d.createdAt || d.timestamp);
      if (isNaN(dt.getTime())) return '--';
      if (hours <= 24) {
        return dt.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
      }
      return dt.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
    });

    this.charts.tilt = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Pergeseran Tilt (°)',
            data: historyData.map(d => Number((Math.abs(d.magnitude || d.tiltX || 0)).toFixed(2))),
            borderColor: '#D97706',
            backgroundColor: 'rgba(217, 119, 6, 0.08)',
            borderWidth: 2,
            pointRadius: 0,
            pointHoverRadius: 5,
            pointHoverBackgroundColor: '#D97706',
            tension: 0.35,
            fill: true,
            spanGaps: true
          },
          {
            label: 'Batas Bahaya Geoteknik (2.0°)',
            data: historyData.map(() => 2.0),
            borderColor: '#E53E3E',
            borderWidth: 1.5,
            borderDash: [5, 5],
            pointRadius: 0,
            fill: false,
            spanGaps: true
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        resizeDelay: 150,
        animation: { duration: 250 },
        interaction: { mode: 'index', intersect: false },
        layout: { padding: { bottom: 4, top: 4 } },
        plugins: {
          legend: {
            position: 'top',
            labels: {
              color: '#011F4B',
              font: { size: 11, weight: '400' },
              boxWidth: 12,
              padding: 10
            }
          },
          tooltip: {
            mode: 'index',
            intersect: false,
            backgroundColor: 'rgba(1, 31, 75, 0.94)',
            titleColor: '#E2E8F0',
            borderColor: 'rgba(97, 189, 240, 0.35)',
            borderWidth: 1,
            cornerRadius: 8,
            padding: 10,
            callbacks: {
              title(items) {
                if (!items || !items.length) return '';
                const item = historyData[items[0].dataIndex];
                if (!item) return '';
                const dt = new Date(item.createdAt || item.timestamp);
                return dt.toLocaleDateString('id-ID', {
                  weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
                }) + ' • ' + dt.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' WIB';
              },
              label(item) {
                const label = item.dataset.label || '';
                const val = item.parsed.y;
                return ` ${label}: ${val.toFixed(2)}°`;
              }
            }
          }
        },
        scales: {
          x: {
            ticks: {
              color: '#6497B1',
              maxTicksLimit: hours > 24 ? 7 : 7,
              autoSkip: true,
              maxRotation: 0,
              minRotation: 0,
              font: { size: 10, weight: '400' },
              callback: function(value, index, ticks) {
                const label = this.getLabelForValue(value);
                if (index > 0 && ticks[index - 1]) {
                  const prev = this.getLabelForValue(ticks[index - 1].value);
                  if (prev === label) return '';
                }
                return label;
              }
            },
            grid: { color: 'rgba(100, 151, 177, 0.1)' },
            border: { display: false }
          },
          y: {
            min: 0,
            suggestedMax: 3.0,
            ticks: { color: '#6497B1', font: { size: 10, weight: '400' } },
            grid: { color: 'rgba(100, 151, 177, 0.1)' },
            border: { display: false }
          }
        }
      }
    });
  },

  renderSoilChart(historyData, rangeHours) {
    const ctx = document.getElementById('soil-chart');
    if (!ctx) return;
    if (this.charts.soil) { this.charts.soil.destroy(); this.charts.soil = null; }

    const hours = rangeHours || this.currentSoilHours || 24;

    const labels = historyData.map(d => {
      const dt = new Date(d.createdAt || d.timestamp);
      if (isNaN(dt.getTime())) return '--';
      if (hours <= 24) {
        return dt.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
      }
      return dt.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
    });

    this.charts.soil = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Soil Dangkal (S1) %',
            data: historyData.map(d => Number((d.soilDangkal || d.soil1 || 0).toFixed(1))),
            borderColor: '#011F4B',
            backgroundColor: 'rgba(1, 31, 75, 0.08)',
            borderWidth: 2,
            pointRadius: 0,
            pointHoverRadius: 5,
            pointHoverBackgroundColor: '#011F4B',
            tension: 0.35,
            fill: true,
            spanGaps: true
          },
          {
            label: 'Soil Dalam (S2) %',
            data: historyData.map(d => Number((d.soilDalam || d.soil2 || 0).toFixed(1))),
            borderColor: '#005B96',
            backgroundColor: 'rgba(0, 91, 150, 0.08)',
            borderWidth: 2,
            pointRadius: 0,
            pointHoverRadius: 5,
            pointHoverBackgroundColor: '#005B96',
            tension: 0.35,
            fill: true,
            spanGaps: true
          },
          {
            label: 'Batas Kritis Jenuh Air (75%)',
            data: historyData.map(() => 75),
            borderColor: '#E53E3E',
            borderWidth: 1.5,
            borderDash: [5, 5],
            pointRadius: 0,
            fill: false,
            spanGaps: true
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        resizeDelay: 150,
        animation: { duration: 250 },
        interaction: { mode: 'index', intersect: false },
        layout: { padding: { bottom: 4, top: 4 } },
        plugins: {
          legend: {
            position: 'top',
            labels: {
              color: '#011F4B',
              font: { size: 11, weight: '400' },
              boxWidth: 12,
              padding: 10
            }
          },
          tooltip: {
            mode: 'index',
            intersect: false,
            backgroundColor: 'rgba(1, 31, 75, 0.94)',
            titleColor: '#E2E8F0',
            borderColor: 'rgba(97, 189, 240, 0.35)',
            borderWidth: 1,
            cornerRadius: 8,
            padding: 10,
            callbacks: {
              title(items) {
                if (!items || !items.length) return '';
                const item = historyData[items[0].dataIndex];
                if (!item) return '';
                const dt = new Date(item.createdAt || item.timestamp);
                return dt.toLocaleDateString('id-ID', {
                  weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
                }) + ' • ' + dt.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' WIB';
              },
              label(item) {
                const label = item.dataset.label || '';
                const val = item.parsed.y;
                return ` ${label}: ${val.toFixed(1)}%`;
              }
            }
          }
        },
        scales: {
          x: {
            ticks: {
              color: '#6497B1',
              maxTicksLimit: hours > 24 ? 7 : 7,
              autoSkip: true,
              maxRotation: 0,
              minRotation: 0,
              font: { size: 10, weight: '400' },
              callback: function(value, index, ticks) {
                const label = this.getLabelForValue(value);
                if (index > 0 && ticks[index - 1]) {
                  const prev = this.getLabelForValue(ticks[index - 1].value);
                  if (prev === label) return '';
                }
                return label;
              }
            },
            grid: { color: 'rgba(100, 151, 177, 0.1)' },
            border: { display: false }
          },
          y: {
            min: 0,
            max: 100,
            ticks: { color: '#6497B1', font: { size: 10, weight: '400' }, stepSize: 25 },
            grid: { color: 'rgba(100, 151, 177, 0.1)' },
            border: { display: false }
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

    const timeLabel = (this.currentTiltHours > 24)
      ? new Date(sensor.timestamp).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })
      : new Date(sensor.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

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
      chart.update('none');
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
      chart.update('none');
    }

    // Update table in Reports if it's active
    const reportsPage = document.getElementById('page-reports');
    if (reportsPage && reportsPage.classList.contains('active')) {
      this.renderSensorTable('reports-table-body');
    }
  },

  historyFilterDays: 1,
  selectedDate: null,
  selectedStatus: 'ALL',
  currentPage: 1,
  pageSize: 20,
  rawTableData: [],
  filteredTableData: [],
  
  setHistoryFilter(days, btn) {
    this.historyFilterDays = days;
    this.selectedDate = null;
    const dateInput = document.getElementById('reports-date-filter');
    if (dateInput) dateInput.value = '';

    document.querySelectorAll('.time-filters .time-filter-btn').forEach(b => {
      b.classList.remove('active');
      b.style.background = 'transparent';
      b.style.color = 'var(--text-muted)';
      b.style.boxShadow = 'none';
    });
    if (btn) {
      btn.classList.add('active');
      btn.style.background = 'var(--white)';
      btn.style.color = 'var(--blue-medium)';
      btn.style.boxShadow = 'var(--shadow-sm)';
    }
    
    const sub = document.getElementById('history-subtitle');
    if (sub) sub.innerText = `Menampilkan data ${days} hari terakhir • Aligned dengan SNI 8235:2017`;
    
    this.currentPage = 1;
    this.renderSensorTable('reports-table-body');
  },

  onDateFilterChange(val) {
    this.selectedDate = val || null;
    this.currentPage = 1;
    this.applyTableFiltersAndRender();
  },

  onStatusFilterChange(val) {
    this.selectedStatus = val || 'ALL';
    this.currentPage = 1;
    this.applyTableFiltersAndRender();
  },

  async renderSensorTable(tbodyId = 'reports-table-body') {
    try {
      const tbody = document.getElementById(tbodyId);
      if (tbody) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;color:var(--text-muted);padding:32px"><i class="fas fa-spinner fa-spin" style="font-size:20px;margin-bottom:8px;display:block"></i>Memuat data log geoteknik...</td></tr>';
      }

      const hours = (this.historyFilterDays || 1) * 24;
      const { ok, data } = await API.get(`/sensor/history?hours=${hours}&limit=1000`);
      if (!ok || !data.data) {
        if (tbody) tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;color:var(--danger);padding:24px">Gagal memuat riwayat sensor dari server.</td></tr>';
        return;
      }

      // Sort newest first
      this.rawTableData = [...data.data].reverse();
      this.applyTableFiltersAndRender(tbodyId);
    } catch (e) {
      console.error('Sensor table error:', e);
      const tbody = document.getElementById(tbodyId);
      if (tbody) tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;color:var(--danger);padding:24px">Terjadi kesalahan koneksi data.</td></tr>';
    }
  },

  applyTableFiltersAndRender(tbodyId = 'reports-table-body') {
    let filtered = [...this.rawTableData];

    // Filter by specific date (YYYY-MM-DD)
    if (this.selectedDate) {
      filtered = filtered.filter(item => {
        const dt = new Date(item.createdAt || item.timestamp);
        if (isNaN(dt.getTime())) return false;
        const yyyy = dt.getFullYear();
        const mm = String(dt.getMonth() + 1).padStart(2, '0');
        const dd = String(dt.getDate()).padStart(2, '0');
        const dateStr = `${yyyy}-${mm}-${dd}`;
        return dateStr === this.selectedDate;
      });
    }

    // Filter by Status Lereng
    if (this.selectedStatus && this.selectedStatus !== 'ALL') {
      filtered = filtered.filter(item => {
        const risk = item.riskScore || 0;
        const status = risk >= 75 ? 'BAHAYA' : risk >= 50 ? 'WASPADA' : 'AMAN';
        return status === this.selectedStatus;
      });
    }

    this.filteredTableData = filtered;

    const tbody = document.getElementById(tbodyId);
    if (!tbody) return;

    if (this.filteredTableData.length === 0) {
      tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;color:var(--text-muted);padding:36px">Tidak ada rekaman data sensor yang sesuai dengan filter.</td></tr>';
      this.updatePaginationUI(0, 0, 0);
      return;
    }

    const totalRows = this.filteredTableData.length;
    const totalPages = Math.max(1, Math.ceil(totalRows / this.pageSize));
    if (this.currentPage > totalPages) this.currentPage = totalPages;
    if (this.currentPage < 1) this.currentPage = 1;

    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = Math.min(startIndex + this.pageSize, totalRows);
    const pageRows = this.filteredTableData.slice(startIndex, endIndex);

    tbody.innerHTML = pageRows.map(row => {
      const risk = Number(row.riskScore || 0);
      const cls = risk >= 75 ? 'danger' : risk >= 50 ? 'warning' : 'safe';
      const label = risk >= 75 ? 'BAHAYA' : risk >= 50 ? 'WASPADA' : 'AMAN';
      
      const dt = new Date(row.createdAt || row.timestamp);
      const timeFormatted = isNaN(dt.getTime()) ? '--' : (
        dt.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) + ', ' +
        dt.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' WIB'
      );

      const s1 = Number((row.soilDangkal != null ? row.soilDangkal : (row.soil1 != null ? row.soil1 : 0)).toFixed(1));
      const s2 = Number((row.soilDalam != null ? row.soilDalam : (row.soil2 != null ? row.soil2 : 0)).toFixed(1));
      const vwc = Number((row.vwc != null ? row.vwc : ((s1 + s2) / 2 * 0.5)).toFixed(1));
      const tilt = Number((Math.abs(row.magnitude != null ? row.magnitude : (row.tiltX || 0))).toFixed(2));
      const vSolar = row.vSolar != null ? Number(row.vSolar).toFixed(2) + ' V' : '--';
      const isRelayOpen = (row.statusRelay && String(row.statusRelay).toUpperCase().includes('OPEN')) || (risk >= 75);
      const relayBadge = isRelayOpen ? 
        '<span class="summary-status-badge badge-danger"><i class="fas fa-droplet"></i> OPEN</span>' : 
        '<span class="summary-status-badge badge-safe"><i class="fas fa-lock"></i> CLOSED</span>';

      return `
        <tr>
          <td style="color:var(--text-main);font-size:12px;font-weight:600;white-space:nowrap;">
            <i class="far fa-clock" style="color:var(--blue-medium);margin-right:4px;"></i>${timeFormatted}
          </td>
          <td><strong style="color:var(--blue-light);">${s1}%</strong></td>
          <td><strong style="color:var(--blue-medium);">${s2}%</strong></td>
          <td>${vwc}%</td>
          <td>${tilt}°</td>
          <td><span style="font-weight:600; color:var(--text-main);">${vSolar}</span></td>
          <td>
            <span style="font-weight:700; color:${risk >= 75 ? 'var(--danger)' : risk >= 50 ? 'var(--warning)' : 'var(--success)'};">
              ${risk}%
            </span>
          </td>
          <td><span class="summary-status-badge badge-${cls}">${label}</span></td>
          <td>${relayBadge}</td>
        </tr>
      `;
    }).join('');

    this.updatePaginationUI(startIndex + 1, endIndex, totalRows, totalPages);
  },

  updatePaginationUI(start, end, total, totalPages = 1) {
    const info = document.getElementById('reports-pagination-info');
    if (info) {
      info.textContent = total === 0 ? 'Menampilkan 0 dari 0 data' : `Menampilkan ${start} - ${end} dari ${total} data`;
    }

    const cur = document.getElementById('reports-page-current');
    if (cur) {
      cur.textContent = `Hal ${this.currentPage} dari ${totalPages || 1}`;
    }

    const btnFirst = document.getElementById('btn-page-first');
    const btnPrev = document.getElementById('btn-page-prev');
    const btnNext = document.getElementById('btn-page-next');
    const btnLast = document.getElementById('btn-page-last');

    if (btnFirst) btnFirst.disabled = this.currentPage <= 1;
    if (btnPrev) btnPrev.disabled = this.currentPage <= 1;
    if (btnNext) btnNext.disabled = this.currentPage >= totalPages;
    if (btnLast) btnLast.disabled = this.currentPage >= totalPages;
  },

  goToPage(p) {
    this.currentPage = p;
    this.applyTableFiltersAndRender();
  },

  changePage(delta) {
    this.currentPage += delta;
    this.applyTableFiltersAndRender();
  },

  goToLastPage() {
    const totalPages = Math.max(1, Math.ceil(this.filteredTableData.length / this.pageSize));
    this.currentPage = totalPages;
    this.applyTableFiltersAndRender();
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

      const sub = document.getElementById('tilt-chart-subtitle');
      if (sub) {
        const labelStr = hours >= 24 ? `${hours / 24} hari` : `${hours} jam`;
        sub.textContent = `Magnitude • ${labelStr} terakhir`;
      }
      
      const { ok, data } = await API.get(`/sensor/history?hours=${hours}&limit=1000`);
      if (ok && data.data) {
        this.renderTiltChart(data.data, hours);
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

      const sub = document.getElementById('soil-chart-subtitle');
      if (sub) {
        const labelStr = hours >= 24 ? `${hours / 24} hari` : `${hours} jam`;
        sub.textContent = `Soil 1 & Soil 2 • ${labelStr} terakhir`;
      }

      const { ok, data } = await API.get(`/sensor/history?hours=${hours}&limit=1000`);
      if (ok && data.data) {
        this.renderSoilChart(data.data, hours);
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
