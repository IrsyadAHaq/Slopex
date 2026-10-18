// ============================================================
// SLOPEX — Local JSON File Database Engine
// Menyimpan semua data secara lokal di folder data/
// Persisten, tanpa dependency eksternal (tanpa MongoDB)
// ============================================================
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const DATA_DIR = path.join(__dirname, '..', 'data');

// Pastikan folder data/ ada
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// ===== FILE SAVE ENGINES =====
const saveTimers = {};
let isDbLoaded = false;

function ensureLoaded() {
  if (!isDbLoaded) {
    for (const col of Object.keys(DB.memoryDb)) {
      DB.memoryDb[col] = loadCollection(col);
    }
    isDbLoaded = true;
  }
}

function saveImmediately(collection) {
  ensureLoaded();
  if (saveTimers[collection]) {
    clearTimeout(saveTimers[collection]);
    delete saveTimers[collection];
  }
  try {
    const filePath = path.join(DATA_DIR, collection + '.json');
    const data = DB.memoryDb[collection] || [];
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    console.error(`[DB] Gagal menyimpan ${collection}.json secara langsung:`, e.message);
  }
}

function scheduleSave(collection) {
  if (saveTimers[collection]) clearTimeout(saveTimers[collection]);
  saveTimers[collection] = setTimeout(() => {
    saveImmediately(collection);
  }, 300); // 300ms debounce
}

function flushAllSaves() {
  if (!isDbLoaded) return;
  for (const collection of Object.keys(DB.memoryDb)) {
    try {
      const filePath = path.join(DATA_DIR, collection + '.json');
      const data = DB.memoryDb[collection] || [];
      if (data.length === 0 && fs.existsSync(filePath)) {
        const stat = fs.statSync(filePath);
        if (stat.size > 10) continue; // Lindungi file dari penimpaan array kosong tidak sengaja
      }
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    } catch (e) {
      console.error(`[DB] Flush error for ${collection}:`, e.message);
    }
  }
}

process.on('exit', () => flushAllSaves());
process.on('SIGINT', () => { flushAllSaves(); process.exit(0); });
process.on('SIGTERM', () => { flushAllSaves(); process.exit(0); });


// ===== LOAD DATA DARI FILE =====
function loadCollection(collection) {
  const filePath = path.join(DATA_DIR, collection + '.json');
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn(`[DB] Gagal membaca ${collection}.json, mulai kosong:`, e.message);
  }
  return [];
}

// ===== CONNECT (LOAD ALL) =====
function connectDB() {
  for (const col of Object.keys(DB.memoryDb)) {
    DB.memoryDb[col] = loadCollection(col);
  }
  isDbLoaded = true;
  const counts = Object.entries(DB.memoryDb).map(([k, v]) => `${k}: ${v.length}`).join(', ');
  console.log('\n[DB] Database lokal dimuat dari file JSON.');
  console.log(`[DB] ${counts}`);
}

// ===== FILTER MATCHING =====
function matchesFilter(item, filter = {}) {
  for (const [key, val] of Object.entries(filter)) {
    if (val === undefined || val === null) continue;
    if (typeof val === 'object' && !Array.isArray(val)) {
      const itemVal = item[key];
      const isDateComparison = (key === 'createdAt' || key === 'updatedAt' || key === 'timestamp') &&
                               (typeof itemVal === 'string' || typeof itemVal === 'number');

      if ('$gte' in val) {
        if (isDateComparison) {
          const itemTime = new Date(itemVal).getTime();
          const targetTime = new Date(val.$gte).getTime();
          if (isNaN(itemTime) || isNaN(targetTime) || itemTime < targetTime) return false;
        } else if (!(itemVal >= val.$gte)) {
          return false;
        }
      }
      if ('$lte' in val) {
        if (isDateComparison) {
          const itemTime = new Date(itemVal).getTime();
          const targetTime = new Date(val.$lte).getTime();
          if (isNaN(itemTime) || isNaN(targetTime) || itemTime > targetTime) return false;
        } else if (!(itemVal <= val.$lte)) {
          return false;
        }
      }
      if ('$ne' in val && itemVal === val.$ne) return false;
      if ('$in' in val && !val.$in.includes(itemVal)) return false;
    } else {
      if (item[key] !== val) return false;
    }
  }
  return true;
}

