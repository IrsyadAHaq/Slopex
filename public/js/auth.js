// ===== AUTH MODULE =====
const Auth = {
  // Login dengan email + password
  async login(email, password) {
    const { ok, data } = await API.postPublic('/auth/login', { email, password });

    if (!ok) throw new Error(data.message || 'Login gagal');

    AppState.token = data.token;
    AppState.user = data.user;
    localStorage.setItem('slopex_token', data.token);
    localStorage.setItem('slopex_user', JSON.stringify(data.user));

    return data;
  },

  // Register
  async register(name, email, password, role = 'viewer', whatsapp = '') {
    const { ok, data } = await API.postPublic('/auth/register', { name, email, password, role, whatsapp });
    if (!ok) throw new Error(data.message || 'Registrasi gagal');

    if (data.pending) {
      return { pending: true, message: data.message };
    }

    AppState.token = data.token;
    AppState.user = data.user;
    localStorage.setItem('slopex_token', data.token);
    localStorage.setItem('slopex_user', JSON.stringify(data.user));

    return { pending: false };
  },

  // Logout
  logout() {
    AppState.token = null;
    AppState.user = null;
    localStorage.removeItem('slopex_token');
    localStorage.removeItem('slopex_user');

    if (AppState.socket) {
      AppState.socket.disconnect();
      AppState.socket = null;
    }

    // Tampilkan auth screen
    document.getElementById('auth-screen').style.display = 'flex';
    document.getElementById('app-wrapper').style.display = 'none';
  },

  // Cek apakah user sudah login
  isLoggedIn() {
    return !!AppState.token && !!AppState.user;
  },

  // Update UI user info di sidebar
  updateUserUI() {
    if (!AppState.user) return;

    const nameEls = document.querySelectorAll('.user-display-name');
    const roleEls = document.querySelectorAll('.user-display-role');
    const initEls = document.querySelectorAll('.user-avatar-init');

    const roleLabels = { admin: 'Administrator', operator: 'Operator', viewer: 'Viewer' };

    nameEls.forEach(el => el.textContent = AppState.user.name);
    roleEls.forEach(el => el.textContent = roleLabels[AppState.user.role] || AppState.user.role);
    initEls.forEach(el => el.textContent = AppState.user.name.charAt(0).toUpperCase());

    // Tampilkan/sembunyikan fitur admin
    const adminOnlyEls = document.querySelectorAll('.admin-only');
    adminOnlyEls.forEach(el => {
      el.style.display = AppState.user.role === 'admin' ? '' : 'none';
    });
  }
};

// handleAuthTabSwitch and fillDemoAccount are defined in index.html inline script

async function handleLogin(retryCount = 0) {
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const btn = document.getElementById('login-btn');
  const errEl = document.getElementById('login-error');

  if (!email || !password) {
    errEl.textContent = 'Email dan password wajib diisi.';
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Masuk...';
  errEl.textContent = '';

  try {
    await Auth.login(email, password);
    await App.initialize();
  } catch (err) {
    // Jika login demo account gagal dan belum retry, coba lagi
    // (server mungkin masih memproses auto-seed)
    const isDemoEmail = ['admin@slopex.id', 'operator@slopex.id', 'viewer@slopex.id'].includes(email);
    if (isDemoEmail && retryCount < 2) {
      errEl.textContent = 'Menyiapkan akun demo, mohon tunggu...';
      errEl.style.color = 'var(--warning, #DD6B20)';
      await new Promise(r => setTimeout(r, 3000));
      errEl.style.color = '';
      return handleLogin(retryCount + 1);
    }

    errEl.textContent = err.message;
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-right-to-bracket" style="margin-right:8px"></i>Masuk ke SLOPEX';
  }
}

async function handleRegister() {
  const name = document.getElementById('reg-name').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value;
  const whatsapp = document.getElementById('reg-whatsapp').value.trim();
  const role = document.getElementById('reg-role').value || 'viewer';
  const btn = document.getElementById('register-btn');
  const errEl = document.getElementById('register-error');

  if (!name || !email || !password) {
    errEl.textContent = 'Semua field wajib diisi.';
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Mendaftar...';
  errEl.textContent = '';

  try {
    const result = await Auth.register(name, email, password, role, whatsapp);
    if (result.pending) {
      errEl.style.color = '#48bb78'; // Hijau
      errEl.textContent = result.message;
      btn.textContent = 'Menunggu Verifikasi';
    } else {
      await App.initialize();
    }
  } catch (err) {
    errEl.style.color = '#f56565'; // Merah (default)
    errEl.textContent = err.message;
    btn.disabled = false;
    btn.textContent = 'Daftar Sekarang';
  }
}
