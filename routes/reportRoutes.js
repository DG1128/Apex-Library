const express = require('express');
const router = express.Router();
const { db } = require('../database/db');
const { authenticate, requireRole } = require('../middleware/auth');
const { stringifyCSV } = require('../utils/csvParser');

// GET /api/reports/dashboard (Bento stats & analytics)
router.get('/dashboard', authenticate, requireRole('librarian', 'admin'), (req, res) => {
  // Books stats
  const bookStats = db.prepare(`
    SELECT
      COUNT(*) as total_titles,
      COALESCE(SUM(total_copies), 0) as total_copies,
      COALESCE(SUM(available_copies), 0) as available_copies,
      COALESCE(SUM(total_copies - available_copies), 0) as currently_issued
    FROM books WHERE status != 'archived'
  `).get();

  // Members stats
  const memberStats = db.prepare(`
    SELECT
      COUNT(*) as total_members,
      COUNT(CASE WHEN role = 'student' THEN 1 END) as student_count,
      COUNT(CASE WHEN role = 'faculty' THEN 1 END) as faculty_count,
      COUNT(CASE WHEN status = 'active' THEN 1 END) as active_count
    FROM users WHERE role IN ('student', 'faculty')
  `).get();

  // Circulation today
  const todayStats = db.prepare(`
    SELECT
      COUNT(CASE WHEN date(issue_date) = date('now') THEN 1 END) as issued_today,
      COUNT(CASE WHEN date(return_date) = date('now') THEN 1 END) as returned_today
    FROM transactions
  `).get();

  // Overdue count
  const overdueStats = db.prepare(`
    SELECT COUNT(*) as overdue_count
    FROM transactions
    WHERE status IN ('issued', 'overdue') AND datetime(due_date) < datetime('now')
  `).get();

  // Fines stats
  const fineStats = db.prepare(`
    SELECT
      COALESCE(SUM(CASE WHEN date(payment_date) = date('now') AND status = 'paid' THEN paid_amount ELSE 0 END), 0) as fines_today,
      COALESCE(SUM(CASE WHEN strftime('%Y-%m', payment_date) = strftime('%Y-%m', 'now') AND status = 'paid' THEN paid_amount ELSE 0 END), 0) as fines_this_month,
      COALESCE(SUM(CASE WHEN status = 'paid' THEN paid_amount ELSE 0 END), 0) as fines_total_collected,
      COALESCE(SUM(CASE WHEN status = 'unpaid' THEN (amount - paid_amount) ELSE 0 END), 0) as fines_unpaid_pending
    FROM fines
  `).get();

  // Sparkline data (last 7 days issue / return daily counts)
  const sparklineDays = [];
  for (let i = 6; i >= 0; i--) {
    const dRow = db.prepare(`
      SELECT
        date('now', '-' || ? || ' days') as day,
        (SELECT COUNT(*) FROM transactions WHERE date(issue_date) = date('now', '-' || ? || ' days')) as issues,
        (SELECT COUNT(*) FROM transactions WHERE date(return_date) = date('now', '-' || ? || ' days')) as returns
    `).get(i, i, i);
    sparklineDays.push({
      date: dRow.day,
      issues: dRow.issues,
      returns: dRow.returns
    });
  }

  // Top 5 Categories Breakdown
  const topCategories = db.prepare(`
    SELECT category, COUNT(*) as titles_count, SUM(total_copies) as copies_count, SUM(total_issues_count) as issues_count
    FROM books WHERE status = 'active'
    GROUP BY category
    ORDER BY issues_count DESC
    LIMIT 6
  `).all();

  // Department Usage
  const deptUsage = db.prepare(`
    SELECT u.department, COUNT(t.id) as total_borrows, COUNT(DISTINCT u.id) as active_students
    FROM users u
    LEFT JOIN transactions t ON t.member_id = u.id
    WHERE u.department != 'Library Administration' AND u.department != ''
    GROUP BY u.department
    ORDER BY total_borrows DESC
    LIMIT 6
  `).all();

  // Recent 6 transactions for activity ticker
  const recentActivity = db.prepare(`
    SELECT t.id, t.issue_date, t.due_date, t.return_date, t.status,
           b.title as book_title, u.name as member_name, u.role as member_role, u.member_id as member_code
    FROM transactions t
    JOIN books b ON b.id = t.book_id
    JOIN users u ON u.id = t.member_id
    ORDER BY t.id DESC
    LIMIT 6
  `).all();

  return res.json({
    success: true,
    books: bookStats,
    members: memberStats,
    today: todayStats,
    overdue: overdueStats,
    fines: fineStats,
    sparkline: sparklineDays,
    topCategories,
    deptUsage,
    recentActivity
  });
});

