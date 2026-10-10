const express = require('express');
const router = express.Router();
const { db } = require('../database/db');
const { authenticate, requireRole } = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');

// POST /api/reservations (Place a hold on a book)
router.post('/', authenticate, (req, res) => {
  const { bookId } = req.body;
  const memberId = req.user.id;

  if (!bookId) {
    return res.status(400).json({ success: false, message: 'Book ID is required.' });
  }

  const book = db.prepare('SELECT id, title, accession_no, available_copies FROM books WHERE id = ?').get(bookId);
  if (!book) {
    return res.status(404).json({ success: false, message: 'Book not found.' });
  }

  // Check if member already has this book currently issued
  const alreadyIssued = db.prepare(`
    SELECT id FROM transactions
    WHERE book_id = ? AND member_id = ? AND status IN ('issued', 'overdue')
  `).get(bookId, memberId);

  if (alreadyIssued) {
    return res.status(400).json({ success: false, message: 'You already have an active loan for this book.' });
  }

  // Check if member already has an active reservation for this book
  const existingRes = db.prepare(`
    SELECT id FROM reservations
    WHERE book_id = ? AND member_id = ? AND status IN ('waiting', 'ready')
  `).get(bookId, memberId);

  if (existingRes) {
    return res.status(400).json({ success: false, message: 'You already have an active reservation for this book.' });
  }

  // Check max active reservations per member (limit to 3)
  const activeResCount = db.prepare(`
    SELECT COUNT(*) as count FROM reservations
    WHERE member_id = ? AND status IN ('waiting', 'ready')
  `).get(memberId).count;

  if (activeResCount >= 3) {
    return res.status(400).json({ success: false, message: 'You have reached the maximum active reservation limit (3 books).' });
  }

  const resStatus = book.available_copies > 0 ? 'ready' : 'waiting';
  const now = new Date();
  const expiryDate = new Date(now.getTime() + 7 * 86400000).toISOString().replace('T', ' ').substring(0, 19);

  const result = db.prepare(`
    INSERT INTO reservations (book_id, member_id, reservation_date, expiry_date, status)
    VALUES (?, ?, CURRENT_TIMESTAMP, ?, ?)
  `).run(bookId, memberId, expiryDate, resStatus);

  // Queue position
  const queuePos = db.prepare(`
    SELECT COUNT(*) as pos FROM reservations
    WHERE book_id = ? AND status = 'waiting'
  `).get(bookId).pos;

  logAudit(req, 'RESERVE_BOOK', 'reservation', result.lastInsertRowid, `Reserved "${book.title}" (Queue position: ${queuePos})`);

  return res.json({
    success: true,
    message: resStatus === 'ready'
      ? `"${book.title}" is available! Please collect it from the library within 7 days.`
      : `Reserved "${book.title}". You are #${queuePos} in the waiting queue.`,
    reservationId: result.lastInsertRowid,
    status: resStatus,
    queue_position: queuePos
  });
});

// GET /api/reservations (Librarian/Admin view)
router.get('/', authenticate, requireRole('librarian', 'admin'), (req, res) => {
  const { status = '' } = req.query;

  let query = `
    SELECT r.*, b.title as book_title, b.author as book_author, b.accession_no, b.available_copies, b.shelf_location,
           u.name as member_name, u.member_id as member_code, u.role as member_role, u.department as member_dept, u.phone as member_phone
    FROM reservations r
    JOIN books b ON b.id = r.book_id
    JOIN users u ON u.id = r.member_id
  `;

  let params = [];
  if (status) {
    query += ' WHERE r.status = ?';
    params.push(status);
  }

  query += ' ORDER BY r.status = "ready" DESC, r.reservation_date ASC';

  const reservations = db.prepare(query).all(...params);
  return res.json({ success: true, reservations });
});

// GET /api/reservations/my (Student view)
router.get('/my', authenticate, (req, res) => {
  const reservations = db.prepare(`
    SELECT r.*, b.title as book_title, b.author as book_author, b.accession_no, b.shelf_location, b.cover_color,
           (SELECT COUNT(*) FROM reservations r2 WHERE r2.book_id = r.book_id AND r2.status = 'waiting' AND r2.reservation_date <= r.reservation_date) as queue_position
    FROM reservations r
    JOIN books b ON b.id = r.book_id
    WHERE r.member_id = ? AND r.status IN ('waiting', 'ready')
    ORDER BY r.reservation_date ASC
  `).all(req.user.id);

  return res.json({ success: true, reservations });
});

// DELETE /api/reservations/:id (Cancel reservation)
router.delete('/:id', authenticate, (req, res) => {
  const resId = req.params.id;
  const isLibrarian = ['librarian', 'admin'].includes(req.user.role);

  const reservation = db.prepare('SELECT * FROM reservations WHERE id = ?').get(resId);
  if (!reservation) {
    return res.status(404).json({ success: false, message: 'Reservation not found.' });
  }

  if (!isLibrarian && reservation.member_id !== req.user.id) {
    return res.status(403).json({ success: false, message: 'Access denied.' });
  }

  db.prepare("UPDATE reservations SET status = 'cancelled' WHERE id = ?").run(resId);
  logAudit(req, 'CANCEL_RESERVATION', 'reservation', resId, `Cancelled reservation #${resId}`);

  return res.json({ success: true, message: 'Reservation cancelled successfully.' });
});

module.exports = router;
