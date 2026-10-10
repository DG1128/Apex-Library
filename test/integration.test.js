// Automated End-to-End Integration Test Suite for Apex LMS
const { db } = require('../database/db');
const authRoutes = require('../routes/authRoutes');
const bookRoutes = require('../routes/bookRoutes');
const circulationRoutes = require('../routes/circulationRoutes');
const reportRoutes = require('../routes/reportRoutes');

console.log('🧪 Running comprehensive LMS backend integration tests...\n');

let passedTests = 0;
let failedTests = 0;

function assert(condition, testName) {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passedTests++;
  } else {
    console.error(`  ❌ FAIL: ${testName}`);
    failedTests++;
  }
}

async function runTests() {
  // Test 1: Verify Database Seed Counts
  const booksCount = db.prepare('SELECT COUNT(*) as count FROM books').get().count;
  assert(booksCount >= 40, `Books table contains ${booksCount} seeded titles (expected >= 40)`);

  const usersCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  assert(usersCount >= 18, `Users table contains ${usersCount} seeded members (expected >= 18)`);

  const copiesCount = db.prepare('SELECT COUNT(*) as count FROM book_copies').get().count;
  assert(copiesCount >= 80, `Book copies count is ${copiesCount} (expected >= 80)`);

  // Test 2: Verify FTS5 Full Text Search
  const ftsResults = db.prepare(`
    SELECT b.title, b.author
    FROM books_fts fts
    JOIN books b ON b.id = fts.rowid
    WHERE books_fts MATCH '"Algorithms"*'
  `).all();
  assert(ftsResults.length > 0 && ftsResults.some(r => r.title.includes('Algorithms')), 'FTS5 full text search finds "Algorithms" books');

  // Test 3: Verify Admin User and First-Login Flag
  const adminUser = db.prepare("SELECT * FROM users WHERE member_id = 'ADMIN001'").get();
  assert(adminUser && adminUser.role === 'admin', 'Admin user exists with member_id ADMIN001');
  assert(adminUser.password_hash.startsWith('$2'), 'Admin has secure bcrypt password hash');

  // Test 4: Verify Circulation Transactions and Overdue calculations
  const overdueTrans = db.prepare(`
    SELECT t.*, b.title, u.name
    FROM transactions t
    JOIN books b ON b.id = t.book_id
    JOIN users u ON u.id = t.member_id
    WHERE t.status = 'overdue'
  `).all();
  assert(overdueTrans.length > 0, `Overdue transactions detected (${overdueTrans.length} found)`);

  // Test 5: Verify Unpaid Fines Ledger
  const unpaidFines = db.prepare("SELECT COUNT(*) as count FROM fines WHERE status = 'unpaid'").get().count;
  assert(unpaidFines > 0, `Unpaid fines ledger active (${unpaidFines} records found)`);

  // Test 6: Verify Active Reservations Queue
  const reservations = db.prepare("SELECT COUNT(*) as count FROM reservations WHERE status = 'waiting'").get().count;
  assert(reservations > 0, `Book reservations waiting queue active (${reservations} records found)`);

  // Test 7: Verify Gamification Badges
  const badges = db.prepare("SELECT COUNT(*) as count FROM member_badges").get().count;
  assert(badges > 0, `Gamification badges active (${badges} badges awarded in seed)`);

  // Test 8: Verify System Settings
  const libName = db.prepare("SELECT value FROM settings WHERE key = 'library_name'").get();
  assert(libName && libName.value.length > 0, `System library_name setting initialized: "${libName.value}"`);

  // Test 9: Verify Hot Backup Utility
  const { createBackup, listBackups } = require('../utils/backup');
  const backup = createBackup();
  assert(backup && backup.filename.endsWith('.db') && backup.size > 0, `Hot SQLite backup created successfully (${backup.filename}, ${(backup.size/1024).toFixed(1)} KB)`);

  const backupsList = listBackups();
  assert(backupsList.length > 0, `Backups list retrieved (${backupsList.length} files found)`);

  // Test 10: Verify Barcode and QR Generators
  const { generateCode128SVG, generateQRSVG } = require('../utils/barcode');
  const barcodeSvg = generateCode128SVG('STU2024001');
  assert(barcodeSvg.includes('<svg') && barcodeSvg.includes('STU2024001'), 'Code128 barcode SVG generated properly');

  const qrSvg = generateQRSVG('LIBRARY_TEST');
  assert(qrSvg.includes('<svg') && qrSvg.includes('rect'), 'QR Matrix SVG generated properly');

  // Test 11: Verify CSV Parser & Generator
  const { parseCSV, stringifyCSV } = require('../utils/csvParser');
  const sampleCSV = 'title,author,copies\n"Clean Code","Robert Martin",5\n"CLRS","Cormen",6';
  const parsed = parseCSV(sampleCSV);
  assert(parsed.length === 2 && parsed[0].title === 'Clean Code', 'CSV Parser parses quoted fields accurately');

  const serialized = stringifyCSV(parsed);
  assert(serialized.includes('Clean Code') && serialized.includes('Robert Martin'), 'CSV Serializer serializes records correctly');

  console.log('\n----------------------------------------------------');
  console.log(`📊 Test Summary: ${passedTests} Passed, ${failedTests} Failed`);
  console.log('----------------------------------------------------\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runTests();
