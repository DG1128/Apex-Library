const assert = require('assert');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db, getSetting, updateSetting } = require('../database/db');
const { calculateFine } = require('../routes/circulationRoutes');
const { parseCSV, stringifyCSV } = require('../utils/csvParser');
const { generateCode128SVG, generateQRSVG } = require('../utils/barcode');
const { createBackup, listBackups } = require('../utils/backup');

console.log('\n🧪 =========================================================');
console.log('   RUNNING APEX LMS COMPREHENSIVE AUTOMATED TEST SUITE');
console.log('=========================================================\n');

let passed = 0;
let failed = 0;

function it(description, fn) {
  try {
    fn();
    console.log(`  ✅ PASS: ${description}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${description}`);
    console.error(`     Error: ${err.message}`);
    failed++;
  }
}

// 1. Authentication & Security Tests
it('Admin user exists and password hashes match', () => {
  const admin = db.prepare("SELECT * FROM users WHERE member_id = 'ADMIN001'").get();
  assert.ok(admin, 'Admin user record must exist');
  assert.strictEqual(admin.role, 'admin');
  assert.strictEqual(admin.force_password_change, 1);
  const match = bcrypt.compareSync('admin127', admin.password_hash);
  assert.ok(match, 'Default admin password should verify against stored hash');
});

it('JWT token generation and verification works with secret', () => {
  const secret = process.env.JWT_SECRET || 'apex-library-secure-jwt-secret-key-2024';
  const payload = { id: 1, member_id: 'ADMIN001', role: 'admin' };
  const token = jwt.sign(payload, secret, { expiresIn: '1h' });
  const decoded = jwt.verify(token, secret);
  assert.strictEqual(decoded.member_id, 'ADMIN001');
  assert.strictEqual(decoded.role, 'admin');
});

// 2. FTS5 Search & Book Catalog Tests
it('Books catalog contains seeded data and FTS5 search functions', () => {
  const count = db.prepare('SELECT COUNT(*) as count FROM books').get().count;
  assert.ok(count >= 30, `Expected at least 30 books, found ${count}`);

  const fts = db.prepare(`
    SELECT b.title, b.author
    FROM books_fts fts
    JOIN books b ON b.id = fts.rowid
    WHERE books_fts MATCH '"Design"*'
  `).all();
  assert.ok(fts.length > 0, 'FTS5 search should find titles matching "Design"');
});

// 3. Circulation Lifecycle: Issue, Availability & Return
it('Circulation issue and return updates book availability correctly', () => {
  const book = db.prepare('SELECT * FROM books WHERE available_copies > 0 LIMIT 1').get();
  assert.ok(book, 'Need at least one available book for test');
  
  const copy = db.prepare("SELECT * FROM book_copies WHERE book_id = ? AND status = 'available' LIMIT 1").get(book.id);
  assert.ok(copy, 'Copy must exist in available state');

  const member = db.prepare("SELECT * FROM users WHERE role = 'student' AND status = 'active' LIMIT 1").get();
  assert.ok(member, 'Active student member must exist');

  const initialAvailable = book.available_copies;

  // Perform Issue
  const issueTx = db.transaction(() => {
    const issueDate = new Date().toISOString().split('T')[0];
    const dueDateObj = new Date();
    dueDateObj.setDate(dueDateObj.getDate() + 14);
    const dueDate = dueDateObj.toISOString().split('T')[0];

    const result = db.prepare(`
      INSERT INTO transactions (book_id, copy_id, member_id, issue_date, due_date, status)
      VALUES (?, ?, ?, ?, ?, 'issued')
    `).run(book.id, copy.id, member.id, issueDate, dueDate);

    db.prepare("UPDATE book_copies SET status = 'issued' WHERE id = ?").run(copy.id);
    db.prepare('UPDATE books SET available_copies = available_copies - 1 WHERE id = ?').run(book.id);

    return result.lastInsertRowid;
  });

  const txId = issueTx();
  const bookAfterIssue = db.prepare('SELECT available_copies FROM books WHERE id = ?').get(book.id);
  assert.strictEqual(bookAfterIssue.available_copies, initialAvailable - 1, 'Available copies should decrement by 1');

  // Perform Return
  const returnTx = db.transaction(() => {
    const returnDate = new Date().toISOString().split('T')[0];
    db.prepare("UPDATE transactions SET return_date = ?, status = 'returned' WHERE id = ?").run(returnDate, txId);
    db.prepare("UPDATE book_copies SET status = 'available' WHERE id = ?").run(copy.id);
    db.prepare('UPDATE books SET available_copies = available_copies + 1 WHERE id = ?').run(book.id);
  });

  returnTx();
  const bookAfterReturn = db.prepare('SELECT available_copies FROM books WHERE id = ?').get(book.id);
  assert.strictEqual(bookAfterReturn.available_copies, initialAvailable, 'Available copies should restore after return');
});

