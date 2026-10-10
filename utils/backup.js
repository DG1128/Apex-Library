const path = require('path');
const fs = require('fs');
const { db, DB_PATH, BACKUP_DIR, getSetting } = require('../database/db');

// Create a timestamped hot backup
function createBackup(customDir = null) {
  const targetDir = customDir || getSetting('auto_backup_dir') || BACKUP_DIR;
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  // Force WAL checkpoint to ensure all data is flushed to main file
  try {
    db.exec('PRAGMA wal_checkpoint(TRUNCATE);');
  } catch (e) {
    console.warn('Checkpoint warning:', e.message);
  }

  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const filename = `library_backup_${timestamp}.db`;
  const targetPath = path.join(targetDir, filename);

  fs.copyFileSync(DB_PATH, targetPath);

  const stats = fs.statSync(targetPath);
  return {
    filename,
    filepath: targetPath,
    size: stats.size,
    created_at: now.toISOString()
  };
}

// List all existing backups
function listBackups(customDir = null) {
  const targetDir = customDir || getSetting('auto_backup_dir') || BACKUP_DIR;
  if (!fs.existsSync(targetDir)) {
    return [];
  }

  const files = fs.readdirSync(targetDir);
  const backups = [];

  for (const f of files) {
    if (f.endsWith('.db') || f.endsWith('.sqlite')) {
      const fullPath = path.join(targetDir, f);
      try {
        const stat = fs.statSync(fullPath);
        backups.push({
          filename: f,
          size: stat.size,
          created_at: stat.mtime.toISOString(),
          filepath: fullPath
        });
      } catch (e) {}
    }
  }

  return backups.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

// Restore database from a given file
function restoreBackup(sourceFilePath) {
  if (!fs.existsSync(sourceFilePath)) {
    throw new Error('Backup source file does not exist');
  }

  // Create a safety pre-restore backup first
  const safetyBackup = createBackup();

  try {
    // Flush WAL
    db.exec('PRAGMA wal_checkpoint(TRUNCATE);');
    // Copy new file over
    fs.copyFileSync(sourceFilePath, DB_PATH);
    // Remove stale wal / shm files if present
    const walPath = `${DB_PATH}-wal`;
    const shmPath = `${DB_PATH}-shm`;
    if (fs.existsSync(walPath)) fs.unlinkSync(walPath);
    if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);

    return { success: true, safetyBackup: safetyBackup.filename };
  } catch (err) {
    throw new Error(`Failed to restore database: ${err.message}`);
  }
}

module.exports = {
  createBackup,
  listBackups,
  restoreBackup
};