// ===== DATABASE API =====
const DB = {
  memoryDb: {
    users: [],
    sensor_data: [],
    alerts: [],
    drainage_logs: []
  },

  find(collection, filter = {}, opts = {}) {
    ensureLoaded();
    let docs = (this.memoryDb[collection] || []).filter(d => matchesFilter(d, filter));
    if (opts.sort) {
      const [field, dir] = Object.entries(opts.sort)[0];
      docs.sort((a, b) => {
        const av = a[field], bv = b[field];
        return dir === -1 || dir === 'DESC'
          ? (av < bv ? 1 : av > bv ? -1 : 0)
          : (av < bv ? -1 : av > bv ? 1 : 0);
      });
    }
    if (opts.limit) docs = docs.slice(0, opts.limit);
    if (opts.select) {
      const fields = opts.select.split(' ');
      docs = docs.map(d => {
        const out = {};
        fields.forEach(f => { if (f in d) out[f] = d[f]; });
        return out;
      });
    }
    return docs;
  },

  findOne(collection, filter = {}) {
    ensureLoaded();
    return (this.memoryDb[collection] || []).find(d => matchesFilter(d, filter)) || null;
  },

  findById(collection, id) {
    ensureLoaded();
    return (this.memoryDb[collection] || []).find(d => d.id === id) || null;
  },

  async insert(collection, data) {
    ensureLoaded();
    const doc = {
      id: data.id || uuidv4(),
      ...data,
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    if (!this.memoryDb[collection]) this.memoryDb[collection] = [];
    this.memoryDb[collection].push(doc);
    scheduleSave(collection);
    return doc;
  },

  async insertMany(collection, dataArray) {
    ensureLoaded();
    const docs = dataArray.map(d => ({
      id: d.id || uuidv4(),
      ...d,
      createdAt: d.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }));
    if (!this.memoryDb[collection]) this.memoryDb[collection] = [];
    this.memoryDb[collection].push(...docs);
    scheduleSave(collection);
    return docs;
  },

  async updateById(collection, id, updates) {
    ensureLoaded();
    const arr = this.memoryDb[collection] || [];
    const idx = arr.findIndex(d => d.id === id);
    if (idx === -1) return null;
    arr[idx] = { ...arr[idx], ...updates, updatedAt: new Date().toISOString() };
    scheduleSave(collection);
    return arr[idx];
  },

  async updateMany(collection, filter, updates) {
    ensureLoaded();
    const arr = this.memoryDb[collection] || [];
    let count = 0;
    arr.forEach((d, i) => {
      if (matchesFilter(d, filter)) {
        arr[i] = { ...d, ...updates, updatedAt: new Date().toISOString() };
        count++;
      }
    });
    if (count > 0) scheduleSave(collection);
    return count;
  },

  async deleteById(collection, id) {
    ensureLoaded();
    const arr = this.memoryDb[collection] || [];
    const idx = arr.findIndex(d => d.id === id);
    if (idx !== -1) {
      arr.splice(idx, 1);
      scheduleSave(collection);
      return true;
    }
    return false;
  },

  async deleteMany(collection, filter = {}) {
    ensureLoaded();
    const arr = this.memoryDb[collection] || [];
    const before = arr.length;
    this.memoryDb[collection] = arr.filter(d => !matchesFilter(d, filter));
    const deleted = before - this.memoryDb[collection].length;
    if (deleted > 0) scheduleSave(collection);
    return deleted;
  },

  count(collection, filter = {}) {
    ensureLoaded();
    return (this.memoryDb[collection] || []).filter(d => matchesFilter(d, filter)).length;
  },

  async clear(collection) {
    ensureLoaded();
    this.memoryDb[collection] = [];
    scheduleSave(collection);
  }
};

module.exports = { DB, connectDB, saveImmediately };
