const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { db, DB_PATH, BACKUP_DIR, getSetting, setSetting, getAllSettings } = require('../database/db');
const { authenticate, requireRole, optionalAuth } = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');
const { createBackup, listBackups, restoreBackup } = require('../utils/backup');
const { getLocalIpAddresses } = require('../utils/ipHelper');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 100 * 1024 * 1024 } });

// GET /api/system/settings (Fetch settings)
router.get('/settings', optionalAuth, (req, res) => {
  const all = getAllSettings();
  // Safe settings visible to all
  const publicSettings = {
    library_name: all.library_name || 'College Library',
    library_code: all.library_code || 'LIB',
    theme_accent: all.theme_accent || 'violet',
    gamification_enabled: all.gamification_enabled === '1',
    kiosk_timeout_seconds: parseInt(all.kiosk_timeout_seconds || '60', 10),
    fine_per_day: parseFloat(all.fine_per_day || '2.0'),
    student_max_books: parseInt(all.student_max_books || '3', 10),
    student_loan_days: parseInt(all.student_loan_days || '14', 10),
    student_max_renewals: parseInt(all.student_max_renewals || '2', 10),
    faculty_max_books: parseInt(all.faculty_max_books || '8', 10),
    faculty_loan_days: parseInt(all.faculty_loan_days || '30', 10),
    faculty_max_renewals: parseInt(all.faculty_max_renewals || '4', 10)
  };

  const isLibrarian = req.user && ['librarian', 'admin'].includes(req.user.role);
  if (isLibrarian) {
    return res.json({ success: true, settings: all, publicSettings });
  }

  return res.json({ success: true, settings: publicSettings });
});

// PUT /api/system/settings (Update settings)
router.put('/settings', authenticate, requireRole('librarian', 'admin'), (req, res) => {
  const updates = req.body;

  const allowedKeys = [
    'library_name', 'library_code', 'student_max_books', 'student_loan_days',
    'student_max_renewals', 'faculty_max_books', 'faculty_loan_days',
    'faculty_max_renewals', 'fine_per_day', 'theme_accent', 'gamification_enabled',
    'kiosk_timeout_seconds', 'auto_backup_dir'
  ];

  for (const [key, value] of Object.entries(updates)) {
    if (allowedKeys.includes(key)) {
      setSetting(key, value);
    }
  }

  logAudit(req, 'UPDATE_SETTINGS', 'setting', 'all', updates);

  return res.json({ success: true, message: 'Settings updated successfully.', settings: getAllSettings() });
});

// POST /api/system/backup (Create hot SQLite backup)
router.post('/backup', authenticate, requireRole('librarian', 'admin'), (req, res) => {
  try {
    const backupResult = createBackup();
    logAudit(req, 'CREATE_BACKUP', 'system', backupResult.filename, `Database backup created (${(backupResult.size / 1024).toFixed(1)} KB)`);
    return res.json({ success: true, message: 'Database backup created successfully!', backup: backupResult });
  } catch (err) {
    return res.status(500).json({ success: false, message: `Backup failed: ${err.message}` });
  }
});

// GET /api/system/backups (List backups)
router.get('/backups', authenticate, requireRole('librarian', 'admin'), (req, res) => {
  const backups = listBackups();
  return res.json({ success: true, backups });
});

// GET /api/system/backups/download/:filename (Download backup)
router.get('/backups/download/:filename', authenticate, requireRole('librarian', 'admin'), (req, res) => {
  const filename = path.basename(req.params.filename);
  const backupDir = getSetting('auto_backup_dir') || BACKUP_DIR;
  const filePath = path.join(backupDir, filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ success: false, message: 'Backup file not found.' });
  }

  logAudit(req, 'DOWNLOAD_BACKUP', 'system', filename, `Downloaded backup ${filename}`);
  return res.download(filePath, filename);
});

// POST /api/system/restore (Restore database from uploaded .db file)
router.post('/restore', authenticate, requireRole('admin'), upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'Please select a database backup file (.db).' });
  }

  const tempRestorePath = path.join(BACKUP_DIR, `temp_restore_${Date.now()}.db`);
  fs.writeFileSync(tempRestorePath, req.file.buffer);

  try {
    const restoreResult = restoreBackup(tempRestorePath);
    if (fs.existsSync(tempRestorePath)) fs.unlinkSync(tempRestorePath);

    logAudit(req, 'RESTORE_BACKUP', 'system', 'database', `Database restored from upload. Pre-restore safety backup: ${restoreResult.safetyBackup}`);
    return res.json({
      success: true,
      message: 'Database successfully restored from backup! A safety backup of the previous state was also preserved.',
      safetyBackup: restoreResult.safetyBackup
    });
  } catch (err) {
    if (fs.existsSync(tempRestorePath)) fs.unlinkSync(tempRestorePath);
    return res.status(500).json({ success: false, message: `Restore failed: ${err.message}` });
  }
});

// GET /api/system/audit-logs (View audit trail)
router.get('/audit-logs', authenticate, requireRole('librarian', 'admin'), (req, res) => {
  const { action = '', search = '', page = 1, limit = 50 } = req.query;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const pageLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
  const offset = (pageNum - 1) * pageLimit;

  let whereClauses = [];
  let params = [];

  if (action) {
    whereClauses.push('action = ?');
    params.push(action);
  }

  if (search) {
    whereClauses.push('(user_name LIKE ? OR details LIKE ? OR entity_type LIKE ? OR ip_address LIKE ?)');
    const like = `%${search.trim()}%`;
    params.push(like, like, like, like);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const countRow = db.prepare(`SELECT COUNT(*) as total FROM audit_logs ${whereSql}`).get(...params);
  const total = countRow ? countRow.total : 0;

  const logs = db.prepare(`
    SELECT * FROM audit_logs
    ${whereSql}
    ORDER BY id DESC
    LIMIT ? OFFSET ?
  `).all(...params, pageLimit, offset);

  return res.json({
    success: true,
    logs,
    pagination: {
      total,
      page: pageNum,
      limit: pageLimit,
      totalPages: Math.ceil(total / pageLimit)
    }
  });
});

// GET /api/system/health (Low-resource monitor & network info)
router.get('/health', optionalAuth, (req, res) => {
  const memoryUsage = process.memoryUsage();
  let dbStat = null;
  try {
    dbStat = fs.statSync(DB_PATH);
  } catch (e) {}

  const totalBooks = db.prepare('SELECT COUNT(*) as count FROM books').get().count;
  const totalMembers = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  const totalTransactions = db.prepare('SELECT COUNT(*) as count FROM transactions').get().count;

  const lanIps = getLocalIpAddresses();

  return res.json({
    success: true,
    status: 'healthy',
    uptime_seconds: Math.floor(process.uptime()),
    memory: {
      rss_mb: (memoryUsage.rss / 1024 / 1024).toFixed(1),
      heap_used_mb: (memoryUsage.heapUsed / 1024 / 1024).toFixed(1),
      heap_total_mb: (memoryUsage.heapTotal / 1024 / 1024).toFixed(1),
      system_free_mb: (os.freemem() / 1024 / 1024).toFixed(1)
    },
    database: {
      size_kb: dbStat ? (dbStat.size / 1024).toFixed(1) : 0,
      journal_mode: 'WAL',
      total_books: totalBooks,
      total_members: totalMembers,
      total_transactions: totalTransactions
    },
    network: {
      hostname: os.hostname(),
      lan_ips: lanIps
    }
  });
});

module.exports = router;
