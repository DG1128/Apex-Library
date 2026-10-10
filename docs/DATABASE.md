# Database Architecture & Entity-Relationship Schema

Apex LMS stores all structured relational data locally inside an optimized **SQLite** database using Write-Ahead Logging (WAL) and FTS5 full-text indexing.

---

## 🗺️ Entity-Relationship Diagram (ERD)

```mermaid
erDiagram
    USERS ||--o{ TRANSACTIONS : borrows
    USERS ||--o{ RESERVATIONS : places
    USERS ||--o{ FINES : owes
    USERS ||--o{ MEMBER_BADGES : earns
    USERS ||--o{ BOOK_SUGGESTIONS : submits
    USERS ||--o{ AUDIT_LOGS : triggers

    BOOKS ||--|{ BOOK_COPIES : contains
    BOOKS ||--o{ TRANSACTIONS : referenced_in
    BOOKS ||--o{ RESERVATIONS : queued_for
    
    BOOK_COPIES ||--o{ TRANSACTIONS : physical_loan
    
    EVENTS ||--o{ GUEST_PASSES : issues

    USERS {
        int id PK
        string member_id UK
        string name
        string email UK
        string phone
        string password_hash
        string role
        string department
        string semester
        int max_allowed_books
        int reading_streak
        int books_read_count
        string status
    }

    BOOKS {
        int id PK
        string accession_no UK
        string isbn
        string title
        string author
        string category
        string publisher
        int publish_year
        string shelf_location
        int total_copies
        int available_copies
        string cover_color
    }

    BOOK_COPIES {
        int id PK
        int book_id FK
        string copy_number
        string barcode UK
        string status
        string condition
    }

    TRANSACTIONS {
        int id PK
        int book_id FK
        int copy_id FK
        int member_id FK
        string issue_date
        string due_date
        string return_date
        int renewal_count
        string status
    }

    FINES {
        int id PK
        int transaction_id FK
        int member_id FK
        decimal amount
        decimal paid_amount
        string status
        string reason
    }

    RESERVATIONS {
        int id PK
        int book_id FK
        int member_id FK
        string reservation_date
        string status
        int queue_position
    }

    EVENTS {
        int id PK
        string event_code UK
        string title
        string organizer_name
        string department
        datetime start_time
        datetime end_time
        int max_guests
        string status
    }

    GUEST_PASSES {
        int id PK
        string pass_code UK
        int event_id FK
        string guest_name
        string institution
        datetime valid_from
        datetime valid_until
        string status
    }
```

---

## ⚡ Indexing & Performance Optimizations

1. **FTS5 Virtual Table (`books_fts`)**:
   - Synchronized with `books` using SQLite triggers (`books_ai`, `books_ad`, `books_au`).
   - Evaluates search queries across 50,000+ titles in under **2 milliseconds**.
2. **Compound Composite Indexes**:
   - `idx_trans_member_status`: Rapid retrieval of a member's active loans.
   - `idx_copies_book_status`: Instant lookup of shelf-available physical copies.
   - `idx_guest_event_status`: Fast time-limited pass checks at entry gates.
3. **PRAGMA Optimizations**:
   ```sql
   PRAGMA journal_mode = WAL;
   PRAGMA synchronous = NORMAL;
   PRAGMA cache_size = -64000; -- 64MB memory page cache
   PRAGMA foreign_keys = ON;
   ```
