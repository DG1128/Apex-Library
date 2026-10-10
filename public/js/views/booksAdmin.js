// Books Catalog Management View (Admin & Librarian)

let booksAdminPage = 1;

async function renderBooksAdmin() {
  const container = document.getElementById('main-view-container');
  if (!container) return;

  container.innerHTML = `
    <!-- Top Action Bar -->
    <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px; margin-bottom:24px;">
      <div>
        <h1 style="font-size:1.8rem;">Books Inventory Management</h1>
        <p style="color:var(--text-secondary);">Manage physical catalog, accession numbers, shelf locations, and print barcodes</p>
      </div>
      <div style="display:flex; gap:10px; flex-wrap:wrap;">
        <button class="btn btn-secondary btn-sm" onclick="window.open('/api/books/export-csv', '_blank')">
          ${getIcon('download')} Export CSV
        </button>
        <button class="btn btn-secondary btn-sm" onclick="openBulkImportBooksModal()">
          ${getIcon('upload')} Bulk Import CSV
        </button>
        <button class="btn btn-primary btn-sm" onclick="openAddBookModal()">
          ${getIcon('plus')} Add New Book
        </button>
      </div>
    </div>

    <!-- Filter & Search Bar -->
    <div class="glass-card" style="padding:16px 20px; margin-bottom:20px; display:flex; gap:14px; flex-wrap:wrap; align-items:center;">
      <div style="flex:1; min-width:240px;">
        <input type="text" id="books-admin-search" class="input" placeholder="Search by Title, Author, ISBN, Accession No..." oninput="debounceBooksSearch()" />
      </div>
      <div style="width:200px;">
        <select id="books-admin-category" class="select" onchange="loadBooksAdminTable()">
          <option value="">All Categories</option>
        </select>
      </div>
      <div style="width:180px;">
        <select id="books-admin-avail" class="select" onchange="loadBooksAdminTable()">
          <option value="all">All Copies Status</option>
          <option value="available">Available (Copies > 0)</option>
          <option value="unavailable">All Copies Issued (0)</option>
        </select>
      </div>
      <button class="btn btn-secondary btn-sm" onclick="loadBooksAdminTable()">${getIcon('refreshCw')} Refresh</button>
    </div>

    <!-- Books Data Table -->
    <div class="data-table-container">
      <table class="data-table" id="books-admin-table">
        <thead>
          <tr>
            <th>Acc. No</th>
            <th>Book Title</th>
            <th>Author</th>
            <th>Category</th>
            <th>Copies</th>
            <th>Shelf Rack</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody id="books-admin-tbody">
          <tr><td colspan="7" style="text-align:center; padding:30px;">Loading books catalog...</td></tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div id="books-admin-pagination" style="display:flex; justify-content:center; gap:8px; margin-top:24px;"></div>
  `;

  loadCategoriesDropdown();
  loadBooksAdminTable();
}

let searchDebounce = null;
function debounceBooksSearch() {
  if (searchDebounce) clearTimeout(searchDebounce);
  searchDebounce = setTimeout(() => {
    booksAdminPage = 1;
    loadBooksAdminTable();
  }, 250);
}

async function loadCategoriesDropdown() {
  try {
    const res = await fetch('/api/books/categories');
    const data = await res.json();
    const select = document.getElementById('books-admin-category');
    if (select && data.success) {
      data.categories.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.name;
        opt.textContent = `${c.name} (${c.book_count})`;
        select.appendChild(opt);
      });
    }
  } catch (e) {}
}

