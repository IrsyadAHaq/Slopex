// ===== SLOPEX FRONTEND CONFIG =====
const SLOPEX_CONFIG = {
  API_BASE: window.location.origin + '/api',
  WS_URL: window.location.origin,
  VERSION: '1.0.0'
};

// ===== STATE MANAGEMENT =====
const AppState = {
  token: localStorage.getItem('slopex_token'),
  user: JSON.parse(localStorage.getItem('slopex_user') || 'null'),
  latestSensor: null,
  drainageOpen: false,
  conversationHistory: [],
  alerts: [],
  socket: null,
  charts: {},
  mapInstance: null,
  mapMarker: null
};

// ===== API HELPER =====
const API = {
  async request(method, endpoint, body = null, requireAuth = true) {
    const headers = { 'Content-Type': 'application/json' };
    if (requireAuth && AppState.token) {
      headers['Authorization'] = `Bearer ${AppState.token}`;
    }

    const options = { method, headers };
    if (body) options.body = JSON.stringify(body);

    const res = await fetch(`${SLOPEX_CONFIG.API_BASE}${endpoint}`, options);
    const data = await res.json();

    if (res.status === 401 && requireAuth) {
      Auth.logout();
      throw new Error('Sesi berakhir. Silakan login kembali.');
    }

    return { ok: res.ok, status: res.status, data };
  },

  get: (endpoint) => API.request('GET', endpoint),
  post: (endpoint, body) => API.request('POST', endpoint, body),
  put: (endpoint, body) => API.request('PUT', endpoint, body),
  postPublic: (endpoint, body) => API.request('POST', endpoint, body, false),
};
