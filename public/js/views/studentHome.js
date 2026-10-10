// Student Home View: Hero Search as-you-type, Bento Grid, Floating Drawer

async function renderStudentHome() {
  const container = document.getElementById('main-view-container');
  if (!container) return;

  container.innerHTML = `
    <!-- Hero Search Section -->
    <div class="hero-search-section">
      <div class="hero-glow-halo"></div>
      <h1 class="hero-title"><span class="gradient-text">Search. Discover. Learn.</span></h1>
      <p class="hero-subtitle">Access over 50,000 physical books, journals & academic publications instantly</p>

      <!-- Main Glowing Search Bar -->
      <div class="search-bar-wrapper">
        <div class="search-bar-box">
          <span class="search-icon">${getIcon('search')}</span>
          <input type="text" id="hero-search-input" class="search-main-input"
                 placeholder="Search 'Clean Code', 'Python', 'Algorithms', author name..."
                 autocomplete="off" />
          <button id="hero-search-clear" class="search-clear-btn" style="display:none;" onclick="clearHeroSearch()">${getIcon('x')}</button>
        </div>

        <!-- Instant Floating Search Results Panel -->
        <div id="instant-search-panel" class="instant-results-panel"></div>
      </div>

      <!-- Quick Filter Chips -->
      <div class="filter-chips" id="filter-chips-container">
        <button class="chip-btn active" data-filter="all" onclick="applyQuickFilter('all', this)">⚡ All Books</button>
        <button class="chip-btn" data-filter="available" onclick="applyQuickFilter('available', this)">🟢 Available Now</button>
        <button class="chip-btn" data-filter="new" onclick="applyQuickFilter('new', this)">✨ Just Arrived</button>
        <button class="chip-btn" data-filter="Computer Science" onclick="applyQuickFilter('Computer Science', this)">💻 Computer Science</button>
        <button class="chip-btn" data-filter="Artificial Intelligence & Data" onclick="applyQuickFilter('Artificial Intelligence & Data', this)">🤖 AI & Data</button>
        <button class="chip-btn" data-filter="Electronics & Hardware" onclick="applyQuickFilter('Electronics & Hardware', this)">⚡ Electronics</button>
        <button class="chip-btn" data-filter="Management & Business" onclick="applyQuickFilter('Management & Business', this)">📈 Management</button>
      </div>
    </div>

    <!-- Dynamic Section Header -->
    <div style="display:flex; justify-content:space-between; align-items:center; margin-top:20px; margin-bottom:12px;">
      <div>
        <h2 id="catalog-section-heading" style="font-size:1.4rem;">Featured Academic Collection</h2>
        <p id="catalog-section-subheading" style="font-size:0.85rem; color:var(--text-muted);">Explore top-rated recommended textbooks and references</p>
      </div>
      <div style="display:flex; gap:10px; align-items:center;">
        <select id="catalog-sort-select" class="select" style="width:auto; padding:6px 12px; font-size:0.85rem;" onchange="loadCatalogBooks()">
          <option value="popular">🔥 Most Popular</option>
          <option value="newest">✨ Newest First</option>
          <option value="title_asc">🔤 Title (A to Z)</option>
          <option value="year_desc">📅 Publication Year</option>
        </select>
      </div>
    </div>

    <!-- Books Bento Grid -->
    <div id="books-grid-container" class="book-cards-grid">
      <!-- Skeletons while loading -->
      ${Array(8).fill(0).map(() => `
        <div class="book-card">
          <div class="book-cover-wrap skeleton" style="aspect-ratio:3/4;"></div>
          <div class="book-card-content">
            <div class="skeleton" style="height:18px; width:85%; margin-bottom:6px;"></div>
            <div class="skeleton" style="height:14px; width:60%; margin-bottom:12px;"></div>
            <div class="skeleton" style="height:12px; width:40%;"></div>
          </div>
        </div>
      `).join('')}
    </div>

    <!-- Pagination Controls -->
    <div id="catalog-pagination-container" style="display:flex; justify-content:center; gap:8px; margin-top:36px;"></div>
  `;

  // Init rotating search placeholder
  initRotatingPlaceholder();
  // Init as-you-type search
  initAsYouTypeSearch();
  // Load initial catalog
  window.catalogPage = 1;
  window.currentQuickFilter = 'all';
  loadCatalogBooks();
}