async function loadBooksAdminTable() {
  const tbody = document.getElementById('books-admin-tbody');
  if (!tbody) return;

  const searchInput = document.getElementById('books-admin-search');
  const catSelect = document.getElementById('books-admin-category');
  const availSelect = document.getElementById('books-admin-avail');

  const q = searchInput ? searchInput.value.trim() : '';
  const category = catSelect ? catSelect.value : '';
  const availability = availSelect ? availSelect.value : 'all';

  let url = `/api/books?page=${booksAdminPage}&limit=20&sort=newest`;
  if (q) url += `&q=${encodeURIComponent(q)}`;
  if (category) url += `&category=${encodeURIComponent(category)}`;
  if (availability !== 'all') url += `&availability=${availability}`;

  try {
    const res = await fetch(url);
    const data = await res.json();

    if (!data.success || !data.books || data.books.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:40px; color:var(--text-muted);">No books found matching search criteria.</td></tr>`;
      renderAdminPagination(0, 1, 20);
      return;
    }

    tbody.innerHTML = data.books.map(b => `
      <tr>
        <td><code>${b.accession_no}</code></td>
        <td>
          <div style="font-weight:700; color:var(--text-primary);">${b.title}</div>
          <div style="font-size:0.75rem; color:var(--text-muted);">${b.publisher || 'N/A'} • ${b.edition} Ed. (${b.year})</div>
        </td>
        <td>${b.author}</td>
        <td><span class="badge badge-neutral">${b.category}</span></td>
        <td>
          <span class="badge ${b.available_copies > 0 ? 'badge-success' : 'badge-danger'}">
            ${b.available_copies} / ${b.total_copies} Avail
          </span>
        </td>
        <td><strong>${b.shelf_location}</strong></td>
        <td>
          <div style="display:flex; gap:6px;">
            <button class="btn btn-secondary btn-sm" title="Print Barcodes" onclick="openPrintBarcodesModal(${b.id})">
              ${getIcon('barcode')} Barcodes
            </button>
            <button class="btn btn-ghost btn-sm" title="Edit Book" onclick="openEditBookModal(${b.id})">
              ✏️
            </button>
            <button class="btn btn-ghost btn-sm" title="Delete Book" style="color:var(--color-danger);" onclick="confirmDeleteBook(${b.id}, '${b.title.replace(/'/g, "\\'")}')">
              ${getIcon('x')}
            </button>
          </div>
        </td>
      </tr>
    `).join('');

    renderAdminPagination(data.pagination.total, data.pagination.page, data.pagination.limit);
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--color-danger);">Error loading books table.</td></tr>`;
  }
}

function renderAdminPagination(total, currentPage, limit) {
  const container = document.getElementById('books-admin-pagination');
  if (!container) return;

  const totalPages = Math.ceil(total / limit);
  if (totalPages <= 1) {
    container.innerHTML = '';
    return;
  }

  let html = '';
  if (currentPage > 1) {
    html += `<button class="btn btn-secondary btn-sm" onclick="setBooksAdminPage(${currentPage - 1})">← Prev</button>`;
  }

  for (let p = Math.max(1, currentPage - 2); p <= Math.min(totalPages, currentPage + 2); p++) {
    html += `
      <button class="btn ${p === currentPage ? 'btn-primary' : 'btn-secondary'} btn-sm"
              onclick="setBooksAdminPage(${p})">${p}</button>
    `;
  }

  if (currentPage < totalPages) {
    html += `<button class="btn btn-secondary btn-sm" onclick="setBooksAdminPage(${currentPage + 1})">Next →</button>`;
  }

  container.innerHTML = html;
}

function setBooksAdminPage(p) {
  booksAdminPage = p;
  loadBooksAdminTable();
}

// Add Book Modal
function openAddBookModal() {
  const modalHtml = `
    <div class="modal-header">
      <h3>📚 Add New Book to Library</h3>
      <button class="btn btn-ghost btn-icon" onclick="window.closeModal()">${getIcon('x')}</button>
    </div>
    <form id="add-book-form" onsubmit="submitAddBook(event)">
      <div class="modal-body">
        <div class="bento-grid">
          <div class="bento-col-8 form-group">
            <label class="form-label">Book Title *</label>
            <input type="text" name="title" class="input" required placeholder="e.g. Design Patterns" />
          </div>
          <div class="bento-col-4 form-group">
            <label class="form-label">Accession No. (Auto if blank)</label>
            <input type="text" name="accession_no" class="input" placeholder="e.g. ACC-2005" />
          </div>
          <div class="bento-col-6 form-group">
            <label class="form-label">Author(s) *</label>
            <input type="text" name="author" class="input" required placeholder="e.g. Erich Gamma, Richard Helm" />
          </div>
          <div class="bento-col-6 form-group">
            <label class="form-label">Category *</label>
            <select name="category" class="select" required>
              <option value="Computer Science">Computer Science</option>
              <option value="Artificial Intelligence & Data">Artificial Intelligence & Data</option>
              <option value="Electronics & Hardware">Electronics & Hardware</option>
              <option value="Mechanical Engineering">Mechanical Engineering</option>
              <option value="Civil Engineering">Civil Engineering</option>
              <option value="Mathematics & Physics">Mathematics & Physics</option>
              <option value="Management & Business">Management & Business</option>
              <option value="Literature & Humanities">Literature & Humanities</option>
              <option value="Self Improvement & Career">Self Improvement & Career</option>
            </select>
          </div>
          <div class="bento-col-6 form-group">
            <label class="form-label">Shelf Location *</label>
            <input type="text" name="shelf_location" class="input" required placeholder="e.g. Rack CS-02, Shelf B" />
          </div>
          <div class="bento-col-6 form-group">
            <label class="form-label">Department</label>
            <input type="text" name="department" class="input" placeholder="e.g. Computer Science" />
          </div>
          <div class="bento-col-4 form-group">
            <label class="form-label">Total Copies *</label>
            <input type="number" name="total_copies" class="input" min="1" max="100" value="3" required />
          </div>
          <div class="bento-col-4 form-group">
            <label class="form-label">Publication Year</label>
            <input type="number" name="year" class="input" value="2024" />
          </div>
          <div class="bento-col-4 form-group">
            <label class="form-label">Edition</label>
            <input type="text" name="edition" class="input" value="1st" />
          </div>
          <div class="bento-col-6 form-group">
            <label class="form-label">Publisher</label>
            <input type="text" name="publisher" class="input" placeholder="e.g. Addison-Wesley" />
          </div>
          <div class="bento-col-6 form-group">
            <label class="form-label">ISBN</label>
            <input type="text" name="isbn" class="input" placeholder="e.g. 978-0201633610" />
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" onclick="window.closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">Create Book & Generate Barcodes</button>
      </div>
    </form>
  `;

  window.openModal(modalHtml);
}

