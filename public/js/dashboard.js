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
      // Load default 24 hours for trend chart (shows full daily stock-style fluctuations)
      this.currentHours = 24;
      const resChart = await API.get('/sensor/history?hours=24&limit=1000');
      if (resChart.ok && resChart.data.data) {
        this.renderHistoryChart(resChart.data.data, 24);
      }
      // Load 7 days for power history chart & table
      this.powerFilterDays = 7;
      const resPower = await API.get('/sensor/history?hours=168&limit=1000');
      if (resPower.ok && resPower.data.data) {
        this.renderPowerHistoryChart(resPower.data.data, 7);
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
    
    this.setElText('val-vSolar', sensor.vSolar != null ? Number(sensor.vSolar).toFixed(2) : '--');
    this.setElText('val-iSolar', sensor.iSolar != null ? Math.round(Number(sensor.iSolar)) : '--');
    this.setElText('val-vBuck', sensor.vBuck != null ? Number(sensor.vBuck).toFixed(2) : '--');
    this.setElText('val-iBuck', sensor.iBuck != null ? Math.round(Number(sensor.iBuck)) : '--');
    this.setElText('val-vAki', sensor.vAki != null ? Number(sensor.vAki).toFixed(2) : '--');
    this.setElText('val-iAki', sensor.iAki != null ? Math.round(Number(sensor.iAki)) : '--');

    // Live update for Power Health cards on Perangkat page
    if (sensor.vSolar != null) {
      this.setElText('stat-power-vsolar', Number(sensor.vSolar).toFixed(2) + ' V');
    }
    if (sensor.iSolar != null) {
      this.setElText('stat-power-isolar', Math.round(Number(sensor.iSolar)) + ' mA');
    }
    if (sensor.vAki != null) {
      this.setElText('stat-power-vaki', Number(sensor.vAki).toFixed(2) + ' V');
      const elStat = document.getElementById('stat-power-status');
      if (elStat) {
        const v = Number(sensor.vAki);
        if (v < 11.5) {
          elStat.innerHTML = '<i class="fas fa-triangle-exclamation" style="color:var(--danger)"></i> TEGANGAN DROP (<11.5V)';
          elStat.style.color = 'var(--danger)';
        } else if (v < 12.2) {
          elStat.innerHTML = '<i class="fas fa-circle-exclamation" style="color:var(--warning)"></i> PERLU PENGISIAN';
          elStat.style.color = 'var(--warning)';
        } else {
          elStat.innerHTML = '<i class="fas fa-circle-check" style="color:#059669"></i> NORMAL & SEHAT';
          elStat.style.color = '#059669';
        }
      }
    }

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
      const timeLabel = (Dashboard.currentHours > 24)
        ? new Date(sensor.timestamp).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })
        : new Date(sensor.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
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
      chart.update('none');
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

    // Update Drainage page Live Sensor card
    const dS1 = document.getElementById('drain-soil1');
    if (dS1) dS1.textContent = s1.toFixed(1) + '%';
    const dS1Bar = document.getElementById('drain-soil1-bar');
    if (dS1Bar) dS1Bar.style.width = Math.min(100, Math.max(0, s1)) + '%';

    const dS2 = document.getElementById('drain-soil2');
    if (dS2) dS2.textContent = s2.toFixed(1) + '%';
    const dS2Bar = document.getElementById('drain-soil2-bar');
    if (dS2Bar) dS2Bar.style.width = Math.min(100, Math.max(0, s2)) + '%';

    const dMag = document.getElementById('drain-magnitude');
    if (dMag) dMag.textContent = (typeof mag === 'number' ? mag.toFixed(2) : parseFloat(mag).toFixed(2)) + '°';
    const dMagBar = document.getElementById('drain-magnitude-bar');
    if (dMagBar) dMagBar.style.width = Math.min(100, Math.max(0, (mag / 10) * 100)) + '%';

    const dRisk = document.getElementById('drain-risk');
    if (dRisk) {
      dRisk.textContent = risk + '%';
      dRisk.style.color = risk >= 75 ? 'var(--danger)' : (risk >= 50 ? 'var(--warning)' : 'var(--success)');
    }
    const dRiskBar = document.getElementById('drain-risk-bar');
    if (dRiskBar) {
      dRiskBar.style.width = Math.min(100, Math.max(0, risk)) + '%';
      dRiskBar.style.background = risk >= 75 ? 'var(--danger)' : (risk >= 50 ? 'var(--warning)' : 'var(--success)');
    }

    // Geotechnical & Node Telemetry Support Fields
    const dVwc = document.getElementById('drain-vwc');
    if (dVwc) dVwc.textContent = (sensor.vwc != null ? Number(sensor.vwc).toFixed(1) : ((s1 + s2) / 2).toFixed(1)) + '%';

    const dRain = document.getElementById('drain-rainfall');
    if (dRain) dRain.textContent = (sensor.rainfall != null ? Math.round(sensor.rainfall).toLocaleString('id-ID') : '1.100') + ' mm/h';

    const dVaki = document.getElementById('drain-vaki');
    if (dVaki) dVaki.textContent = (sensor.vAki != null ? Number(sensor.vAki).toFixed(2) : '12.60') + ' V';

    const dAiStatus = document.getElementById('drain-ai-status-text');
    const dRiskGap = document.getElementById('drain-risk-gap');
    const dAiCallout = document.getElementById('drain-ai-callout');
    if (dAiStatus) {
      if (risk >= 75) {
        dAiStatus.textContent = 'BAHAYA KRITIS — Katup Drainase Terbuka Otomatis';
        dAiStatus.style.color = 'var(--danger)';
        if (dRiskGap) dRiskGap.textContent = 'AMBANG TERCAPAI (≥75%)';
        if (dAiCallout) {
          dAiCallout.style.background = 'rgba(229,62,62,0.08)';
          dAiCallout.style.borderLeftColor = 'var(--danger)';
        }
      } else if (risk >= 50) {
        dAiStatus.textContent = 'WASPADA — Siaga Penuh Menjelang Pemicu';
        dAiStatus.style.color = 'var(--warning)';
        if (dRiskGap) dRiskGap.textContent = `+${Math.max(0, 75 - risk)}% menuju 75%`;
        if (dAiCallout) {
          dAiCallout.style.background = 'rgba(217,119,6,0.08)';
          dAiCallout.style.borderLeftColor = 'var(--warning)';
        }
      } else {
        dAiStatus.textContent = 'KONDISI AMAN — Katup Standby (Tertutup)';
        dAiStatus.style.color = 'var(--success)';
        if (dRiskGap) dRiskGap.textContent = `+${Math.max(0, 75 - risk)}% menuju pemicu otomatis (75%)`;
        if (dAiCallout) {
          dAiCallout.style.background = 'rgba(39,103,73,0.06)';
          dAiCallout.style.borderLeftColor = 'var(--success)';
        }
      }
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
      if (AppState.user?.isDemo) {
        b.textContent = '🔒 Katup Terkunci (Mode Demo)';
        b.className = 'control-btn';
        b.style.opacity = '0.6';
        b.style.cursor = 'not-allowed';
      } else {
        b.textContent = isOpen ? '🔒 Tutup Drainase' : '🔓 Buka Drainase';
        b.className = isOpen ? 'control-btn danger' : 'control-btn success';
        b.style.opacity = '1';
        b.style.cursor = 'pointer';
      }
      b.disabled = false;
    };

    updateBtn(btn1);
    updateBtn(btn2);

    if (AppState.user?.isDemo) {
      const lockBadge1 = document.getElementById('drainage-demo-lock-1');
      if (!lockBadge1 && btn1 && btn1.parentElement) {
        const badge = document.createElement('div');
        badge.id = 'drainage-demo-lock-1';
        badge.style.cssText = 'font-size:11px; color:#F6AD55; margin-top:6px; display:flex; align-items:center; gap:4px; font-weight:600;';
        badge.innerHTML = '<i class="fas fa-lock"></i> Mode Demo: Akses aktuator dibatasi (Read-Only)';
        btn1.parentElement.appendChild(badge);
      }
    }

    if (statusEl) {
      statusEl.textContent = isOpen ? 'AKTIF — Katup Terbuka' : 'STANDBY — Katup Tertutup';
      statusEl.style.color = isOpen ? 'var(--danger)' : 'var(--success)';
    }
    if (ledEl) {
      ledEl.style.background = isOpen ? '#E53E3E' : '#48BB78';
      ledEl.style.boxShadow = isOpen ? '0 0 12px #E53E3E' : '0 0 12px #48BB78';
    }
  },

  renderHistoryChart(historyData, rangeHours) {
    const ctx = document.getElementById('history-chart');
    if (!ctx) return;

    if (this.charts.history) { this.charts.history.destroy(); this.charts.history = null; }

    const hours = rangeHours || this.currentHours || 24;

    const labels = historyData.map(d => {
      const dt = new Date(d.createdAt || d.timestamp);
      if (isNaN(dt.getTime())) return '--';
      if (hours <= 24) {
        return dt.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
      }
      return dt.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
    });

    // Stock-style Chart with Crosshair & Rich Tooltip
    this.charts.history = new Chart(ctx, {
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
            label: 'Kemiringan Tilt (°)',
            data: historyData.map(d => Number((d.magnitude || d.tiltX || 0).toFixed(2))),
            borderColor: '#D97706',
            backgroundColor: 'transparent',
            borderWidth: 2,
            pointRadius: 0,
            pointHoverRadius: 5,
            pointHoverBackgroundColor: '#D97706',
            tension: 0.35,
            fill: false,
            spanGaps: true
          },
          {
            label: 'Risk Score RF (%)',
            data: historyData.map(d => Number((d.riskScore != null ? d.riskScore : 0))),
            borderColor: '#E53E3E',
            backgroundColor: 'rgba(229, 62, 62, 0.05)',
            borderWidth: 2.5,
            pointRadius: 0,
            pointHoverRadius: 6,
            pointHoverBackgroundColor: '#E53E3E',
            tension: 0.35,
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
            enabled: true,
            mode: 'index',
            intersect: false,
            backgroundColor: 'rgba(1, 31, 75, 0.94)',
            titleColor: '#E2E8F0',
            titleFont: { size: 11, weight: 'bold' },
            bodyColor: '#F7FAFC',
            bodyFont: { size: 11 },
            borderColor: 'rgba(97, 189, 240, 0.35)',
            borderWidth: 1,
            padding: 10,
            cornerRadius: 8,
            boxPadding: 4,
            usePointStyle: true,
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
              label(context) {
                const label = context.dataset.label || '';
                const val = context.parsed.y;
                if (label.includes('Risk')) {
                  const status = val >= 75 ? 'BAHAYA' : (val >= 50 ? 'WASPADA' : 'AMAN');
                  return ` ${label}: ${val}% (${status})`;
                }
                if (label.includes('Tilt') || label.includes('Kemiringan')) {
                  return ` ${label}: ${val.toFixed(2)}°`;
                }
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

  async loadChartRange(hours, btn) {
    this.currentHours = hours;
    if (btn && btn.parentElement) {
      btn.parentElement.querySelectorAll('.card-action-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    }
    try {
      const res = await API.get(`/sensor/history?hours=${hours}&limit=1000`);
      if (res.ok && res.data.data) {
        this.renderHistoryChart(res.data.data, hours);
      }
    } catch (err) {
      console.error('Error loading chart range:', err);
    }
  },

  async setPowerHistoryFilter(days, btn) {
    this.powerFilterDays = days;
    if (btn && btn.parentElement) {
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
    }

    const hours = (days || 7) * 24;
    try {
      const res = await API.get(`/sensor/history?hours=${hours}&limit=1000`);
      if (res.ok && res.data.data) {
        this.renderPowerHistoryChart(res.data.data, days);
        this.renderPowerHistoryTable(res.data.data);
      }
    } catch (err) {
      console.error('Error loading power history:', err);
    }
  },

  renderPowerHistoryChart(historyData, days = 7) {
    const ctx = document.getElementById('power-history-chart');
    if (!ctx) return;

    if (this.charts.power) { this.charts.power.destroy(); this.charts.power = null; }

    if (!historyData || historyData.length === 0) return;

    // Hitung ringkasan statistik daya
    let sumVsolar = 0, maxIsolar = 0, lastVaki = 12.6;
    historyData.forEach(d => {
      const vs = Number(d.vSolar || 0);
      const is = Number(d.iSolar || 0);
      sumVsolar += vs;
      if (is > maxIsolar) maxIsolar = is;
      if (d.vAki != null) lastVaki = Number(d.vAki);
    });

    const avgVsolar = (sumVsolar / historyData.length).toFixed(2);
    const elVsol = document.getElementById('stat-power-vsolar');
    const elIsol = document.getElementById('stat-power-isolar');
    const elVaki = document.getElementById('stat-power-vaki');
    const elStat = document.getElementById('stat-power-status');

    if (elVsol) elVsol.textContent = avgVsolar + ' V';
    if (elIsol) elIsol.textContent = maxIsolar + ' mA';
    if (elVaki) elVaki.textContent = lastVaki.toFixed(2) + ' V';
    if (elStat) {
      if (lastVaki < 11.5) {
        elStat.innerHTML = '<i class="fas fa-triangle-exclamation" style="color:var(--danger)"></i> TEGANGAN DROP (&lt;11.5V)';
        elStat.style.color = 'var(--danger)';
      } else if (lastVaki < 12.2) {
        elStat.innerHTML = '<i class="fas fa-circle-exclamation" style="color:var(--warning)"></i> PERLU PENGISIAN';
        elStat.style.color = 'var(--warning)';
      } else {
        elStat.innerHTML = '<i class="fas fa-circle-check" style="color:#059669"></i> NORMAL &amp; SEHAT';
        elStat.style.color = '#059669';
      }
    }

    const labels = historyData.map(d => {
      const dt = new Date(d.createdAt || d.timestamp);
      if (isNaN(dt.getTime())) return '--';
      if (days <= 1) {
        return dt.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
      }
      return dt.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
    });

    this.charts.power = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Tegangan Solar (V)',
            data: historyData.map(d => Number((d.vSolar || 0).toFixed(2))),
            borderColor: '#D97706',
            backgroundColor: 'rgba(217, 119, 6, 0.08)',
            borderWidth: 2,
            pointRadius: 0,
            pointHoverRadius: 5,
            tension: 0.35,
            fill: true,
            yAxisID: 'y',
            spanGaps: true
          },
          {
            label: 'Tegangan Aki (V)',
            data: historyData.map(d => Number((d.vAki || 12.6).toFixed(2))),
            borderColor: '#059669',
            backgroundColor: 'rgba(5, 150, 105, 0.08)',
            borderWidth: 2,
            pointRadius: 0,
            pointHoverRadius: 5,
            tension: 0.35,
            fill: true,
            yAxisID: 'y',
            spanGaps: true
          },
          {
            label: 'Arus Solar (mA)',
            data: historyData.map(d => Number(d.iSolar || 0)),
            borderColor: '#2563EB',
            backgroundColor: 'transparent',
            borderWidth: 1.5,
            borderDash: [3, 3],
            pointRadius: 0,
            pointHoverRadius: 5,
            tension: 0.35,
            fill: false,
            yAxisID: 'y1',
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
                if (label.includes('Arus')) return ` ${label}: ${val} mA`;
                return ` ${label}: ${val.toFixed(2)} Volt`;
              }
            }
          }
        },
        scales: {
          x: {
            ticks: {
              color: '#6497B1',
              maxTicksLimit: days > 1 ? 7 : 7,
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
            grid: { color: 'rgba(100, 151, 177, 0.1)' }
          },
          y: {
            position: 'left',
            min: 0,
            max: 22,
            title: { display: true, text: 'Tegangan (V)', color: '#011F4B', font: { size: 10, weight: '400' } },
            ticks: { color: '#6497B1', font: { size: 10, weight: '400' } },
            grid: { color: 'rgba(100, 151, 177, 0.1)' }
          },
          y1: {
            position: 'right',
            min: 0,
            max: 1500,
            title: { display: true, text: 'Arus Solar (mA)', color: '#2563EB', font: { size: 10, weight: '400' } },
            ticks: { color: '#2563EB', font: { size: 10, weight: '400' } },
            grid: { display: false }
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
    const isAuto = mode === 'auto';
    const btnAuto = document.getElementById('mode-btn-auto');
    const btnManual = document.getElementById('mode-btn-manual');
    if (btnAuto && btnManual) {
      if (isAuto) {
        btnAuto.className = 'mode-seg-btn active auto';
        btnManual.className = 'mode-seg-btn';
      } else {
        btnManual.className = 'mode-seg-btn active manual';
        btnAuto.className = 'mode-seg-btn';
      }
    }

    const cb = document.getElementById('drainage-mode-checkbox');
    if (cb) cb.checked = isAuto;

    const label = document.getElementById('drainage-mode-text');
    if (label) {
      label.textContent = isAuto ? 'Mode Otomatis (AI)' : 'Mode Manual (Tanpa AI)';
    }

    const note = document.getElementById('drainage-auto-note');
    if (note) {
      note.textContent = isAuto 
        ? 'Sistem otomatis aktif saat Risk Score ≥ 75%'
        : 'Mode manual aktif — Katup dikendalikan melalui tombol kendali di atas';
    }
  },

  async setDrainageMode(targetMode) {
    const role = AppState.user?.role;
    if (role !== 'admin' && role !== 'operator') {
      showToast('Hanya Admin/Operator yang dapat mengubah mode drainase', 'warning');
      this.updateDrainageModeUI(AppState.drainageMode);
      return;
    }

    // Demo mode check
    if (AppState.user?.isDemo) {
      showToast('🔒 Mode Demo: Akses kontrol fisik/kritis dibatasi (Read-Only). Anda hanya memiliki izin pemantauan.', 'warning');
      this.updateDrainageModeUI(AppState.drainageMode);
      return;
    }

    try {
      const { ok, data } = await API.post('/drainage/mode', { mode: targetMode });
      if (ok) {
        AppState.drainageMode = data.mode;
        showToast(data.message || `Mode drainase berhasil diubah ke ${targetMode === 'auto' ? 'Otomatis' : 'Manual'}!`, 'success');
      } else {
        showToast(data.message || 'Gagal mengubah mode', 'danger');
      }
    } catch (e) {
      showToast('Error: ' + e.message, 'danger');
    } finally {
      this.updateDrainageModeUI(AppState.drainageMode);
    }
  },

  async toggleDrainageMode() {
    const nextMode = AppState.drainageMode === 'auto' ? 'manual' : 'auto';
    await this.setDrainageMode(nextMode);
  },

  async setPowerHistoryFilter(days, btn) {
    this.powerFilterDays = days;
    if (btn && btn.parentElement) {
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
    }

    const hours = days * 24;
    try {
      const { ok, data } = await API.get(`/sensor/history?hours=${hours}&limit=1000`);
      if (ok && data.data) {
        this.renderPowerHistoryChart(data.data, days);
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

  // Demo user restriction: Read-Only
  if (AppState.user?.isDemo) {
    showToast('🔒 Mode Demo: Akses kontrol fisik/kritis dibatasi (Read-Only). Anda hanya memiliki izin pemantauan.', 'warning');
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

// Global hook for inline HTML calls
window.loadChartRange = function(hours, btn) {
  Dashboard.loadChartRange(hours, btn);
};