// Rotating search placeholder text
function initRotatingPlaceholder() {
  const placeholders = [
    "Search 'Designing Data-Intensive Applications'...",
    "Search 'Python Crash Course'...",
    "Search 'Deep Learning (Goodfellow)'...",
    "Search 'Algorithms (CLRS)'...",
    "Search 'Atomic Habits' or author name...",
    "Search ISBN or Accession No..."
  ];
  let idx = 0;
  const input = document.getElementById('hero-search-input');
  if (!input) return;

  if (window.placeholderInterval) clearInterval(window.placeholderInterval);
  window.placeholderInterval = setInterval(() => {
    if (document.activeElement !== input && !input.value) {
      idx = (idx + 1) % placeholders.length;
      input.placeholder = placeholders[idx];
    }
  }, 4000);
}

// As-you-type instant floating results
function initAsYouTypeSearch() {
  const input = document.getElementById('hero-search-input');
  const panel = document.getElementById('instant-search-panel');
  const clearBtn = document.getElementById('hero-search-clear');
  if (!input || !panel) return;

  let debounceTimeout = null;

  input.addEventListener('input', () => {
    const val = input.value.trim();
    if (clearBtn) clearBtn.style.display = val ? 'flex' : 'none';

    if (debounceTimeout) clearTimeout(debounceTimeout);

    if (val.length < 2) {
      panel.classList.remove('active');
      return;
    }

    debounceTimeout = setTimeout(async () => {
      try {
        const res = await fetch(`/api/books?q=${encodeURIComponent(val)}&limit=6`);
        const data = await res.json();

        if (data.success && data.books && data.books.length > 0) {
          panel.innerHTML = data.books.map(b => `
            <div class="instant-result-item" onclick="openBookDrawer(${b.id})">
              <div class="instant-thumb">${getBookCoverHTML(b.title, b.author, b.category, 60, 80)}</div>
              <div class="instant-info">
                <div class="instant-title">${b.title}</div>
                <div class="instant-author">by ${b.author}</div>
                <div style="display:flex; gap:6px; margin-top:4px;">
                  <span class="badge ${b.available_copies > 0 ? 'badge-success' : 'badge-danger'}">
                    ${b.available_copies > 0 ? `${b.available_copies} available` : 'Out on loan'}
                  </span>
                  <span class="badge badge-neutral">${b.shelf_location}</span>
                </div>
              </div>
            </div>
          `).join('') + `
            <div style="padding:10px 14px; text-align:center; border-top:1px solid var(--border-subtle);">
              <a href="javascript:void(0)" onclick="executeFullSearch()" style="font-size:0.85rem; font-weight:600;">
                View all results for "${val}" →
              </a>
            </div>
          `;
          panel.classList.add('active');
        } else {
          panel.innerHTML = `<div style="padding:20px; text-align:center; color:var(--text-muted);">No books found matching "${val}".</div>`;
          panel.classList.add('active');
        }
      } catch (e) {
        console.error('Instant search error:', e);
      }
    }, 200);
  });

  // Close panel when clicking outside
  document.addEventListener('click', (e) => {
    if (!input.contains(e.target) && !panel.contains(e.target)) {
      panel.classList.remove('active');
    }
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      panel.classList.remove('active');
      executeFullSearch();
    }
  });
}

function clearHeroSearch() {
  const input = document.getElementById('hero-search-input');
  if (input) {
    input.value = '';
    document.getElementById('hero-search-clear').style.display = 'none';
    document.getElementById('instant-search-panel').classList.remove('active');
    window.catalogPage = 1;
    loadCatalogBooks();
  }
}

function executeFullSearch() {
  const panel = document.getElementById('instant-search-panel');
  if (panel) panel.classList.remove('active');
  window.catalogPage = 1;
  loadCatalogBooks();
}

