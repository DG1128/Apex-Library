const express = require('express');
const router = express.Router();
const multer = require('multer');
const { db } = require('../database/db');
const { authenticate, optionalAuth, requireRole } = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');
const { parseCSV, stringifyCSV } = require('../utils/csvParser');
const { generateCode128SVG } = require('../utils/barcode');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// GET /api/books (Search with FTS5, category, department, availability filters, pagination)
router.get('/', optionalAuth, (req, res) => {
  const {
    q = '',
    category = '',
    department = '',
    language = '',
    availability = 'all', // 'all', 'available', 'unavailable', 'new'
    sort = 'title_asc', // 'title_asc', 'title_desc', 'popular', 'newest'
    page = 1,
    limit = 24
  } = req.query;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const pageLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 24));
  const offset = (pageNum - 1) * pageLimit;

  let baseSql = `FROM books b`;
  let whereClauses = ["b.status != 'archived'"];
  let params = [];

  const queryTerm = q.trim();

  if (queryTerm) {
    // Check if FTS5 match query can be formed
    // Escape special FTS5 characters
    const sanitizedFts = queryTerm.replace(/['"*^]/g, '').trim();
    if (sanitizedFts) {
      baseSql = `FROM books_fts fts JOIN books b ON b.id = fts.rowid`;
      // Support prefix search with *
      const ftsExpression = `"${sanitizedFts}"*`;
      whereClauses.push(`books_fts MATCH ?`);
      params.push(ftsExpression);
    } else {
      whereClauses.push(`(b.title LIKE ? OR b.author LIKE ? OR b.isbn LIKE ? OR b.accession_no LIKE ?)`);
      const likeTerm = `%${queryTerm}%`;
      params.push(likeTerm, likeTerm, likeTerm, likeTerm);
    }
  }

  if (category) {
    whereClauses.push(`b.category = ?`);
    params.push(category);
  }

  if (department) {
    whereClauses.push(`b.department = ?`);
    params.push(department);
  }

  if (language) {
    whereClauses.push(`b.language = ?`);
    params.push(language);
  }

  if (availability === 'available') {
    whereClauses.push(`b.available_copies > 0`);
  } else if (availability === 'unavailable') {
    whereClauses.push(`b.available_copies = 0`);
  } else if (availability === 'new') {
    whereClauses.push(`b.is_new_arrival = 1`);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  // Count total records
  const countSql = `SELECT COUNT(*) as total ${baseSql} ${whereSql}`;
  const totalRow = db.prepare(countSql).get(...params);
  const total = totalRow ? totalRow.total : 0;

  // Ordering
  let orderSql = 'ORDER BY b.title ASC';
  if (sort === 'title_desc') orderSql = 'ORDER BY b.title DESC';
  else if (sort === 'popular') orderSql = 'ORDER BY b.total_issues_count DESC, b.title ASC';
  else if (sort === 'newest') orderSql = 'ORDER BY b.is_new_arrival DESC, b.id DESC';
  else if (sort === 'year_desc') orderSql = 'ORDER BY b.year DESC';

  const selectSql = `
    SELECT b.id, b.accession_no, b.isbn, b.title, b.author, b.publisher,
           b.edition, b.year, b.category, b.department, b.language,
           b.total_copies, b.available_copies, b.shelf_location, b.price,
           b.status, b.cover_color, b.is_new_arrival, b.total_issues_count
    ${baseSql}
    ${whereSql}
    ${orderSql}
    LIMIT ? OFFSET ?
  `;

  const books = db.prepare(selectSql).all(...params, pageLimit, offset);

  return res.json({
    success: true,
    books,
    pagination: {
      total,
      page: pageNum,
      limit: pageLimit,
      totalPages: Math.ceil(total / pageLimit)
    }
  });
});

// GET /api/books/new-arrivals
router.get('/new-arrivals', (req, res) => {
  const books = db.prepare(`
    SELECT id, accession_no, isbn, title, author, category, department,
           total_copies, available_copies, shelf_location, cover_color, is_new_arrival
    FROM books
    WHERE status = 'active' AND is_new_arrival = 1
    ORDER BY id DESC
    LIMIT 10
  `).all();
  return res.json({ success: true, books });
});

// GET /api/books/trending
router.get('/trending', (req, res) => {
  const books = db.prepare(`
    SELECT id, accession_no, isbn, title, author, category, department,
           total_copies, available_copies, shelf_location, cover_color, total_issues_count
    FROM books
    WHERE status = 'active'
    ORDER BY total_issues_count DESC
    LIMIT 10
  `).all();
  return res.json({ success: true, books });
});

// GET /api/books/categories
router.get('/categories', (req, res) => {
  const categories = db.prepare(`
    SELECT c.id, c.name, c.description,
           (SELECT COUNT(*) FROM books b WHERE b.category = c.name AND b.status = 'active') as book_count
    FROM categories c
    ORDER BY c.name ASC
  `).all();
  return res.json({ success: true, categories });
});

// GET /api/books/departments
router.get('/departments', (req, res) => {
  const rows = db.prepare(`
    SELECT DISTINCT department FROM books WHERE status = 'active' AND department != '' ORDER BY department ASC
  `).all();
  return res.json({ success: true, departments: rows.map(r => r.department) });
});

// GET /api/books/:id
router.get('/:id', optionalAuth, (req, res) => {
  const bookId = req.params.id;
  const book = db.prepare('SELECT * FROM books WHERE id = ?').get(bookId);

  if (!book) {
    return res.status(404).json({ success: false, message: 'Book not found' });
  }

  // Get copies
  const copies = db.prepare(`
    SELECT id, barcode, copy_number, status
    FROM book_copies
    WHERE book_id = ?
    ORDER BY copy_number ASC
  `).all(bookId);

  // Active reservations count
  const reservationsCount = db.prepare(`
    SELECT COUNT(*) as count FROM reservations
    WHERE book_id = ? AND status IN ('waiting', 'ready')
  `).get(bookId).count;

  // Check if current user has reserved it
  let userReserved = false;
  let userReservationId = null;
  if (req.user) {
    const userRes = db.prepare(`
      SELECT id FROM reservations
      WHERE book_id = ? AND member_id = ? AND status IN ('waiting', 'ready')
    `).get(bookId, req.user.id);
    if (userRes) {
      userReserved = true;
      userReservationId = userRes.id;
    }
  }

  return res.json({
    success: true,
    book: {
      ...book,
      copies,
      reservations_count: reservationsCount,
      user_reserved: userReserved,
      user_reservation_id: userReservationId
    }
  });
});

// POST /api/books (Librarian/Admin: Add book)
router.post('/', authenticate, requireRole('librarian', 'admin'), (req, res) => {
  const {
    accession_no, isbn = '', title, author, publisher = '',
    edition = '1st', year = 2024, category, department,
    language = 'English', total_copies = 1, shelf_location,
    price = 0, is_new_arrival = 0, cover_color = '#6366f1'
  } = req.body;

  if (!title || !author || !category || !shelf_location) {
    return res.status(400).json({ success: false, message: 'Title, Author, Category, and Shelf Location are required.' });
  }

  // Generate accession number if not provided
  let accNo = accession_no ? accession_no.trim().toUpperCase() : '';
  if (!accNo) {
    const lastBook = db.prepare('SELECT id FROM books ORDER BY id DESC LIMIT 1').get();
    const nextId = (lastBook ? lastBook.id : 0) + 1;
    accNo = `ACC-${String(nextId).padStart(4, '0')}`;
  }

  const existingAcc = db.prepare('SELECT id FROM books WHERE accession_no = ?').get(accNo);
  if (existingAcc) {
    return res.status(400).json({ success: false, message: `Accession Number "${accNo}" already exists.` });
  }

  const copiesCount = Math.max(1, parseInt(total_copies, 10) || 1);

  const insertBookTx = db.transaction(() => {
    const resInsert = db.prepare(`
      INSERT INTO books (
        accession_no, isbn, title, author, publisher, edition, year,
        category, department, language, total_copies, available_copies,
        shelf_location, price, status, cover_color, is_new_arrival, total_issues_count
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, 0)
    `).run(
      accNo, isbn, title.trim(), author.trim(), publisher.trim(), edition,
      parseInt(year, 10) || 2024, category, department || category, language,
      copiesCount, copiesCount, shelf_location.trim(), parseFloat(price) || 0,
      cover_color, is_new_arrival ? 1 : 0
    );

    const bookId = resInsert.lastInsertRowid;

    // Create copy records
    const insertCopy = db.prepare(`
      INSERT INTO book_copies (book_id, barcode, copy_number, status)
      VALUES (?, ?, ?, 'available')
    `);

    for (let c = 1; c <= copiesCount; c++) {
      insertCopy.run(bookId, `${accNo}-C${c}`, c);
    }

    return bookId;
  });

  const newBookId = insertBookTx();
  logAudit(req, 'ADD_BOOK', 'book', newBookId, `Added book "${title}" (${accNo}) with ${copiesCount} copies`);

  return res.json({ success: true, message: 'Book added successfully!', bookId: newBookId, accession_no: accNo });
});

// PUT /api/books/:id (Librarian/Admin: Update book)
router.put('/:id', authenticate, requireRole('librarian', 'admin'), (req, res) => {
  const bookId = req.params.id;
  const {
    isbn, title, author, publisher, edition, year,
    category, department, language, shelf_location, price,
    is_new_arrival, cover_color, status
  } = req.body;

  const existing = db.prepare('SELECT * FROM books WHERE id = ?').get(bookId);
  if (!existing) {
    return res.status(404).json({ success: false, message: 'Book not found' });
  }

  db.prepare(`
    UPDATE books
    SET isbn = COALESCE(?, isbn),
        title = COALESCE(?, title),
        author = COALESCE(?, author),
        publisher = COALESCE(?, publisher),
        edition = COALESCE(?, edition),
        year = COALESCE(?, year),
        category = COALESCE(?, category),
        department = COALESCE(?, department),
        language = COALESCE(?, language),
        shelf_location = COALESCE(?, shelf_location),
        price = COALESCE(?, price),
        is_new_arrival = COALESCE(?, is_new_arrival),
        cover_color = COALESCE(?, cover_color),
        status = COALESCE(?, status),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    isbn, title, author, publisher, edition, year ? parseInt(year, 10) : null,
    category, department, language, shelf_location, price !== undefined ? parseFloat(price) : null,
    is_new_arrival !== undefined ? (is_new_arrival ? 1 : 0) : null, cover_color, status,
    bookId
  );

  logAudit(req, 'UPDATE_BOOK', 'book', bookId, `Updated details for "${title || existing.title}"`);

  return res.json({ success: true, message: 'Book updated successfully!' });
});

// DELETE /api/books/:id (Librarian/Admin: Delete book if not issued)
router.delete('/:id', authenticate, requireRole('librarian', 'admin'), (req, res) => {
  const bookId = req.params.id;
  const book = db.prepare('SELECT title, accession_no, total_copies, available_copies FROM books WHERE id = ?').get(bookId);

  if (!book) {
    return res.status(404).json({ success: false, message: 'Book not found' });
  }

  if (book.available_copies < book.total_copies) {
    return res.status(400).json({
      success: false,
      message: `Cannot delete book. ${book.total_copies - book.available_copies} copy/copies are currently issued to members.`
    });
  }

  const deleteTx = db.transaction(() => {
    db.prepare('DELETE FROM book_copies WHERE book_id = ?').run(bookId);
    db.prepare('DELETE FROM reservations WHERE book_id = ?').run(bookId);
    db.prepare('DELETE FROM books WHERE id = ?').run(bookId);
  });

  deleteTx();
  logAudit(req, 'DELETE_BOOK', 'book', bookId, `Deleted book "${book.title}" (${book.accession_no})`);

  return res.json({ success: true, message: 'Book deleted successfully.' });
});

// GET /api/books/:id/barcodes (Printable barcodes for all copies)
router.get('/:id/barcodes', authenticate, requireRole('librarian', 'admin'), (req, res) => {
  const bookId = req.params.id;
  const book = db.prepare('SELECT * FROM books WHERE id = ?').get(bookId);

  if (!book) {
    return res.status(404).json({ success: false, message: 'Book not found' });
  }

  const copies = db.prepare('SELECT * FROM book_copies WHERE book_id = ? ORDER BY copy_number ASC').all(bookId);
  const barcodes = copies.map(c => ({
    copy_number: c.copy_number,
    barcode: c.barcode,
    svg: generateCode128SVG(c.barcode, { height: 50, showText: true }),
    book_title: book.title,
    accession_no: book.accession_no,
    shelf_location: book.shelf_location
  }));

  return res.json({ success: true, book, barcodes });
});

// POST /api/books/bulk-import (CSV upload)
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

  const insertBookStmt = db.prepare(`
    INSERT INTO books (
      accession_no, isbn, title, author, publisher, edition, year,
      category, department, language, total_copies, available_copies,
      shelf_location, price, status, cover_color, is_new_arrival, total_issues_count
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, 0)
  `);

  const insertCopyStmt = db.prepare(`
    INSERT INTO book_copies (book_id, barcode, copy_number, status)
    VALUES (?, ?, ?, 'available')
  `);

  const checkAccStmt = db.prepare('SELECT id FROM books WHERE accession_no = ?');

  const importTx = db.transaction(() => {
    let autoAccCounter = 1000 + (db.prepare('SELECT COUNT(*) as c FROM books').get().c || 0);

    for (const r of rows) {
      const title = r.title || r.book_title;
      const author = r.author || r.authors;
      if (!title || !author) {
        skipped++;
        continue;
      }

      let accNo = r.accession_no || r.acc_no;
      if (!accNo) {
        accNo = `ACC-${++autoAccCounter}`;
      } else {
        accNo = accNo.trim().toUpperCase();
        if (checkAccStmt.get(accNo)) {
          skipped++;
          continue;
        }
      }

      const category = r.category || 'General';
      const department = r.department || category;
      const isbn = r.isbn || '';
      const publisher = r.publisher || '';
      const edition = r.edition || '1st';
      const year = parseInt(r.year, 10) || 2024;
      const language = r.language || 'English';
      const copies = Math.max(1, parseInt(r.copies || r.total_copies, 10) || 1);
      const shelf = r.shelf_location || r.shelf || 'General Stack';
      const price = parseFloat(r.price) || 0;
      const color = r.cover_color || '#6366f1';

      const resBook = insertBookStmt.run(
        accNo, isbn, title.trim(), author.trim(), publisher.trim(), edition,
        year, category, department, language, copies, copies, shelf.trim(),
        price, color, 1
      );

      const bookId = resBook.lastInsertRowid;
      for (let c = 1; c <= copies; c++) {
        insertCopyStmt.run(bookId, `${accNo}-C${c}`, c);
      }
      imported++;
    }
  });

  importTx();
  logAudit(req, 'BULK_IMPORT_BOOKS', 'book', 'bulk', `Bulk imported ${imported} books (${skipped} skipped)`);

  return res.json({
    success: true,
    message: `Successfully imported ${imported} books (${skipped} skipped).`,
    imported,
    skipped
  });
});

// GET /api/books/export-csv
router.get('/export-csv', authenticate, requireRole('librarian', 'admin'), (req, res) => {
  const books = db.prepare(`
    SELECT accession_no, isbn, title, author, publisher, edition, year,
           category, department, language, total_copies, available_copies,
           shelf_location, price, status, total_issues_count
    FROM books
    ORDER BY accession_no ASC
  `).all();

  const csv = stringifyCSV(books);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="library_books_catalog.csv"');
  return res.send(csv);
});

// POST /api/books/suggest (Faculty / Student book suggestion)
router.post('/suggest', authenticate, (req, res) => {
  const { title, author, publisher = '', isbn = '', reason = '' } = req.body;

  if (!title || !author) {
    return res.status(400).json({ success: false, message: 'Book title and author are required.' });
  }

  const result = db.prepare(`
    INSERT INTO book_suggestions (member_id, title, author, publisher, isbn, reason, status)
    VALUES (?, ?, ?, ?, ?, ?, 'pending')
  `).run(req.user.id, title.trim(), author.trim(), publisher.trim(), isbn.trim(), reason.trim());

  logAudit(req, 'SUGGEST_BOOK', 'suggestion', result.lastInsertRowid, `Suggested book: "${title}" by ${author}`);

  return res.json({ success: true, message: 'Thank you! Your book request has been submitted to the librarian.' });
});

// GET /api/books/suggestions (View book suggestions)
router.get('/suggestions', authenticate, (req, res) => {
  const isLibrarian = ['librarian', 'admin'].includes(req.user.role);

  let query = `
    SELECT s.*, u.name as member_name, u.member_id as member_code, u.role as member_role, u.department as member_dept
    FROM book_suggestions s
    JOIN users u ON u.id = s.member_id
  `;

  let params = [];
  if (!isLibrarian) {
    query += ' WHERE s.member_id = ?';
    params.push(req.user.id);
  }

  query += ' ORDER BY s.created_at DESC';

  const suggestions = db.prepare(query).all(...params);
  return res.json({ success: true, suggestions });
});

// PATCH /api/books/suggestions/:id (Librarian: Update suggestion status)
router.patch('/suggestions/:id', authenticate, requireRole('librarian', 'admin'), (req, res) => {
  const { status, librarian_notes = '' } = req.body;
  const allowed = ['pending', 'approved', 'rejected', 'ordered', 'added'];

  if (!allowed.includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status' });
  }

  db.prepare(`
    UPDATE book_suggestions
    SET status = ?, librarian_notes = ?
    WHERE id = ?
  `).run(status, librarian_notes, req.params.id);

  logAudit(req, 'UPDATE_SUGGESTION', 'suggestion', req.params.id, `Changed suggestion status to ${status}`);

  return res.json({ success: true, message: 'Suggestion updated.' });
});

module.exports = router;
