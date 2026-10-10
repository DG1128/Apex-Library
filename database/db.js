const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const DATA_DIR = path.join(__dirname, '..', 'data');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');
const DB_PATH = path.join(DATA_DIR, 'library.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

// Open / create SQLite database
const db = new DatabaseSync(DB_PATH);

// Configure SQLite pragmas for maximum speed, concurrency, and reliability
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');
db.exec('PRAGMA synchronous = NORMAL;');
db.exec('PRAGMA busy_timeout = 5000;');
db.exec('PRAGMA cache_size = -64000;'); // ~64MB cache
db.exec('PRAGMA temp_store = MEMORY;');

// Helper for atomic transactions
db.transaction = function(fn) {
  return function(...args) {
    db.exec('BEGIN IMMEDIATE;');
    try {
      const result = fn(...args);
      db.exec('COMMIT;');
      return result;
    } catch (err) {
      db.exec('ROLLBACK;');
      throw err;
    }
  };
};

// Initialize schema
const schemaSql = fs.readFileSync(SCHEMA_PATH, 'utf8');
db.exec(schemaSql);

// Initialize default system settings if not already present
const defaultSettings = [
  { key: 'library_name', value: 'Apex Institute of Technology Library' },
  { key: 'library_code', value: 'AIT-LIB' },
  { key: 'student_max_books', value: '3' },
  { key: 'student_loan_days', value: '14' },
  { key: 'student_max_renewals', value: '2' },
  { key: 'faculty_max_books', value: '8' },
  { key: 'faculty_loan_days', value: '30' },
  { key: 'faculty_max_renewals', value: '4' },
  { key: 'fine_per_day', value: '2.0' }, // Currency per day overdue
  { key: 'theme_accent', value: 'violet' }, // 'violet', 'cyan', 'emerald', 'sunset', 'amber'
  { key: 'gamification_enabled', value: '1' },
  { key: 'kiosk_timeout_seconds', value: '60' },
  { key: 'auto_backup_dir', value: BACKUP_DIR }
];

const checkSettingStmt = db.prepare('SELECT value FROM settings WHERE key = ?');
const insertSettingStmt = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)');

for (const s of defaultSettings) {
  const existing = checkSettingStmt.get(s.key);
  if (!existing) {
    insertSettingStmt.run(s.key, s.value);
  }
}

// Helper to get a setting
function getSetting(key, defaultValue = '') {
  const row = checkSettingStmt.get(key);
  return row ? row.value : defaultValue;
}

// Helper to get all settings as an object
function getAllSettings() {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const obj = {};
  for (const r of rows) {
    obj[r.key] = r.value;
  }
  return obj;
}

// Helper to update settings
function setSetting(key, value) {
  db.prepare(`
    INSERT INTO settings (key, value, updated_at)
    VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
  `).run(key, String(value));
}

module.exports = {
  db,
  DB_PATH,
  DATA_DIR,
  BACKUP_DIR,
  getSetting,
  getAllSettings,
  setSetting
};