function applyQuickFilter(filter, btn) {
  document.querySelectorAll('#filter-chips-container .chip-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  window.currentQuickFilter = filter;
  window.catalogPage = 1;
  loadCatalogBooks();
}

// Load Books Catalog from Backend SQLite
async function loadCatalogBooks() {
  const grid = document.getElementById('books-grid-container');
  if (!grid) return;

  const searchInput = document.getElementById('hero-search-input');
  const sortSelect = document.getElementById('catalog-sort-select');
  const q = searchInput ? searchInput.value.trim() : '';
  const sort = sortSelect ? sortSelect.value : 'popular';
  const filter = window.currentQuickFilter || 'all';

  let url = `/api/books?page=${window.catalogPage || 1}&limit=20&sort=${sort}`;
  if (q) url += `&q=${encodeURIComponent(q)}`;

  if (filter === 'available') {
    url += `&availability=available`;
  } else if (filter === 'new') {
    url += `&availability=new`;
  } else if (filter !== 'all') {
    url += `&category=${encodeURIComponent(filter)}`;
  }

  try {
    const res = await fetch(url);
    const data = await res.json();

    if (!data.success || !data.books || data.books.length === 0) {
      grid.innerHTML = `
        <div class="empty-state-card" style="grid-column: 1 / -1;">
          <img src="/images/empty-states/empty-reading-1.jpg"
               alt="No books found illustration"
               class="empty-state-img"
               loading="lazy" />
          <h3 style="color:var(--text-primary); margin-bottom:4px;">No books found matching your search</h3>
          <p style="margin-bottom:16px;">Try adjusting keywords, checking spelling, or clearing active filters.</p>
          <button class="btn btn-secondary btn-sm" onclick="clearHeroSearch()">Clear Filters</button>
        </div>
      `;
      renderPagination(0, 1, 20);
      return;
    }

    grid.innerHTML = data.books.map(b => {
      let availabilityBadge = `<span class="badge badge-success">🟢 ${b.available_copies} Available</span>`;
      if (b.available_copies === 1) {
        availabilityBadge = `<span class="badge badge-warning">🟡 Only 1 left</span>`;
      } else if (b.available_copies === 0) {
        availabilityBadge = `<span class="badge badge-danger">🔴 Out (Reserve)</span>`;
      }

      return `
        <div class="book-card" onclick="openBookDrawer(${b.id})">
          <div class="book-cover-wrap">
            <div class="book-card-badge">${availabilityBadge}</div>
            ${getBookCoverHTML(b.title, b.author, b.category, 300, 400)}
          </div>
          <div class="book-card-content">
            <div>
              <div class="book-card-title" title="${b.title}">${b.title}</div>
              <div class="book-card-author">by ${b.author}</div>
            </div>
            <div class="book-card-meta">
              <span>📍 ${b.shelf_location}</span>
              <span>${b.edition} Ed.</span>
            </div>
          </div>
        </div>
      `;
    }).join('');

    renderPagination(data.pagination.total, data.pagination.page, data.pagination.limit);
  } catch (err) {
    grid.innerHTML = `<div style="grid-column:1/-1; padding:40px; text-align:center; color:var(--color-danger);">Failed to load books. Please check server.</div>`;
  }
}

function renderPagination(total, currentPage, limit) {
  const container = document.getElementById('catalog-pagination-container');
  if (!container) return;

  const totalPages = Math.ceil(total / limit);
  if (totalPages <= 1) {
    container.innerHTML = '';
    return;
  }

  let html = '';
  if (currentPage > 1) {
    html += `<button class="btn btn-secondary btn-sm" onclick="goToCatalogPage(${currentPage - 1})">← Prev</button>`;
  }

  for (let p = Math.max(1, currentPage - 2); p <= Math.min(totalPages, currentPage + 2); p++) {
    html += `
      <button class="btn ${p === currentPage ? 'btn-primary' : 'btn-secondary'} btn-sm"
              onclick="goToCatalogPage(${p})">${p}</button>
    `;
  }

  if (currentPage < totalPages) {
    html += `<button class="btn btn-secondary btn-sm" onclick="goToCatalogPage(${currentPage + 1})">Next →</button>`;
  }

  container.innerHTML = html;
}

function goToCatalogPage(page) {
  window.catalogPage = page;
  loadCatalogBooks();
  window.scrollTo({ top: 380, behavior: 'smooth' });
}

// Slide-Over Drawer: Book Detail & 1-Click Hold / Reserve
async function openBookDrawer(bookId) {
  try {
    const res = await fetch(`/api/books/${bookId}`);
    const data = await res.json();
    if (!data.success) {
      showToast('Book details not found', 'danger');
      return;
    }

    const b = data.book;
    const isAvailable = b.available_copies > 0;
    const isReservedByMe = b.user_reserved;

    const drawerHtml = `
      <div class="drawer-header">
        <span class="badge ${isAvailable ? 'badge-success' : 'badge-danger'}">
          ${isAvailable ? `🟢 ${b.available_copies} of ${b.total_copies} Copies Available` : '🔴 All Copies Currently Issued'}
        </span>
        <button class="btn btn-ghost btn-icon" onclick="window.closeDrawer()">${getIcon('x')}</button>
      </div>
      <div class="drawer-body">
        <div style="display:flex; gap:20px; margin-bottom:20px;">
          <div style="width:130px; height:180px; flex-shrink:0;">
            ${getBookCoverHTML(b.title, b.author, b.category, 260, 360)}
          </div>
          <div style="flex:1;">
            <h2 style="font-size:1.3rem; margin-bottom:6px;">${b.title}</h2>
            <p style="font-size:0.95rem; font-weight:600; color:var(--text-secondary); margin-bottom:12px;">by ${b.author}</p>
            <div style="display:flex; flex-direction:column; gap:6px; font-size:0.85rem; color:var(--text-secondary);">
              <div><strong>Category:</strong> ${b.category}</div>
              <div><strong>Department:</strong> ${b.department}</div>
              <div><strong>Publisher:</strong> ${b.publisher || 'N/A'} (${b.year})</div>
              <div><strong>Edition:</strong> ${b.edition}</div>
              <div><strong>ISBN:</strong> ${b.isbn || 'N/A'}</div>
              <div><strong>Accession:</strong> ${b.accession_no}</div>
            </div>
          </div>
        </div>

        <!-- Shelf Location Callout Card -->
        <div style="background:var(--accent-subtle); border:1px solid var(--accent-primary); border-radius:var(--radius-md); padding:14px 18px; margin-bottom:20px; display:flex; align-items:center; gap:14px;">
          <span style="font-size:1.6rem;">📍</span>
          <div>
            <div style="font-size:0.75rem; text-transform:uppercase; font-weight:700; color:var(--accent-primary);">Physical Shelf Location</div>
            <div style="font-size:1.1rem; font-weight:800; color:var(--text-primary);">${b.shelf_location}</div>
          </div>
        </div>

        <!-- Copy Tracking List -->
        <h4 style="margin-bottom:10px;">Physical Copy Inventory</h4>
        <div style="display:flex; flex-direction:column; gap:8px; margin-bottom:20px;">
          ${(b.copies || []).map(c => `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 12px; background:var(--bg-input); border-radius:var(--radius-sm); font-size:0.85rem;">
              <span><strong>Copy #${c.copy_number}:</strong> <code>${c.barcode}</code></span>
              <span class="badge ${c.status === 'available' ? 'badge-success' : (c.status === 'issued' ? 'badge-warning' : 'badge-danger')}">${c.status}</span>
            </div>
          `).join('')}
        </div>

        <!-- Hold / Reservation Queue Status -->
        ${b.reservations_count > 0 ? `
          <div style="background:var(--color-warning-bg); border:1px solid rgba(245,158,11,0.3); border-radius:var(--radius-md); padding:12px 16px; font-size:0.85rem; color:var(--color-warning); margin-bottom:20px;">
            ⏳ ${b.reservations_count} member(s) currently waiting in reservation queue.
          </div>
        ` : ''}
      </div>
      <div class="drawer-footer">
        ${isReservedByMe ? `
          <button class="btn btn-danger" onclick="cancelReservation(${b.user_reservation_id}, ${b.id})">Cancel My Reservation</button>
        ` : (
          isAvailable ? `
            <button class="btn btn-secondary" onclick="window.closeDrawer()">Close</button>
            <button class="btn btn-primary" onclick="reserveBook(${b.id})">📌 Place Ready Hold</button>
          ` : `
            <button class="btn btn-secondary" onclick="window.closeDrawer()">Close</button>
            <button class="btn btn-primary" onclick="reserveBook(${b.id})">⏳ Reserve Next Available Copy</button>
          `
        )}
      </div>
    `;

    window.openDrawer(drawerHtml);
  } catch (err) {
    showToast('Failed to open book drawer', 'danger');
  }
}

async function reserveBook(bookId) {
  if (!window.appState.user) {
    window.openLoginModal();
    showToast('Please log in to place a book hold/reservation', 'info');
    return;
  }

  try {
    const res = await fetch('/api/reservations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${window.appState.token}`
      },
      body: JSON.stringify({ bookId })
    });
    const data = await res.json();
    if (data.success) {
      showToast(data.message, 'success');
      openBookDrawer(bookId);
    } else {
      showToast(data.message, 'danger');
    }
  } catch (e) {
    showToast('Failed to place reservation', 'danger');
  }
}

async function cancelReservation(reservationId, bookId) {
  try {
    const res = await fetch(`/api/reservations/${reservationId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${window.appState.token}` }
    });
    const data = await res.json();
    if (data.success) {
      showToast('Reservation cancelled', 'info');
      openBookDrawer(bookId);
    }
  } catch (e) {
    showToast('Failed to cancel reservation', 'danger');
  }
}