// 4. Fine Calculation Tests
it('Fine calculation computes correct late fees according to policy', () => {
  const finePerDay = parseFloat(getSetting('fine_rate_per_day', '2.00'));
  
  // 5 days overdue
  const dueDate5DaysAgo = new Date();
  dueDate5DaysAgo.setDate(dueDate5DaysAgo.getDate() - 5);
  const calculated5Days = calculateFine(dueDate5DaysAgo.toISOString().split('T')[0]);
  assert.strictEqual(calculated5Days, 5 * finePerDay, '5 days overdue should equal 5 * fine_rate_per_day');

  // 0 days overdue (on time)
  const dueDateToday = new Date().toISOString().split('T')[0];
  const calculatedOnTime = calculateFine(dueDateToday);
  assert.strictEqual(calculatedOnTime, 0, 'On-time return should have 0 fine');

  // Future due date
  const dueDateFuture = new Date();
  dueDateFuture.setDate(dueDateFuture.getDate() + 5);
  const calculatedFuture = calculateFine(dueDateFuture.toISOString().split('T')[0]);
  assert.strictEqual(calculatedFuture, 0, 'Future due date should have 0 fine');
});

// 5. Event and Guest Pass Lifecycle & Expiry Tests
it('Guest pass generates valid barcode/QR and checks expiration', () => {
  // Create test event
  const now = new Date();
  const startTime = new Date(now.getTime() - 3600000).toISOString(); // 1 hr ago
  const endTimeFuture = new Date(now.getTime() + 7200000).toISOString(); // 2 hrs later
  const endTimePast = new Date(now.getTime() - 1800000).toISOString(); // 30 mins ago

  const uid = Date.now();
  const eventCode = `EVT-TEST-${uid}`;
  const passCode = `GST-TEST-${uid}`;
  const expPassCode = `GST-EXP-${uid}`;

  const eventRes = db.prepare(`
    INSERT INTO events (event_code, title, organizer_name, department, start_time, end_time, status)
    VALUES (?, 'Annual Science Symposium', 'Dr. Smith', 'Physics', ?, ?, 'active')
  `).run(eventCode, startTime, endTimeFuture);

  const eventId = eventRes.lastInsertRowid;

  // Issue valid guest pass
  const passRes = db.prepare(`
    INSERT INTO guest_passes (pass_code, event_id, guest_name, institution, valid_from, valid_until, status)
    VALUES (?, ?, 'Prof. Turing', 'Cambridge', ?, ?, 'active')
  `).run(passCode, eventId, startTime, endTimeFuture);

  assert.ok(passRes.lastInsertRowid > 0, 'Guest pass created successfully');

  // Generate barcodes
  const barcodeSvg = generateCode128SVG(passCode);
  const qrSvg = generateQRSVG(`GUEST:${passCode}`);
  assert.ok(barcodeSvg.includes('<svg'), 'Barcode SVG generated');
  assert.ok(qrSvg.includes('<svg'), 'QR SVG generated');

  // Test pass validity
  const pass = db.prepare('SELECT * FROM guest_passes WHERE pass_code = ?').get(passCode);
  const isExpiredFuture = new Date() > new Date(pass.valid_until);
  assert.strictEqual(isExpiredFuture, false, 'Pass with future end time must not be expired');

  // Test expired pass condition
  const expiredPassRes = db.prepare(`
    INSERT INTO guest_passes (pass_code, event_id, guest_name, institution, valid_from, valid_until, status)
    VALUES (?, ?, 'Expired Guest', 'MIT', ?, ?, 'active')
  `).run(expPassCode, eventId, startTime, endTimePast);

  const expPass = db.prepare('SELECT * FROM guest_passes WHERE id = ?').get(expiredPassRes.lastInsertRowid);
  const isExpiredPast = new Date() > new Date(expPass.valid_until);
  assert.strictEqual(isExpiredPast, true, 'Pass with past end time must evaluate as expired');
});

// 6. CSV Importer/Exporter Tests
it('CSV parser handles delimiters, quotes, and newlines accurately', () => {
  const csvData = 'title,author,category,total_copies\n"Clean Code","Robert C. Martin","Computer Science",5\n"Structure and Interpretation of Computer Programs","Harold Abelson","Computer Science",3';
  const parsed = parseCSV(csvData);
  assert.strictEqual(parsed.length, 2);
  assert.strictEqual(parsed[0].title, 'Clean Code');
  assert.strictEqual(parsed[1].total_copies, '3');

  const csvOut = stringifyCSV(parsed);
  assert.ok(csvOut.includes('Clean Code'));
});

// 7. Hot SQLite Backup System
it('Hot backup creates valid restorable SQLite archive', () => {
  const backup = createBackup();
  assert.ok(backup, 'Backup object returned');
  assert.ok(backup.filename.endsWith('.db'), 'Backup file has .db extension');
  assert.ok(backup.size > 0, 'Backup size is greater than 0');

  const list = listBackups();
  assert.ok(list.length > 0, 'Backup appears in backups list');
});

console.log('\n=========================================================');
console.log(`📊 TEST RESULTS: ${passed} Passed, ${failed} Failed`);
console.log('=========================================================\n');

if (failed > 0) {
  process.exit(1);
} else {
  console.log('✨ ALL CRITICAL BACKEND TESTS PASSED!\n');
}
