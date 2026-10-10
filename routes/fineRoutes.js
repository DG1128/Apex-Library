const express = require('express');
const router = express.Router();
const { db } = require('../database/db');
const { authenticate, requireRole } = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');

// GET /api/fines (Librarian list of fines)
router.get('/', authenticate, requireRole('librarian', 'admin'), (req, res) => {
  const { status = '', search = '', from = '', to = '', page = 1, limit = 25 } = req.query;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const pageLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 25));
  const offset = (pageNum - 1) * pageLimit;

  let whereClauses = [];
  let params = [];

  if (status) {
    whereClauses.push('f.status = ?');
    params.push(status);
  }

  if (search) {
    whereClauses.push('(u.name LIKE ? OR u.member_id LIKE ? OR b.title LIKE ? OR f.receipt_no LIKE ?)');
    const like = `%${search.trim()}%`;
    params.push(like, like, like, like);
  }

  if (from) {
    whereClauses.push('date(f.created_at) >= date(?)');
    params.push(from);
  }

  if (to) {
    whereClauses.push('date(f.created_at) <= date(?)');
    params.push(to);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const countRow = db.prepare(`
    SELECT COUNT(*) as total
    FROM fines f
    JOIN users u ON u.id = f.member_id
    JOIN transactions t ON t.id = f.transaction_id
    JOIN books b ON b.id = t.book_id
    ${whereSql}
  `).get(...params);

  const total = countRow ? countRow.total : 0;

  const selectSql = `
    SELECT f.*, u.name as member_name, u.member_id as member_code, u.role as member_role, u.department as member_dept,
           b.title as book_title, b.accession_no, t.issue_date, t.due_date, t.return_date,
           c.name as collector_name
    FROM fines f
    JOIN users u ON u.id = f.member_id
    JOIN transactions t ON t.id = f.transaction_id
    JOIN books b ON b.id = t.book_id
    LEFT JOIN users c ON c.id = f.collected_by
    ${whereSql}
    ORDER BY f.status = 'unpaid' DESC, f.created_at DESC
    LIMIT ? OFFSET ?
  `;

  const fines = db.prepare(selectSql).all(...params, pageLimit, offset);

  // Summary statistics
  const stats = db.prepare(`
    SELECT
      COALESCE(SUM(CASE WHEN status = 'unpaid' THEN (amount - paid_amount) ELSE 0 END), 0) as total_unpaid,
      COALESCE(SUM(CASE WHEN status = 'paid' THEN paid_amount ELSE 0 END), 0) as total_collected,
      COUNT(CASE WHEN status = 'unpaid' THEN 1 END) as unpaid_count
    FROM fines
  `).get();

  return res.json({
    success: true,
    fines,
    stats,
    pagination: {
      total,
      page: pageNum,
      limit: pageLimit,
      totalPages: Math.ceil(total / pageLimit)
    }
  });
});

// GET /api/fines/my (Student's fines)
router.get('/my', authenticate, (req, res) => {
  const fines = db.prepare(`
    SELECT f.*, b.title as book_title, b.accession_no, t.issue_date, t.due_date, t.return_date
    FROM fines f
    JOIN transactions t ON t.id = f.transaction_id
    JOIN books b ON b.id = t.book_id
    WHERE f.member_id = ?
    ORDER BY f.status = 'unpaid' DESC, f.created_at DESC
  `).all(req.user.id);

  const totalUnpaid = fines
    .filter(f => f.status === 'unpaid')
    .reduce((sum, f) => sum + (f.amount - f.paid_amount), 0);

  return res.json({ success: true, fines, totalUnpaid });
});

// POST /api/fines/:id/pay (Collect fine payment)
router.post('/:id/pay', authenticate, requireRole('librarian', 'admin'), (req, res) => {
  const fineId = req.params.id;
  const { paymentMethod = 'cash', amountPaid } = req.body;

  const fine = db.prepare(`
    SELECT f.*, u.name as member_name, u.member_id as member_code, b.title as book_title
    FROM fines f
    JOIN users u ON u.id = f.member_id
    JOIN transactions t ON t.id = f.transaction_id
    JOIN books b ON b.id = t.book_id
    WHERE f.id = ?
  `).get(fineId);

  if (!fine) {
    return res.status(404).json({ success: false, message: 'Fine record not found.' });
  }

  if (fine.status === 'paid') {
    return res.status(400).json({ success: false, message: 'This fine has already been paid.' });
  }

  const payAmount = amountPaid ? parseFloat(amountPaid) : (fine.amount - fine.paid_amount);
  const newTotalPaid = (fine.paid_amount || 0) + payAmount;
  const isFullPayment = newTotalPaid >= fine.amount;

  const now = new Date();
  const year = now.getFullYear();
  const receiptNo = `REC-${year}-${String(fine.id).padStart(5, '0')}`;

  const payTx = db.transaction(() => {
    db.prepare(`
      UPDATE fines
      SET status = ?,
          paid_amount = ?,
          payment_date = CURRENT_TIMESTAMP,
          collected_by = ?,
          payment_method = ?,
          receipt_no = ?
      WHERE id = ?
    `).run(isFullPayment ? 'paid' : 'unpaid', newTotalPaid, req.user.id, paymentMethod, receiptNo, fineId);

    if (isFullPayment) {
      db.prepare('UPDATE transactions SET fine_paid = 1 WHERE id = ?').run(fine.transaction_id);
    }
  });

  payTx();
  logAudit(req, 'COLLECT_FINE', 'fine', fineId, `Collected ₹${payAmount} from ${fine.member_name} (${fine.member_code}) for "${fine.book_title}" [Receipt: ${receiptNo}]`);

  return res.json({
    success: true,
    message: `Payment of ₹${payAmount.toFixed(2)} recorded successfully!`,
    receipt_no: receiptNo,
    amount_paid: payAmount,
    status: isFullPayment ? 'paid' : 'partial'
  });
});

// POST /api/fines/:id/waive (Waive fine)
router.post('/:id/waive', authenticate, requireRole('librarian', 'admin'), (req, res) => {
  const fineId = req.params.id;
  const { reason = 'Librarian Discretion' } = req.body;

  const fine = db.prepare('SELECT * FROM fines WHERE id = ?').get(fineId);
  if (!fine) {
    return res.status(404).json({ success: false, message: 'Fine not found.' });
  }

  db.prepare(`
    UPDATE fines
    SET status = 'waived',
        reason = reason || ' (Waived: ' || ? || ')',
        collected_by = ?,
        payment_date = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(reason, req.user.id, fineId);

  db.prepare('UPDATE transactions SET fine_paid = 1 WHERE id = ?').run(fine.transaction_id);

  logAudit(req, 'WAIVE_FINE', 'fine', fineId, `Waived ₹${fine.amount} fine (Reason: ${reason})`);

  return res.json({ success: true, message: 'Fine successfully waived.' });
});

module.exports = router;
