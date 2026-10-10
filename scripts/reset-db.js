/**
 * Apex LMS - Reset Database Utility
 * Wipes existing database and re-runs schema and seed script
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const dbPath = path.join(__dirname, '..', 'data', 'library.db');
const walPath = path.join(__dirname, '..', 'data', 'library.db-wal');
const shmPath = path.join(__dirname, '..', 'data', 'library.db-shm');

console.log('🧹 Resetting Apex LMS Database...');

// Remove database files if present
[dbPath, walPath, shmPath].forEach(file => {
  if (fs.existsSync(file)) {
    try {
      fs.unlinkSync(file);
      console.log(`  🗑️ Removed ${path.basename(file)}`);
    } catch (err) {
      console.warn(`  ⚠️ Could not remove ${path.basename(file)} (may be locked if server is running)`);
    }
  }
});

// Run seed script
try {
  console.log('🌱 Re-seeding database schema and initial data...');
  require('../database/seed');
  console.log('✨ Database reset and seeded successfully!');
} catch (err) {
  console.error('❌ Failed to seed database:', err);
  process.exit(1);
}