async function submitAddBook(e) {
  e.preventDefault();
  const form = e.target;
  const formData = new FormData(form);
  const data = Object.fromEntries(formData.entries());

  try {
    const res = await fetch('/api/books', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${window.appState.token}`
      },
      body: JSON.stringify(data)
    });
    const result = await res.json();
    if (result.success) {
      showToast(result.message, 'success');
      window.closeModal();
      loadBooksAdminTable();
    } else {
      showToast(result.message, 'danger');
    }
  } catch (err) {
    showToast('Failed to add book: ' + err.message, 'danger');
  }
}

// Edit Book Modal
async function openEditBookModal(bookId) {
  try {
    const res = await fetch(`/api/books/${bookId}`);
    const data = await res.json();
    if (!data.success) return showToast('Book not found', 'danger');

    const b = data.book;
    const modalHtml = `
      <div class="modal-header">
        <h3>✏️ Edit Book: ${b.accession_no}</h3>
        <button class="btn btn-ghost btn-icon" onclick="window.closeModal()">${getIcon('x')}</button>
      </div>
      <form id="edit-book-form" onsubmit="submitEditBook(event, ${bookId})">
        <div class="modal-body">
          <div class="bento-grid">
            <div class="bento-col-12 form-group">
              <label class="form-label">Book Title *</label>
              <input type="text" name="title" class="input" required value="${b.title}" />
            </div>
            <div class="bento-col-6 form-group">
              <label class="form-label">Author(s) *</label>
              <input type="text" name="author" class="input" required value="${b.author}" />
            </div>
            <div class="bento-col-6 form-group">
              <label class="form-label">Category *</label>
              <input type="text" name="category" class="input" required value="${b.category}" />
            </div>
            <div class="bento-col-6 form-group">
              <label class="form-label">Shelf Location *</label>
              <input type="text" name="shelf_location" class="input" required value="${b.shelf_location}" />
            </div>
            <div class="bento-col-6 form-group">
              <label class="form-label">Department</label>
              <input type="text" name="department" class="input" value="${b.department}" />
            </div>
            <div class="bento-col-6 form-group">
              <label class="form-label">Publisher</label>
              <input type="text" name="publisher" class="input" value="${b.publisher || ''}" />
            </div>
            <div class="bento-col-6 form-group">
              <label class="form-label">ISBN</label>
              <input type="text" name="isbn" class="input" value="${b.isbn || ''}" />
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" onclick="window.closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">Save Changes</button>
        </div>
      </form>
    `;

    window.openModal(modalHtml);
  } catch (e) {
    showToast('Failed to fetch book data', 'danger');
  }
}

async function submitEditBook(e, bookId) {
  e.preventDefault();
  const form = e.target;
  const formData = new FormData(form);
  const data = Object.fromEntries(formData.entries());

  try {
    const res = await fetch(`/api/books/${bookId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${window.appState.token}`
      },
      body: JSON.stringify(data)
    });
    const result = await res.json();
    if (result.success) {
      showToast(result.message, 'success');
      window.closeModal();
      loadBooksAdminTable();
    } else {
      showToast(result.message, 'danger');
    }
  } catch (err) {
    showToast('Failed to update book: ' + err.message, 'danger');
  }
}

// Print Barcodes Modal
async function openPrintBarcodesModal(bookId) {
  try {
    const res = await fetch(`/api/books/${bookId}/barcodes`, {
      headers: { 'Authorization': `Bearer ${window.appState.token}` }
    });
    const data = await res.json();
    if (!data.success) return showToast('Failed to load barcodes', 'danger');

    const modalHtml = `
      <div class="modal-header no-print">
        <h3>🏷️ Printable Barcode Labels: ${data.book.title}</h3>
        <button class="btn btn-ghost btn-icon" onclick="window.closeModal()">${getIcon('x')}</button>
      </div>
      <div class="modal-body">
        <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(240px, 1fr)); gap:16px;" id="barcode-print-area">
          ${data.barcodes.map(b => `
            <div class="printable-card" style="border:1px dashed var(--border-strong); border-radius:var(--radius-md); padding:14px; text-align:center; background:#ffffff; color:#0f172a;">
              <div style="font-size:0.75rem; font-weight:700; text-transform:uppercase; margin-bottom:4px; color:#475569;">
                APEX COLLEGE LIBRARY
              </div>
              <div style="font-size:0.85rem; font-weight:800; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-bottom:6px;">
                ${b.book_title}
              </div>
              <div style="display:flex; justify-content:center; margin-bottom:6px;">
                ${b.svg}
              </div>
              <div style="font-size:0.7rem; color:#64748b;">
                Copy #${b.copy_number} • Shelf: ${b.shelf_location}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
      <div class="modal-footer no-print">
        <button class="btn btn-secondary" onclick="window.closeModal()">Close</button>
        <button class="btn btn-primary" onclick="window.print()">${getIcon('printer')} Print Barcode Labels</button>
      </div>
    `;

    window.openModal(modalHtml);
  } catch (e) {
    showToast('Failed to generate barcodes', 'danger');
  }
}

// Bulk Import Books Modal
function openBulkImportBooksModal() {
  const modalHtml = `
    <div class="modal-header">
      <h3>📥 Bulk Import Books from CSV</h3>
      <button class="btn btn-ghost btn-icon" onclick="window.closeModal()">${getIcon('x')}</button>
    </div>
    <form id="bulk-import-books-form" onsubmit="submitBulkImportBooks(event)">
      <div class="modal-body">
        <p style="font-size:0.9rem; color:var(--text-secondary); margin-bottom:14px;">
          Upload a standard CSV file with headers: <code>title, author, category, department, shelf_location, copies, isbn, publisher, year</code>
        </p>
        <div style="border:2px dashed var(--border-strong); border-radius:var(--radius-lg); padding:30px; text-align:center; margin-bottom:14px; background:var(--bg-input);">
          <input type="file" id="bulk-books-file" name="file" accept=".csv" required style="display:block; margin:0 auto;" />
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" onclick="window.closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">Start Import</button>
      </div>
    </form>
  `;

  window.openModal(modalHtml);
}

async function submitBulkImportBooks(e) {
  e.preventDefault();
  const fileInput = document.getElementById('bulk-books-file');
  if (!fileInput || !fileInput.files[0]) return;

  const formData = new FormData();
  formData.append('file', fileInput.files[0]);

  try {
    const res = await fetch('/api/books/bulk-import', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${window.appState.token}` },
      body: formData
    });
    const result = await res.json();
    if (result.success) {
      showToast(result.message, 'success');
      window.closeModal();
      loadBooksAdminTable();
    } else {
      showToast(result.message, 'danger');
    }
  } catch (err) {
    showToast('Import error: ' + err.message, 'danger');
  }
}

async function confirmDeleteBook(bookId, title) {
  if (!confirm(`Are you sure you want to delete "${title}"? This cannot be undone.`)) return;

  try {
    const res = await fetch(`/api/books/${bookId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${window.appState.token}` }
    });
    const data = await res.json();
    if (data.success) {
      showToast(data.message, 'success');
      loadBooksAdminTable();
    } else {
      showToast(data.message, 'danger');
    }
  } catch (e) {
    showToast('Delete error: ' + e.message, 'danger');
  }
}
