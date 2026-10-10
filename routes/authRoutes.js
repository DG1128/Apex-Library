const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { db } = require('../database/db');
const { generateToken, authenticate } = require('../middleware/auth');
const { rateLimitLogin } = require('../middleware/rateLimiter');
const { logAudit } = require('../middleware/audit');

// POST /api/auth/login
router.post('/login', rateLimitLogin, (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Username (Member ID / Email) and password are required.' });
  }

  const query = `
    SELECT id, member_id, name, email, phone, role, department, semester,
           password_hash, force_password_change, validity_date, status,
           reading_streak, books_read_count
    FROM users
    WHERE member_id = ? OR email = ?
    COLLATE NOCASE
  `;
  const user = db.prepare(query).get(username.trim(), username.trim());

  if (!user) {
    return res.status(401).json({ success: false, message: 'Invalid credentials. User not found.' });
  }

  if (user.status === 'deactivated') {
    return res.status(403).json({ success: false, message: 'This account has been deactivated. Please contact the librarian.' });
  }

  const isValidPassword = bcrypt.compareSync(password, user.password_hash);
  if (!isValidPassword) {
    return res.status(401).json({ success: false, message: 'Invalid credentials. Incorrect password.' });
  }

  // Generate JWT token
  const token = generateToken(user);

  logAudit({ user, ip: req.ip }, 'LOGIN', 'user', user.id, `User ${user.member_id} logged in successfully`);

  return res.json({
    success: true,
    token,
    user: {
      id: user.id,
      member_id: user.member_id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      department: user.department,
      semester: user.semester,
      force_password_change: Boolean(user.force_password_change),
      validity_date: user.validity_date,
      reading_streak: user.reading_streak,
      books_read_count: user.books_read_count
    }
  });
});

// POST /api/auth/change-password
router.post('/change-password', authenticate, (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ success: false, message: 'New password must be at least 6 characters long.' });
  }

  const userRow = db.prepare('SELECT password_hash, force_password_change FROM users WHERE id = ?').get(req.user.id);
  
  // If force_password_change is true, we can allow setting new password directly or with current password
  if (!userRow.force_password_change) {
    if (!currentPassword) {
      return res.status(400).json({ success: false, message: 'Current password is required.' });
    }
    const isCurrentValid = bcrypt.compareSync(currentPassword, userRow.password_hash);
    if (!isCurrentValid) {
      return res.status(400).json({ success: false, message: 'Current password does not match.' });
    }
  }

  const newHash = bcrypt.hashSync(newPassword, 10);
  db.prepare(`
    UPDATE users
    SET password_hash = ?, force_password_change = 0, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(newHash, req.user.id);

  logAudit(req, 'CHANGE_PASSWORD', 'user', req.user.id, 'User updated account password');

  return res.json({ success: true, message: 'Password updated successfully!' });
});

// GET /api/auth/me
router.get('/me', authenticate, (req, res) => {
  const user = req.user;

  // Active loans count & fines owed
  const activeLoans = db.prepare(`
    SELECT COUNT(*) as count FROM transactions
    WHERE member_id = ? AND status IN ('issued', 'overdue')
  `).get(user.id);

  const unpaidFines = db.prepare(`
    SELECT COALESCE(SUM(amount - paid_amount), 0) as total_unpaid
    FROM fines WHERE member_id = ? AND status = 'unpaid'
  `).get(user.id);

  const badges = db.prepare(`
    SELECT badge_key, awarded_at FROM member_badges
    WHERE member_id = ? ORDER BY awarded_at DESC
  `).all(user.id);

  return res.json({
    success: true,
    user: {
      ...user,
      force_password_change: Boolean(user.force_password_change),
      active_loans_count: activeLoans.count,
      unpaid_fines_total: unpaidFines.total_unpaid,
      badges
    }
  });
});

module.exports = router;