// GET /api/reports/overdue (Detailed list of overdue books)
router.get('/overdue', authenticate, requireRole('librarian', 'admin'), (req, res) => {
  const list = db.prepare(`
    SELECT t.id as transaction_id, t.copy_barcode, t.issue_date, t.due_date, t.renewal_count,
           b.id as book_id, b.title as book_title, b.author as book_author, b.accession_no, b.shelf_location,
           u.id as member_id, u.name as member_name, u.member_id as member_code, u.role as member_role,
           u.department as member_dept, u.phone as member_phone, u.email as member_email,
           CAST(MAX(1, (julianday('now') - julianday(t.due_date))) AS INTEGER) as days_overdue
    FROM transactions t
    JOIN books b ON b.id = t.book_id
    JOIN users u ON u.id = t.member_id
    WHERE t.status IN ('issued', 'overdue') AND datetime(t.due_date) < datetime('now')
    ORDER BY t.due_date ASC
  `).all();

  const fineRate = parseFloat(db.prepare("SELECT value FROM settings WHERE key = 'fine_per_day'").get()?.value || 2.0);

  const enriched = list.map(item => ({
    ...item,
    estimated_fine: item.days_overdue * fineRate
  }));

  return res.json({ success: true, overdue: enriched });
});

// GET /api/reports/most-issued (Ranking of most borrowed books)
router.get('/most-issued', authenticate, requireRole('librarian', 'admin'), (req, res) => {
  const books = db.prepare(`
    SELECT id, accession_no, isbn, title, author, category, department,
           total_copies, available_copies, shelf_location, total_issues_count
    FROM books
    WHERE status = 'active'
    ORDER BY total_issues_count DESC
    LIMIT 50
  `).all();

  return res.json({ success: true, books });
});

// GET /api/reports/department-usage
router.get('/department-usage', authenticate, requireRole('librarian', 'admin'), (req, res) => {
  const depts = db.prepare(`
    SELECT
      u.department,
      COUNT(DISTINCT u.id) as total_members,
      COUNT(t.id) as total_issues,
      COUNT(CASE WHEN t.status IN ('issued', 'overdue') THEN 1 END) as currently_issued,
      COUNT(CASE WHEN t.status IN ('issued', 'overdue') AND datetime(t.due_date) < datetime('now') THEN 1 END) as overdue_count,
      COALESCE(SUM(u.books_read_count), 0) as total_books_completed
    FROM users u
    LEFT JOIN transactions t ON t.member_id = u.id
    WHERE u.department != 'Library Administration' AND u.department != ''
    GROUP BY u.department
    ORDER BY total_issues DESC
  `).all();

  return res.json({ success: true, departments: depts });
});

// GET /api/reports/export/:reportType (Download CSV)
router.get('/export/:reportType', authenticate, requireRole('librarian', 'admin'), (req, res) => {
  const { reportType } = req.params;
  let data = [];
  let filename = `library_report_${reportType}.csv`;

  if (reportType === 'overdue') {
    data = db.prepare(`
      SELECT t.id as Transaction_ID, b.accession_no as Accession_No, b.title as Book_Title,
             b.shelf_location as Shelf, u.member_id as Member_ID, u.name as Member_Name,
             u.department as Department, u.phone as Phone, u.email as Email,
             t.issue_date as Issue_Date, t.due_date as Due_Date,
             CAST(MAX(1, (julianday('now') - julianday(t.due_date))) AS INTEGER) as Days_Overdue
      FROM transactions t
      JOIN books b ON b.id = t.book_id
      JOIN users u ON u.id = t.member_id
      WHERE t.status IN ('issued', 'overdue') AND datetime(t.due_date) < datetime('now')
      ORDER BY t.due_date ASC
    `).all();
  } else if (reportType === 'popular_books') {
    data = db.prepare(`
      SELECT accession_no as Accession_No, isbn as ISBN, title as Title, author as Author,
             category as Category, department as Department, total_copies as Total_Copies,
             available_copies as Available_Copies, shelf_location as Shelf_Location,
             total_issues_count as Times_Issued
      FROM books WHERE status = 'active'
      ORDER BY total_issues_count DESC
    `).all();
  } else if (reportType === 'fines') {
    data = db.prepare(`
      SELECT f.receipt_no as Receipt_No, u.member_id as Member_ID, u.name as Member_Name,
             b.title as Book_Title, f.amount as Fine_Amount, f.paid_amount as Paid_Amount,
             f.status as Status, f.payment_method as Payment_Method, f.payment_date as Payment_Date,
             f.created_at as Date_Assigned
      FROM fines f
      JOIN users u ON u.id = f.member_id
      JOIN transactions t ON t.id = f.transaction_id
      JOIN books b ON b.id = t.book_id
      ORDER BY f.id DESC
    `).all();
  } else if (reportType === 'members') {
    data = db.prepare(`
      SELECT member_id as Member_ID, name as Full_Name, role as Role, department as Department,
             semester as Semester, email as Email, phone as Phone, validity_date as Valid_Until,
             status as Account_Status, books_read_count as Books_Read, reading_streak as Streak
      FROM users WHERE role IN ('student', 'faculty')
      ORDER BY department, member_id
    `).all();
  } else {
    return res.status(400).json({ success: false, message: 'Invalid report export type.' });
  }

  const csv = stringifyCSV(data);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  return res.send(csv);
});

module.exports = router;
