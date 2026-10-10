# REST API Reference Manual

All API endpoints return standard JSON responses with the following envelope structure:

```json
{
  "success": true,
  "message": "Optional status message",
  "data": { ... }
}
```

---

## 🔐 1. Authentication Endpoints

### `POST /api/auth/login`
Authenticate member or administrator and receive JWT session token.

**Request Body:**
```json
{
  "username": "STU2024001",
  "password": "password123"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 4,
    "member_id": "STU2024001",
    "name": "Aarav Sharma",
    "email": "aarav.sharma@college.edu",
    "role": "student",
    "department": "Computer Science",
    "force_password_change": 0
  }
}
```

---

## 📚 2. Book Catalog Endpoints

### `GET /api/books`
Search and filter books catalog using FTS5 full-text engine.

**Query Parameters:**
- `q`: Search keyword (matches Title, Author, ISBN, Subject)
- `category`: Filter by category
- `available`: `true` for only currently available items
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)

**Response (200 OK):**
```json
{
  "success": true,
  "books": [
    {
      "id": 1,
      "isbn": "978-0132350884",
      "title": "Clean Code",
      "author": "Robert C. Martin",
      "category": "Computer Science",
      "total_copies": 5,
      "available_copies": 4,
      "shelf_location": "Rack CS-04"
    }
  ],
  "pagination": { "page": 1, "total": 48, "totalPages": 3 }
}
```

### `POST /api/books` *(Requires: Librarian / Admin)*
Add a new book title and automatically generate physical copy accession numbers.

---

## 🔄 3. Circulation Endpoints

### `POST /api/circulation/issue` *(Requires: Librarian / Admin)*
Issue a physical book copy to an active library member.

**Request Body:**
```json
{
  "memberId": 4,
  "copyBarcode": "ACC-1002-C1"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Book \"Clean Architecture\" issued to Aarav Sharma. Due on 2024-10-24.",
  "transactionId": 14
}
```

### `POST /api/circulation/return` *(Requires: Librarian / Admin)*
Process physical copy return, check for overdue late fines, and release waiting reservations.

**Request Body:**
```json
{
  "copyBarcode": "ACC-1002-C1"
}
```

---

## 🎟️ 4. Event & Guest Pass Endpoints

### `POST /api/events` *(Requires: Librarian / Admin)*
Create an event with a time-bound guest access policy.

**Request Body:**
```json
{
  "title": "National AI Hackathon 2024",
  "organizer_name": "Dr. R. Mehta",
  "department": "Computer Science",
  "start_time": "2024-10-15T09:00:00Z",
  "end_time": "2024-10-15T18:00:00Z",
  "max_guests": 150
}
```

### `GET /api/guest/verify/:passCode` *(Public)*
Check whether a guest barcode is active, expired, or invalid.
