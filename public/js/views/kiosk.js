// Dedicated Fullscreen Kiosk Mode View for Physical Library Terminals

let kioskTimerInterval = null;
let kioskRemainingSeconds = 60;

async function renderKiosk() {
  const container = document.getElementById('main-view-container');
  if (!container) return;

  container.innerHTML = `
    <div class="kiosk-wrapper">
      <!-- Kiosk Header -->
      <div class="kiosk-header">
        <div style="display:flex; align-items:center; gap:14px;">
          <div class="brand-logo" style="width:46px; height:46px; font-size:1.4rem;">
            ${getIcon('book')}
          </div>
          <div>
            <h1 style="font-size:1.5rem; margin-bottom:2px;">Apex Central Library • Touch Terminal</h1>
            <p style="font-size:0.85rem; color:var(--text-secondary);">Student Self-Search Kiosk</p>
          </div>
        </div>
        <div style="display:flex; align-items:center; gap:16px;">
          <div style="text-align:right;">
            <div style="font-size:0.75rem; color:var(--text-muted);">Session Resets In</div>
            <div id="kiosk-countdown-sec" style="font-size:1.2rem; font-weight:800; color:var(--accent-primary);">60s</div>
          </div>
          <button class="btn btn-secondary" onclick="window.navigateTo('home')">Exit Kiosk</button>
        </div>
      </div>

      <!-- Inactivity Progress Bar -->
      <div style="background:var(--border-subtle); height:4px; border-radius:2px; margin-bottom:30px; overflow:hidden;">
        <div id="kiosk-progress-bar" class="kiosk-timer-bar"></div>
      </div>

      <!-- Huge Search Bar -->
      <div style="max-width:840px; margin:0 auto 30px; width:100%;">
        <div class="search-bar-box" style="padding:14px 22px; border-width:3px;">
          <span style="font-size:1.8rem; margin-right:12px; color:var(--accent-primary);">${getIcon('search')}</span>
          <input type="text" id="kiosk-search-input" class="search-main-input" style="font-size:1.4rem;"
                 placeholder="Touch here to search title, subject, author, or rack..."
                 autocomplete="off" autofocus />
          <button class="btn btn-ghost btn-sm" onclick="resetKioskSession()">${getIcon('refreshCw')} Reset</button>
        </div>

        <!-- Quick Subject Chips -->
        <div class="filter-chips" style="margin-top:16px;" id="kiosk-chips">
          <button class="chip-btn active" onclick="kioskSearchCategory('', this)">All Books</button>
          <button class="chip-btn" onclick="kioskSearchCategory('Computer Science', this)">💻 Computer Science</button>
          <button class="chip-btn" onclick="kioskSearchCategory('Artificial Intelligence & Data', this)">🤖 AI & Data</button>
          <button class="chip-btn" onclick="kioskSearchCategory('Electronics & Hardware', this)">⚡ Electronics</button>
          <button class="chip-btn" onclick="kioskSearchCategory('Mechanical Engineering', this)">⚙️ Mechanical</button>
          <button class="chip-btn" onclick="kioskSearchCategory('Management & Business', this)">📈 Management</button>
          <button class="chip-btn" onclick="kioskSearchCategory('Self Improvement & Career', this)">🌱 Personal Growth</button>
        </div>
      </div>

      <!-- Results Grid -->
      <div id="kiosk-books-grid" class="book-cards-grid" style="grid-template-columns:repeat(auto-fill, minmax(240px, 1fr));">
        <div class="skeleton" style="aspect-ratio:3/4;"></div>
        <div class="skeleton" style="aspect-ratio:3/4;"></div>
        <div class="skeleton" style="aspect-ratio:3/4;"></div>
        <div class="skeleton" style="aspect-ratio:3/4;"></div>
      </div>
    </div>
  `;

  startKioskInactivityTimer();
  initKioskSearch();
  loadKioskBooks('');
}

function startKioskInactivityTimer() {
  if (kioskTimerInterval) clearInterval(kioskTimerInterval);
  kioskRemainingSeconds = 60;

  const bar = document.getElementById('kiosk-progress-bar');
  const secEl = document.getElementById('kiosk-countdown-sec');

  const onActivity = () => {
    kioskRemainingSeconds = 60;
    if (bar) bar.style.width = '100%';
    if (secEl) secEl.textContent = '60s';
  };

  window.addEventListener('mousemove', onActivity, { passive: true });
  window.addEventListener('keydown', onActivity, { passive: true });
  window.addEventListener('touchstart', onActivity, { passive: true });

  kioskTimerInterval = setInterval(() => {
    kioskRemainingSeconds--;
    if (secEl) secEl.textContent = `${kioskRemainingSeconds}s`;
    if (bar) bar.style.width = `${(kioskRemainingSeconds / 60) * 100}%`;

    if (kioskRemainingSeconds <= 0) {
      resetKioskSession();
    }
  }, 1000);
}

function resetKioskSession() {
  kioskRemainingSeconds = 60;
  const input = document.getElementById('kiosk-search-input');
  if (input) {
    input.value = '';
    input.focus();
  }
  loadKioskBooks('');
}

function initKioskSearch() {
  const input = document.getElementById('kiosk-search-input');
  if (!input) return;

  let debounceTimeout = null;
  input.addEventListener('input', () => {
    if (debounceTimeout) clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(() => {
      loadKioskBooks(input.value.trim());
    }, 200);
  });
}

function kioskSearchCategory(cat, btn) {
  document.querySelectorAll('#kiosk-chips .chip-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  const input = document.getElementById('kiosk-search-input');
  if (input) input.value = '';
  loadKioskBooks('', cat);
}

async function loadKioskBooks(query = '', category = '') {
  const grid = document.getElementById('kiosk-books-grid');
  if (!grid) return;

  let url = `/api/books?limit=16&sort=popular`;
  if (query) url += `&q=${encodeURIComponent(query)}`;
  if (category) url += `&category=${encodeURIComponent(category)}`;

  try {
    const res = await fetch(url);
    const data = await res.json();

    if (!data.success || !data.books || data.books.length === 0) {
      grid.innerHTML = `<div style="grid-column:1/-1; padding:60px; text-align:center; color:var(--text-muted);"><h3>No books found. Please ask the librarian for assistance.</h3></div>`;
      return;
    }

    grid.innerHTML = data.books.map(b => `
      <div class="book-card" onclick="openBookDrawer(${b.id})">
        <div class="book-cover-wrap">
          <div class="book-card-badge">
            <span class="badge ${b.available_copies > 0 ? 'badge-success' : 'badge-danger'}">
              ${b.available_copies > 0 ? `🟢 ${b.available_copies} In Library` : '🔴 All Issued'}
            </span>
          </div>
          ${generateBookCoverSVG(b.title, b.author, b.category, 300, 400)}
        </div>
        <div class="book-card-content">
          <div>
            <div class="book-card-title">${b.title}</div>
            <div class="book-card-author">by ${b.author}</div>
          </div>
          <div style="background:var(--accent-subtle); padding:6px 10px; border-radius:6px; font-size:0.8rem; font-weight:700; color:var(--accent-primary); margin-top:8px;">
            📍 ${b.shelf_location}
          </div>
        </div>
      </div>
    `).join('');
  } catch (e) {
    grid.innerHTML = `<div style="grid-column:1/-1; padding:40px; text-align:center;">Failed to load catalog.</div>`;
  }
}
