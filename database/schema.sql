-- College Library Management System - Complete SQLite Schema with FTS5 and Triggers

PRAGMA foreign_keys = ON;

-- System Settings
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Users / Members table
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    member_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    phone TEXT,
    role TEXT NOT NULL CHECK(role IN ('student', 'faculty', 'librarian', 'admin', 'guest')),
    department TEXT NOT NULL,
    semester TEXT DEFAULT '',
    password_hash TEXT NOT NULL,
    force_password_change INTEGER DEFAULT 0,
    validity_date DATE NOT NULL,
    status TEXT DEFAULT 'active' CHECK(status IN ('active', 'deactivated')),
    reading_streak INTEGER DEFAULT 0,
    books_read_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_member_id ON users(member_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_dept ON users(department);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

-- Categories
CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    description TEXT DEFAULT ''
);

-- Books Table
CREATE TABLE IF NOT EXISTS books (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    accession_no TEXT UNIQUE NOT NULL,
    isbn TEXT DEFAULT '',
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    publisher TEXT DEFAULT '',
    edition TEXT DEFAULT '1st',
    year INTEGER DEFAULT 2024,
    category TEXT NOT NULL,
    department TEXT NOT NULL,
    language TEXT DEFAULT 'English',
    total_copies INTEGER NOT NULL DEFAULT 1,
    available_copies INTEGER NOT NULL DEFAULT 1,
    shelf_location TEXT NOT NULL,
    price REAL DEFAULT 0.0,
    status TEXT DEFAULT 'active' CHECK(status IN ('active', 'lost', 'damaged', 'archived')),
    cover_color TEXT DEFAULT '#6366f1',
    is_new_arrival INTEGER DEFAULT 0,
    total_issues_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_books_isbn ON books(isbn);
CREATE INDEX IF NOT EXISTS idx_books_title ON books(title);
CREATE INDEX IF NOT EXISTS idx_books_author ON books(author);
CREATE INDEX IF NOT EXISTS idx_books_category ON books(category);
CREATE INDEX IF NOT EXISTS idx_books_department ON books(department);
CREATE INDEX IF NOT EXISTS idx_books_available ON books(available_copies);
CREATE INDEX IF NOT EXISTS idx_books_new_arrival ON books(is_new_arrival);

-- Specific Copy tracking
CREATE TABLE IF NOT EXISTS book_copies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    barcode TEXT UNIQUE NOT NULL,
    copy_number INTEGER NOT NULL,
    status TEXT DEFAULT 'available' CHECK(status IN ('available', 'issued', 'reserved', 'lost', 'damaged', 'maintenance')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_copies_barcode ON book_copies(barcode);
CREATE INDEX IF NOT EXISTS idx_copies_book_id ON book_copies(book_id);
CREATE INDEX IF NOT EXISTS idx_copies_status ON book_copies(status);

-- Circulation Transactions (Issues / Returns / Renewals)
CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    book_id INTEGER NOT NULL REFERENCES books(id),
    copy_id INTEGER REFERENCES book_copies(id),
    copy_barcode TEXT,
    member_id INTEGER NOT NULL REFERENCES users(id),
    issue_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    due_date DATETIME NOT NULL,
    return_date DATETIME,
    renewal_count INTEGER DEFAULT 0,
    status TEXT DEFAULT 'issued' CHECK(status IN ('issued', 'returned', 'overdue', 'lost')),
    issued_by INTEGER REFERENCES users(id),
    returned_by INTEGER REFERENCES users(id),
    fine_amount REAL DEFAULT 0.0,
    fine_paid INTEGER DEFAULT 0,
    notes TEXT DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_trans_member_id ON transactions(member_id);
CREATE INDEX IF NOT EXISTS idx_trans_book_id ON transactions(book_id);
CREATE INDEX IF NOT EXISTS idx_trans_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_trans_due_date ON transactions(due_date);
CREATE INDEX IF NOT EXISTS idx_trans_issue_date ON transactions(issue_date);

-- Book Reservations (Waiting queue when 0 available copies)
CREATE TABLE IF NOT EXISTS reservations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    member_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reservation_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    expiry_date DATETIME,
    status TEXT DEFAULT 'waiting' CHECK(status IN ('waiting', 'ready', 'fulfilled', 'cancelled', 'expired')),
    notified_at DATETIME
);

CREATE INDEX IF NOT EXISTS idx_res_book_id ON reservations(book_id);
CREATE INDEX IF NOT EXISTS idx_res_member_id ON reservations(member_id);
CREATE INDEX IF NOT EXISTS idx_res_status ON reservations(status);

-- Fines & Payment History
CREATE TABLE IF NOT EXISTS fines (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transaction_id INTEGER NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    member_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount REAL NOT NULL,
    reason TEXT DEFAULT 'Late Return',
    days_overdue INTEGER NOT NULL DEFAULT 0,
    status TEXT DEFAULT 'unpaid' CHECK(status IN ('unpaid', 'paid', 'waived')),
    paid_amount REAL DEFAULT 0.0,
    payment_date DATETIME,
    collected_by INTEGER REFERENCES users(id),
    payment_method TEXT DEFAULT 'cash',
    receipt_no TEXT UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_fines_member_id ON fines(member_id);
CREATE INDEX IF NOT EXISTS idx_fines_trans_id ON fines(transaction_id);
CREATE INDEX IF NOT EXISTS idx_fines_status ON fines(status);

-- Faculty & Student Book Acquisition Suggestions
CREATE TABLE IF NOT EXISTS book_suggestions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    member_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    publisher TEXT DEFAULT '',
    isbn TEXT DEFAULT '',
    reason TEXT DEFAULT '',
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected', 'ordered', 'added')),
    librarian_notes TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sugg_member ON book_suggestions(member_id);
CREATE INDEX IF NOT EXISTS idx_sugg_status ON book_suggestions(status);

-- College Events (Workshops, Conferences, Hackathons, Book Fairs)
CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_code TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    organizer_name TEXT NOT NULL,
    department TEXT NOT NULL,
    start_time DATETIME NOT NULL,
    end_time DATETIME NOT NULL,
    max_guests INTEGER DEFAULT 100,
    allow_borrowing INTEGER DEFAULT 0,
    max_borrow_hours INTEGER DEFAULT 4,
    status TEXT DEFAULT 'active' CHECK(status IN ('upcoming', 'active', 'closed', 'cancelled')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_events_code ON events(event_code);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);

-- Time-Limited Event Guest Passes
CREATE TABLE IF NOT EXISTS guest_passes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pass_code TEXT UNIQUE NOT NULL,
    event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    guest_name TEXT NOT NULL,
    institution TEXT DEFAULT '',
    email TEXT DEFAULT '',
    phone TEXT DEFAULT '',
    valid_from DATETIME NOT NULL,
    valid_until DATETIME NOT NULL,
    check_in_time DATETIME,
    check_out_time DATETIME,
    status TEXT DEFAULT 'active' CHECK(status IN ('active', 'checked_in', 'expired', 'revoked')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_guest_pass_code ON guest_passes(pass_code);
CREATE INDEX IF NOT EXISTS idx_guest_event ON guest_passes(event_id);
CREATE INDEX IF NOT EXISTS idx_guest_status ON guest_passes(status);

-- Audit Logs for Librarian / Admin Actions
CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id),
    user_name TEXT,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    details TEXT,
    ip_address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);

-- Gamification Badges
CREATE TABLE IF NOT EXISTS member_badges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    member_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    badge_key TEXT NOT NULL,
    awarded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(member_id, badge_key)
);

