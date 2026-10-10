const express = require('express');
const router = express.Router();
const multer = require('multer');
const bcrypt = require('bcryptjs');
const { db } = require('../database/db');
const { authenticate, requireRole } = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');
const { parseCSV, stringifyCSV } = require('../utils/csvParser');
const { generateCode128SVG, generateQRSVG } = require('../utils/barcode');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// GET /api/members (List & search members with pagination)
router.get('/', authenticate, requireRole('librarian', 'admin'), (req, res) => {
  const {
    q = '',
    role = '',
    department = '',
    status = '',
    page = 1,
    limit = 20
  } = req.query;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const pageLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const offset = (pageNum - 1) * pageLimit;

  let whereClauses = [];
  let params = [];

  const queryTerm = q.trim();
  if (queryTerm) {
    whereClauses.push('(member_id LIKE ? OR name LIKE ? OR email LIKE ? OR phone LIKE ?)');
    const like = `%${queryTerm}%`;
    params.push(like, like, like, like);
  }

  if (role) {
    whereClauses.push('role = ?');
    params.push(role);
  }

  if (department) {
    whereClauses.push('department = ?');
    params.push(department);
  }

  if (status) {
    whereClauses.push('status = ?');
    params.push(status);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const countRow = db.prepare(`SELECT COUNT(*) as total FROM users ${whereSql}`).get(...params);
  const total = countRow ? countRow.total : 0;

  const selectSql = `
    SELECT id, member_id, name, email, phone, role, department, semester,
           validity_date, status, reading_streak, books_read_count, created_at,
           (SELECT COUNT(*) FROM transactions t WHERE t.member_id = users.id AND t.status IN ('issued', 'overdue')) as active_loans,
           (SELECT COALESCE(SUM(amount - paid_amount), 0) FROM fines f WHERE f.member_id = users.id AND f.status = 'unpaid') as unpaid_fines
    FROM users
    ${whereSql}
    ORDER BY id DESC
    LIMIT ? OFFSET ?
  `;

  const members = db.prepare(selectSql).all(...params, pageLimit, offset);

  return res.json({
    success: true,
    members,
    pagination: {
      total,
      page: pageNum,
      limit: pageLimit,
      totalPages: Math.ceil(total / pageLimit)
    }
  });
});

// GET /api/members/lookup/:identifier (Fast scan lookup for circulation)
router.get('/lookup/:identifier', authenticate, requireRole('librarian', 'admin'), (req, res) => {
  const ident = req.params.identifier.trim();

  const user = db.prepare(`
    SELECT id, member_id, name, email, phone, role, department, semester,
           validity_date, status, reading_streak, books_read_count
    FROM users
    WHERE member_id = ? OR phone = ? OR email = ?
    COLLATE NOCASE
  `).get(ident, ident, ident);

  if (!user) {
    return res.status(404).json({ success: false, message: `Member "${ident}" not found.` });
  }

  // Active loans
  const activeLoans = db.prepare(`
    SELECT t.id as transaction_id, t.copy_barcode, t.issue_date, t.due_date, t.renewal_count, t.status,
           b.id as book_id, b.title, b.author, b.accession_no, b.shelf_location, b.cover_color
    FROM transactions t
    JOIN books b ON b.id = t.book_id
    WHERE t.member_id = ? AND t.status IN ('issued', 'overdue')
    ORDER BY t.due_date ASC
  `).all(user.id);

  // Unpaid fines
  const unpaidFines = db.prepare(`
    SELECT f.*, b.title as book_title
    FROM fines f
    JOIN transactions t ON t.id = f.transaction_id
    JOIN books b ON b.id = t.book_id
    WHERE f.member_id = ? AND f.status = 'unpaid'
  `).all(user.id);

  const totalUnpaidFine = unpaidFines.reduce((sum, f) => sum + (f.amount - f.paid_amount), 0);

  // Check validity expiry
  const isExpired = new Date(user.validity_date) < new Date();

  return res.json({
    success: true,
    member: {
      ...user,
      is_expired: isExpired,
      active_loans: activeLoans,
      active_loans_count: activeLoans.length,
      unpaid_fines: unpaidFines,
      unpaid_fines_total: totalUnpaidFine
    }
  });
});

// GET /api/members/:id (Details & stats)
router.get('/:id', authenticate, requireRole('librarian', 'admin'), (req, res) => {
  const memberId = req.params.id;
  const user = db.prepare(`
    SELECT id, member_id, name, email, phone, role, department, semester,
           validity_date, status, reading_streak, books_read_count, created_at
    FROM users WHERE id = ?
  `).get(memberId);

  if (!user) {
    return res.status(404).json({ success: false, message: 'Member not found.' });
  }

  const loans = db.prepare(`
    SELECT t.*, b.title as book_title, b.author as book_author, b.accession_no
    FROM transactions t
    JOIN books b ON b.id = t.book_id
    WHERE t.member_id = ?
    ORDER BY t.id DESC
    LIMIT 50
  `).all(memberId);

  const fines = db.prepare(`
    SELECT f.*, b.title as book_title
    FROM fines f
    JOIN transactions t ON t.id = f.transaction_id
    JOIN books b ON b.id = t.book_id
    WHERE f.member_id = ?
    ORDER BY f.id DESC
  `).all(memberId);

  const badges = db.prepare(`
    SELECT badge_key, awarded_at FROM member_badges
    WHERE member_id = ? ORDER BY awarded_at DESC
  `).all(memberId);

  return res.json({
    success: true,
    member: {
      ...user,
      loans,
      fines,
      badges
    }
  });
});

// POST /api/members (Add new member)
router.post('/', authenticate, requireRole('librarian', 'admin'), (req, res) => {
  const {
    member_id, name, email, phone = '', role = 'student',
    department, semester = '', validity_date, password = 'password123'
  } = req.body;

  if (!member_id || !name || !department || !validity_date) {
    return res.status(400).json({ success: false, message: 'Member ID, Name, Department, and Validity Date are required.' });
  }

  const memCode = member_id.trim().toUpperCase();

  const existing = db.prepare('SELECT id FROM users WHERE member_id = ? OR (email = ? AND email != "")').get(memCode, email ? email.trim() : '');
  if (existing) {
    return res.status(400).json({ success: false, message: 'Member ID or Email is already registered.' });
  }

  const passHash = bcrypt.hashSync(password || 'password123', 10);

  const result = db.prepare(`
    INSERT INTO users (
      member_id, name, email, phone, role, department, semester,
      password_hash, force_password_change, validity_date, status, reading_streak, books_read_count
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 'active', 0, 0)
  `).run(
    memCode, name.trim(), email ? email.trim() : null, phone.trim(),
    role, department.trim(), semester.trim(), passHash, validity_date
  );

  logAudit(req, 'ADD_MEMBER', 'member', result.lastInsertRowid, `Added new ${role} ${name} (${memCode})`);

  return res.json({ success: true, message: 'Member added successfully!', memberId: result.lastInsertRowid });
});

// PUT /api/members/:id (Update member)
router.put('/:id', authenticate, requireRole('librarian', 'admin'), (req, res) => {
  const userId = req.params.id;
  const { name, email, phone, role, department, semester, validity_date, status, password } = req.body;

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!user) {
    return res.status(404).json({ success: false, message: 'Member not found.' });
  }

  let passHash = user.password_hash;
  if (password && password.trim().length >= 6) {
    passHash = bcrypt.hashSync(password.trim(), 10);
  }

  db.prepare(`
    UPDATE users
    SET name = COALESCE(?, name),
        email = COALESCE(?, email),
        phone = COALESCE(?, phone),
        role = COALESCE(?, role),
        department = COALESCE(?, department),
        semester = COALESCE(?, semester),
        validity_date = COALESCE(?, validity_date),
        status = COALESCE(?, status),
        password_hash = ?,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    name ? name.trim() : null,
    email ? email.trim() : null,
    phone !== undefined ? phone.trim() : null,
    role,
    department ? department.trim() : null,
    semester !== undefined ? semester.trim() : null,
    validity_date,
    status,
    passHash,
    userId
  );

  logAudit(req, 'UPDATE_MEMBER', 'member', userId, `Updated member profile for ${name || user.name}`);

  return res.json({ success: true, message: 'Member profile updated successfully.' });
});

// PATCH /api/members/:id/status (Toggle active/deactivated)
router.patch('/:id/status', authenticate, requireRole('librarian', 'admin'), (req, res) => {
  const userId = req.params.id;
  const { status } = req.body;

  if (!['active', 'deactivated'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status value.' });
  }

  db.prepare('UPDATE users SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, userId);
  logAudit(req, 'CHANGE_MEMBER_STATUS', 'member', userId, `Status changed to ${status}`);

  return res.json({ success: true, message: `Member account is now ${status}.` });
});

// GET /api/members/:id/id-card (Printable ID Card data with Barcode & QR code)
router.get('/:id/id-card', authenticate, (req, res) => {
  const memberId = req.params.id;
  const isLibrarian = ['librarian', 'admin'].includes(req.user.role);

  // Non-librarians can only generate their own ID card
  if (!isLibrarian && String(req.user.id) !== String(memberId)) {
    return res.status(403).json({ success: false, message: 'Access denied.' });
  }

  const user = db.prepare('SELECT id, member_id, name, email, phone, role, department, semester, validity_date, status FROM users WHERE id = ?').get(memberId);
  if (!user) {
    return res.status(404).json({ success: false, message: 'Member not found.' });
  }

  const barcodeSvg = generateCode128SVG(user.member_id, { height: 45, showText: true });
  const qrSvg = generateQRSVG(`LIBRARY_MEMBER:${user.member_id}:${user.name}`, 100);

  return res.json({
    success: true,
    card: {
      ...user,
      barcode_svg: barcodeSvg,
      qr_svg: qrSvg
    }
  });
});

// POST /api/members/bulk-import (CSV upload)
router.post('/bulk-import', authenticate, requireRole('librarian', 'admin'), upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'Please upload a CSV file.' });
  }

  const csvText = req.file.buffer.toString('utf8');
  const rows = parseCSV(csvText);

  if (!rows || rows.length === 0) {
    return res.status(400).json({ success: false, message: 'CSV file is empty or invalid.' });
  }

  let imported = 0;
  let skipped = 0;

  const insertStmt = db.prepare(`
    INSERT INTO users (
      member_id, name, email, phone, role, department, semester,
      password_hash, force_password_change, validity_date, status, reading_streak, books_read_count
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 'active', 0, 0)
  `);

  const checkStmt = db.prepare('SELECT id FROM users WHERE member_id = ? OR (email = ? AND email != "")');
  const defaultPass = bcrypt.hashSync('password123', 10);

  const importTx = db.transaction(() => {
    for (const r of rows) {
      const member_id = r.member_id || r.enrollment_no || r.employee_id || r.id;
      const name = r.name || r.full_name;
      const dept = r.department || r.dept || 'General';
      const role = (r.role || 'student').toLowerCase();
      const email = r.email || null;
      const phone = r.phone || r.mobile || '';
      const semester = r.semester || r.year || '';
      const validity = r.validity_date || r.valid_until || '2026-12-31';

      if (!member_id || !name) {
        skipped++;
        continue;
      }

      const memCode = member_id.trim().toUpperCase();
      if (checkStmt.get(memCode, email)) {
        skipped++;
        continue;
      }

      insertStmt.run(memCode, name.trim(), email, phone, role, dept, semester, defaultPass, validity);
      imported++;
    }
  });

  importTx();
  logAudit(req, 'BULK_IMPORT_MEMBERS', 'member', 'bulk', `Imported ${imported} members (${skipped} skipped)`);

  return res.json({
    success: true,
    message: `Successfully imported ${imported} members (${skipped} skipped).`,
    imported,
    skipped
  });
});

module.exports = router;
