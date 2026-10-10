const express = require('express');
const router = express.Router();
const { db, getSetting } = require('../database/db');
const { authenticate, requireRole } = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');

// Helper to calculate difference in days
function getDaysDiff(date1, date2) {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffTime = d1 - d2;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// POST /api/circulation/lookup-scan (Scan-first unified detector for barcode/ID)
router.post('/lookup-scan', authenticate, requireRole('librarian', 'admin'), (req, res) => {
  const code = (req.body.code || '').trim();
  if (!code) {
    return res.status(400).json({ success: false, message: 'Scan code cannot be empty.' });
  }

  // 1. Check if it matches a member
  const member = db.prepare(`
    SELECT id, member_id, name, email, phone, role, department, semester, validity_date, status
    FROM users
    WHERE member_id = ? OR phone = ? OR email = ?
    COLLATE NOCASE
  `).get(code, code, code);

  if (member) {
    const activeLoans = db.prepare(`
      SELECT t.id as transaction_id, t.copy_barcode, t.issue_date, t.due_date, t.renewal_count, t.status,
             b.id as book_id, b.title, b.author, b.accession_no, b.shelf_location, b.cover_color
      FROM transactions t
      JOIN books b ON b.id = t.book_id
      WHERE t.member_id = ? AND t.status IN ('issued', 'overdue')
      ORDER BY t.due_date ASC
    `).all(member.id);

    const unpaidFines = db.prepare(`
      SELECT f.*, b.title as book_title
      FROM fines f
      JOIN transactions t ON t.id = f.transaction_id
      JOIN books b ON b.id = t.book_id
      WHERE f.member_id = ? AND f.status = 'unpaid'
    `).all(member.id);

    const totalUnpaidFine = unpaidFines.reduce((sum, f) => sum + (f.amount - f.paid_amount), 0);
    const isExpired = new Date(member.validity_date) < new Date();
    const hasOverdue = activeLoans.some(l => new Date(l.due_date) < new Date());

    return res.json({
      success: true,
      scanType: 'member',
      data: {
        ...member,
        is_expired: isExpired,
        has_overdue: hasOverdue,
        active_loans: activeLoans,
        active_loans_count: activeLoans.length,
        unpaid_fines: unpaidFines,
        unpaid_fines_total: totalUnpaidFine
      }
    });
  }

  // 2. Check if it matches a specific book copy barcode
  const copy = db.prepare(`
    SELECT c.*, b.id as book_id, b.accession_no, b.title, b.author, b.shelf_location,
           b.available_copies, b.total_copies, b.cover_color, b.status as book_status
    FROM book_copies c
    JOIN books b ON b.id = c.book_id
    WHERE c.barcode = ?
    COLLATE NOCASE
  `).get(code);

  if (copy) {
    // If copy is issued, find who currently has it
    let currentLoan = null;
    if (copy.status === 'issued') {
      currentLoan = db.prepare(`
        SELECT t.id as transaction_id, t.issue_date, t.due_date, t.renewal_count,
               u.id as member_id, u.name as member_name, u.member_id as member_code, u.role as member_role
        FROM transactions t
        JOIN users u ON u.id = t.member_id
        WHERE (t.copy_id = ? OR t.copy_barcode = ?) AND t.status IN ('issued', 'overdue')
        ORDER BY t.id DESC LIMIT 1
      `).get(copy.id, copy.barcode);
    }

    return res.json({
      success: true,
      scanType: 'copy',
      data: {
        copy,
        currentLoan
      }
    });
  }

  // 3. Check if it matches a book accession number or ISBN
  const book = db.prepare(`
    SELECT b.*
    FROM books b
    WHERE b.accession_no = ? OR b.isbn = ?
    COLLATE NOCASE
  `).get(code, code);

  if (book) {
    const copies = db.prepare('SELECT * FROM book_copies WHERE book_id = ?').all(book.id);
    const availableCopy = copies.find(c => c.status === 'available');

    return res.json({
      success: true,
      scanType: 'book',
      data: {
        book,
        copies,
        suggestedCopyBarcode: availableCopy ? availableCopy.barcode : (copies[0] ? copies[0].barcode : null)
      }
    });
  }

  return res.status(404).json({ success: false, message: `No member or book found matching code "${code}".` });
});

// POST /api/circulation/issue (Issue a book to a member)
router.post('/issue', authenticate, requireRole('librarian', 'admin'), (req, res) => {
  const { memberId, copyBarcode, accessionNo, customDueDays } = req.body;

  if (!memberId || (!copyBarcode && !accessionNo)) {
    return res.status(400).json({ success: false, message: 'Member ID and Book Barcode/Accession Number are required.' });
  }

  // Find member
  const member = db.prepare(`
    SELECT * FROM users WHERE id = ? OR member_id = ? COLLATE NOCASE
  `).get(memberId, String(memberId));

  if (!member) {
    return res.status(404).json({ success: false, message: 'Member not found.' });
  }

  if (member.status === 'deactivated') {
    return res.status(400).json({ success: false, message: 'Member account is deactivated.' });
  }

  // 1. Check validity
  if (new Date(member.validity_date) < new Date()) {
    return res.status(400).json({ success: false, message: `Member card expired on ${member.validity_date}. Please renew membership.` });
  }

  // 2. Check unpaid fines
  const unpaidFineRow = db.prepare(`
    SELECT COALESCE(SUM(amount - paid_amount), 0) as total FROM fines
    WHERE member_id = ? AND status = 'unpaid'
  `).get(member.id);

  if (unpaidFineRow.total > 0) {
    return res.status(400).json({
      success: false,
      message: `Member has unpaid fines of ₹${unpaidFineRow.total.toFixed(2)}. Please clear fines before borrowing.`
    });
  }

  // 3. Check overdue books
  const overdueCount = db.prepare(`
    SELECT COUNT(*) as count FROM transactions
    WHERE member_id = ? AND status IN ('issued', 'overdue') AND datetime(due_date) < datetime('now')
  `).get(member.id).count;

  if (overdueCount > 0) {
    return res.status(400).json({
      success: false,
      message: `Member currently has ${overdueCount} overdue book(s). Return overdue books first.`
    });
  }

  // 4. Check max borrowing limits
  const isFaculty = member.role === 'faculty';
  const maxBooks = parseInt(getSetting(isFaculty ? 'faculty_max_books' : 'student_max_books', isFaculty ? 8 : 3), 10);
  const currentLoansCount = db.prepare(`
    SELECT COUNT(*) as count FROM transactions
    WHERE member_id = ? AND status IN ('issued', 'overdue')
  `).get(member.id).count;

  if (currentLoansCount >= maxBooks) {
    return res.status(400).json({
      success: false,
      message: `Borrowing limit reached. ${member.role} limit is ${maxBooks} books (currently holding ${currentLoansCount}).`
    });
  }

  // Find book copy
  let copy = null;
  if (copyBarcode) {
    copy = db.prepare(`
      SELECT c.*, b.id as book_id, b.title, b.accession_no, b.available_copies, b.total_copies
      FROM book_copies c
      JOIN books b ON b.id = c.book_id
      WHERE c.barcode = ? COLLATE NOCASE
    `).get(copyBarcode.trim());
  } else if (accessionNo) {
    const book = db.prepare('SELECT * FROM books WHERE accession_no = ? COLLATE NOCASE').get(accessionNo.trim());
    if (book) {
      copy = db.prepare(`
        SELECT c.*, b.id as book_id, b.title, b.accession_no, b.available_copies, b.total_copies
        FROM book_copies c
        JOIN books b ON b.id = c.book_id
        WHERE c.book_id = ? AND c.status = 'available'
        LIMIT 1
      `).get(book.id);
    }
  }

  if (!copy) {
    return res.status(404).json({ success: false, message: 'Available book copy not found for this code.' });
  }

  if (copy.status !== 'available') {
    return res.status(400).json({ success: false, message: `Copy ${copy.barcode} is currently ${copy.status}.` });
  }

  // Check if someone else has an active ready reservation on this book
  const topReservation = db.prepare(`
    SELECT * FROM reservations
    WHERE book_id = ? AND status IN ('ready', 'waiting')
    ORDER BY reservation_date ASC LIMIT 1
  `).get(copy.book_id);

  if (topReservation && topReservation.member_id !== member.id && copy.available_copies <= 1) {
    const resHolder = db.prepare('SELECT name, member_id FROM users WHERE id = ?').get(topReservation.member_id);
    return res.status(400).json({
      success: false,
      message: `This book is held on reserve for ${resHolder.name} (${resHolder.member_id}).`
    });
  }

  // Calculate due date
  const loanDays = parseInt(customDueDays || getSetting(isFaculty ? 'faculty_loan_days' : 'student_loan_days', isFaculty ? 30 : 14), 10);
  const now = new Date();
  const dueDate = new Date(now.getTime() + loanDays * 86400000).toISOString().replace('T', ' ').substring(0, 19);

  const issueTx = db.transaction(() => {
    // 1. Insert transaction
    const resTrans = db.prepare(`
      INSERT INTO transactions (
        book_id, copy_id, copy_barcode, member_id,
        issue_date, due_date, renewal_count, status, issued_by
      ) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, ?, 0, 'issued', ?)
    `).run(copy.book_id, copy.id, copy.barcode, member.id, dueDate, req.user.id);

    // 2. Update copy status
    db.prepare("UPDATE book_copies SET status = 'issued' WHERE id = ?").run(copy.id);

    // 3. Update book available copies & issues count
    db.prepare(`
      UPDATE books
      SET available_copies = MAX(0, available_copies - 1),
          total_issues_count = total_issues_count + 1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(copy.book_id);

    // 4. Fulfill reservation if current member was reserving
    if (topReservation && topReservation.member_id === member.id) {
      db.prepare("UPDATE reservations SET status = 'fulfilled' WHERE id = ?").run(topReservation.id);
    }

    return resTrans.lastInsertRowid;
  });

  const transactionId = issueTx();
  logAudit(req, 'ISSUE_BOOK', 'transaction', transactionId, `Issued "${copy.title}" (${copy.barcode}) to ${member.name} (${member.member_id})`);

  return res.json({
    success: true,
    message: `"${copy.title}" successfully issued to ${member.name}. Due on ${dueDate.substring(0, 10)}.`,
    transactionId,
    due_date: dueDate,
    member_name: member.name,
    book_title: copy.title,
    copy_barcode: copy.barcode
  });
});

// POST /api/circulation/return (Return a book copy)
router.post('/return', authenticate, requireRole('librarian', 'admin'), (req, res) => {
  const { copyBarcode, transactionId } = req.body;

  if (!copyBarcode && !transactionId) {
    return res.status(400).json({ success: false, message: 'Copy barcode or transaction ID is required.' });
  }

  let trans = null;
  if (transactionId) {
    trans = db.prepare(`
      SELECT t.*, b.title as book_title, b.id as book_id, u.id as member_id, u.name as member_name, u.member_id as member_code, u.reading_streak, u.books_read_count
      FROM transactions t
      JOIN books b ON b.id = t.book_id
      JOIN users u ON u.id = t.member_id
      WHERE t.id = ? AND t.status IN ('issued', 'overdue')
    `).get(transactionId);
  } else if (copyBarcode) {
    trans = db.prepare(`
      SELECT t.*, b.title as book_title, b.id as book_id, u.id as member_id, u.name as member_name, u.member_id as member_code, u.reading_streak, u.books_read_count
      FROM transactions t
      JOIN books b ON b.id = t.book_id
      JOIN users u ON u.id = t.member_id
      WHERE (t.copy_barcode = ? OR t.copy_id IN (SELECT id FROM book_copies WHERE barcode = ?))
        AND t.status IN ('issued', 'overdue')
      ORDER BY t.id DESC LIMIT 1
    `).get(copyBarcode.trim(), copyBarcode.trim());
  }

  if (!trans) {
    return res.status(404).json({ success: false, message: 'Active loan record not found for this book/copy.' });
  }

  const now = new Date();
  const returnDateStr = now.toISOString().replace('T', ' ').substring(0, 19);
  const dueDate = new Date(trans.due_date);
  const isOverdue = now > dueDate;
  let overdueDays = 0;
  let fineAmount = 0.0;
  let fineRecordId = null;

  if (isOverdue) {
    overdueDays = Math.max(1, Math.ceil((now - dueDate) / (1000 * 60 * 60 * 24)));
    const fineRate = parseFloat(getSetting('fine_per_day', 2.0));
    fineAmount = overdueDays * fineRate;
  }

  let nextReservationHolder = null;
  let newBadges = [];

  const returnTx = db.transaction(() => {
    // 1. Update transaction
    db.prepare(`
      UPDATE transactions
      SET status = 'returned',
          return_date = ?,
          returned_by = ?,
          fine_amount = ?
      WHERE id = ?
    `).run(returnDateStr, req.user.id, fineAmount, trans.id);

    // 2. Create fine record if overdue
    if (fineAmount > 0) {
      const fineRes = db.prepare(`
        INSERT INTO fines (transaction_id, member_id, amount, reason, days_overdue, status, paid_amount)
        VALUES (?, ?, ?, ?, ?, 'unpaid', 0)
      `).run(trans.id, trans.member_id, fineAmount, `Late Return (${overdueDays} days overdue)`, overdueDays);
      fineRecordId = fineRes.lastInsertRowid;
    }

    // 3. Update copy status
    if (trans.copy_barcode) {
      db.prepare("UPDATE book_copies SET status = 'available' WHERE barcode = ?").run(trans.copy_barcode);
    } else if (trans.copy_id) {
      db.prepare("UPDATE book_copies SET status = 'available' WHERE id = ?").run(trans.copy_id);
    }

    // 4. Update book available copies
    db.prepare(`
      UPDATE books
      SET available_copies = MIN(total_copies, available_copies + 1),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(trans.book_id);

    // 5. Check reservation queue
    const nextRes = db.prepare(`
      SELECT r.*, u.name, u.member_id as member_code, u.email
      FROM reservations r
      JOIN users u ON u.id = r.member_id
      WHERE r.book_id = ? AND r.status = 'waiting'
      ORDER BY r.reservation_date ASC
      LIMIT 1
    `).get(trans.book_id);

    if (nextRes) {
      const holdExpiry = new Date(now.getTime() + 3 * 86400000).toISOString().replace('T', ' ').substring(0, 19);
      db.prepare(`
        UPDATE reservations
        SET status = 'ready', expiry_date = ?, notified_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(holdExpiry, nextRes.id);
      nextReservationHolder = nextRes;
    }

    // 6. Gamification: Streak & Badges
    const newBooksRead = (trans.books_read_count || 0) + 1;
    let newStreak = (trans.reading_streak || 0);
    if (!isOverdue) {
      newStreak += 1;
    }

    db.prepare(`
      UPDATE users
      SET books_read_count = ?, reading_streak = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(newBooksRead, newStreak, trans.member_id);

    // Award badges
    const insertBadge = db.prepare('INSERT OR IGNORE INTO member_badges (member_id, badge_key) VALUES (?, ?)');
    if (newBooksRead >= 1) {
      insertBadge.run(trans.member_id, 'first_borrow');
    }
    if (newBooksRead >= 10) {
      insertBadge.run(trans.member_id, 'bookworm');
    }
    if (newStreak >= 5) {
      insertBadge.run(trans.member_id, 'streak_5');
    }
  });

  returnTx();
  logAudit(req, 'RETURN_BOOK', 'transaction', trans.id, `Returned "${trans.book_title}" from ${trans.member_name} (${trans.member_code}). Fine: ₹${fineAmount}`);

  return res.json({
    success: true,
    message: `"${trans.book_title}" returned successfully!`,
    fine_charged: fineAmount,
    overdue_days: overdueDays,
    fine_id: fineRecordId,
    member_name: trans.member_name,
    member_code: trans.member_code,
    confetti: true,
    next_reservation: nextReservationHolder ? {
      name: nextReservationHolder.name,
      member_id: nextReservationHolder.member_code,
      message: `Hold placed for waiting reservation: ${nextReservationHolder.name}`
    } : null
  });
});

// POST /api/circulation/renew (Renew a loan)
router.post('/renew', authenticate, (req, res) => {
  const { transactionId } = req.body;
  const isLibrarian = ['librarian', 'admin'].includes(req.user.role);

  if (!transactionId) {
    return res.status(400).json({ success: false, message: 'Transaction ID is required.' });
  }

  const trans = db.prepare(`
    SELECT t.*, b.title as book_title, b.id as book_id, u.role as member_role, u.name as member_name, u.validity_date
    FROM transactions t
    JOIN books b ON b.id = t.book_id
    JOIN users u ON u.id = t.member_id
    WHERE t.id = ? AND t.status IN ('issued', 'overdue')
  `).get(transactionId);

  if (!trans) {
    return res.status(404).json({ success: false, message: 'Active loan not found.' });
  }

  // Non-librarians can only renew their own books
  if (!isLibrarian && trans.member_id !== req.user.id) {
    return res.status(403).json({ success: false, message: 'You can only renew your own books.' });
  }

  // Check validity
  if (new Date(trans.validity_date) < new Date()) {
    return res.status(400).json({ success: false, message: 'Membership card is expired. Please renew membership at library.' });
  }

  // Check max renewals
  const isFaculty = trans.member_role === 'faculty';
  const maxRenewals = parseInt(getSetting(isFaculty ? 'faculty_max_renewals' : 'student_max_renewals', isFaculty ? 4 : 2), 10);

  if (trans.renewal_count >= maxRenewals) {
    return res.status(400).json({
      success: false,
      message: `Maximum renewal limit (${maxRenewals}) reached for this book.`
    });
  }

  // Check if others are waiting on reservation
  const waitingRes = db.prepare(`
    SELECT COUNT(*) as count FROM reservations
    WHERE book_id = ? AND status = 'waiting'
  `).get(trans.book_id).count;

  if (waitingRes > 0) {
    return res.status(400).json({
      success: false,
      message: 'Cannot renew: Other members have reserved this book.'
    });
  }

  // Calculate new due date
  const loanDays = parseInt(getSetting(isFaculty ? 'faculty_loan_days' : 'student_loan_days', isFaculty ? 30 : 14), 10);
  const now = new Date();
  // Extend from current due date if not overdue, or from now if already overdue
  const baseDate = new Date(trans.due_date) > now ? new Date(trans.due_date) : now;
  const newDueDate = new Date(baseDate.getTime() + loanDays * 86400000).toISOString().replace('T', ' ').substring(0, 19);

  db.prepare(`
    UPDATE transactions
    SET due_date = ?,
        renewal_count = renewal_count + 1,
        status = 'issued',
        notes = 'Renewed on ' || date('now')
    WHERE id = ?
  `).run(newDueDate, trans.id);

  logAudit(req, 'RENEW_BOOK', 'transaction', trans.id, `Renewed "${trans.book_title}" for ${trans.member_name} (New due: ${newDueDate.substring(0, 10)})`);

  return res.json({
    success: true,
    message: `"${trans.book_title}" renewed successfully! New due date: ${newDueDate.substring(0, 10)}.`,
    new_due_date: newDueDate,
    renewal_count: trans.renewal_count + 1,
    max_renewals: maxRenewals
  });
});

// GET /api/circulation/my-loans (Student & Faculty "My Shelf" data)
router.get('/my-loans', authenticate, (req, res) => {
  const memberId = req.user.id;

  // Active loans
  const activeLoans = db.prepare(`
    SELECT t.id as transaction_id, t.copy_barcode, t.issue_date, t.due_date,
           t.renewal_count, t.status, b.id as book_id, b.title, b.author,
           b.accession_no, b.shelf_location, b.cover_color, b.category
    FROM transactions t
    JOIN books b ON b.id = t.book_id
    WHERE t.member_id = ? AND t.status IN ('issued', 'overdue')
    ORDER BY t.due_date ASC
  `).all(memberId);

  const now = new Date();
  const enrichedActive = activeLoans.map(loan => {
    const dueDate = new Date(loan.due_date);
    const issueDate = new Date(loan.issue_date);
    const totalDurationDays = Math.max(1, Math.ceil((dueDate - issueDate) / (1000 * 60 * 60 * 24)));
    const remainingDays = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
    
    let state = 'normal';
    if (remainingDays < 0) state = 'overdue';
    else if (remainingDays <= 3) state = 'due_soon';

    // Calculate percentage elapsed for circular progress ring (0 to 100)
    const elapsedDays = Math.max(0, totalDurationDays - remainingDays);
    const percentage = Math.min(100, Math.max(0, Math.round((elapsedDays / totalDurationDays) * 100)));

    const finePerDay = parseFloat(getSetting('fine_per_day', 2.0));
    const estimatedFine = remainingDays < 0 ? Math.abs(remainingDays) * finePerDay : 0;

    return {
      ...loan,
      total_duration_days: totalDurationDays,
      remaining_days: remainingDays,
      progress_percent: percentage,
      state, // 'normal', 'due_soon', 'overdue'
      estimated_fine: estimatedFine
    };
  });

  // Loan history (past returned books)
  const history = db.prepare(`
    SELECT t.id, t.copy_barcode, t.issue_date, t.due_date, t.return_date,
           t.fine_amount, b.title, b.author, b.cover_color, b.category
    FROM transactions t
    JOIN books b ON b.id = t.book_id
    WHERE t.member_id = ? AND t.status = 'returned'
    ORDER BY t.return_date DESC
    LIMIT 20
  `).all(memberId);

  // My active reservations
  const reservations = db.prepare(`
    SELECT r.*, b.title, b.author, b.cover_color, b.shelf_location,
           (SELECT COUNT(*) FROM reservations r2 WHERE r2.book_id = r.book_id AND r2.status = 'waiting' AND r2.reservation_date <= r.reservation_date) as queue_position
    FROM reservations r
    JOIN books b ON b.id = r.book_id
    WHERE r.member_id = ? AND r.status IN ('waiting', 'ready')
    ORDER BY r.reservation_date ASC
  `).all(memberId);

  // Unpaid fines
  const unpaidFines = db.prepare(`
    SELECT f.*, b.title as book_title
    FROM fines f
    JOIN transactions t ON t.id = f.transaction_id
    JOIN books b ON b.id = t.book_id
    WHERE f.member_id = ? AND f.status = 'unpaid'
    ORDER BY f.created_at DESC
  `).all(memberId);

  const totalFinesOwed = unpaidFines.reduce((sum, f) => sum + (f.amount - f.paid_amount), 0);

  return res.json({
    success: true,
    active_loans: enrichedActive,
    history,
    reservations,
    unpaid_fines: unpaidFines,
    total_fines_owed: totalFinesOwed,
    stats: {
      reading_streak: req.user.reading_streak,
      books_read_count: req.user.books_read_count
    }
  });
});

function calculateFine(dueDateStr, returnDateStr = new Date().toISOString().split('T')[0]) {
  const due = new Date(dueDateStr);
  const ret = new Date(returnDateStr);
  const diffTime = ret - due;
  const overdueDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  if (overdueDays <= 0) return 0;
  const fineRate = parseFloat(getSetting('fine_rate_per_day', '2.00'));
  return overdueDays * fineRate;
}

router.calculateFine = calculateFine;

module.exports = router;
module.exports.calculateFine = calculateFine;