CREATE INDEX IF NOT EXISTS idx_badges_member ON member_badges(member_id);

-- FTS5 Full-Text Search Virtual Table
CREATE VIRTUAL TABLE IF NOT EXISTS books_fts USING fts5(
    title,
    author,
    isbn,
    category,
    department,
    shelf_location,
    accession_no,
    content='books',
    content_rowid='id',
    tokenize='porter unicode61'
);

-- Triggers for FTS5 synchronization
CREATE TRIGGER IF NOT EXISTS books_ai AFTER INSERT ON books BEGIN
    INSERT INTO books_fts(rowid, title, author, isbn, category, department, shelf_location, accession_no)
    VALUES (new.id, new.title, new.author, new.isbn, new.category, new.department, new.shelf_location, new.accession_no);
END;

CREATE TRIGGER IF NOT EXISTS books_ad AFTER DELETE ON books BEGIN
    INSERT INTO books_fts(books_fts, rowid, title, author, isbn, category, department, shelf_location, accession_no)
    VALUES('delete', old.id, old.title, old.author, old.isbn, old.category, old.department, old.shelf_location, old.accession_no);
END;

CREATE TRIGGER IF NOT EXISTS books_au AFTER UPDATE ON books BEGIN
    INSERT INTO books_fts(books_fts, rowid, title, author, isbn, category, department, shelf_location, accession_no)
    VALUES('delete', old.id, old.title, old.author, old.isbn, old.category, old.department, old.shelf_location, old.accession_no);
    INSERT INTO books_fts(rowid, title, author, isbn, category, department, shelf_location, accession_no)
    VALUES (new.id, new.title, new.author, new.isbn, new.category, new.department, new.shelf_location, new.accession_no);
END;
