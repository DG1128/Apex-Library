// Master Application Controller, Router, Auth & State Manager

window.appState = {
  user: null,
  token: localStorage.getItem('lms_token') || null,
  theme: localStorage.getItem('lms_theme') || (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'),
  accent: localStorage.getItem('lms_accent') || 'violet',
  currentRoute: 'home'
};

// Initialize App on DOM load
document.addEventListener('DOMContentLoaded', async () => {
  // Apply theme & accent
  document.documentElement.setAttribute('data-theme', window.appState.theme);
  document.documentElement.setAttribute('data-accent', window.appState.accent);

  // Register PWA Service Worker for offline capability
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }

  // Restore user session if token exists
  if (window.appState.token) {
    try {
      const res = await fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${window.appState.token}` }
      });
      const data = await res.json();
      if (data.success && data.user) {
        window.appState.user = data.user;
        // Check if admin is required to change password on first login
        if (data.user.force_password_change) {
          openForcePasswordChangeModal();
        }
      } else {
        logout(false);
      }
    } catch (e) {
      console.warn('Offline mode: Using cached session credentials.');
    }
  }

  // Render App Shell Navigation
  updateShellUI();

  // Route to initial page based on URL hash or default 'home'
  const hash = window.location.hash.replace('#/', '').replace('#', '');
  navigateTo(hash || 'home');

  // Handle browser back/forward buttons
  window.addEventListener('popstate', () => {
    const route = window.location.hash.replace('#/', '').replace('#', '') || 'home';
    navigateTo(route, false);
  });
});

// Update Sidebar, Topbar, and Mobile Navigation based on Role
function updateShellUI() {
  const user = window.appState.user;
  const isLibrarian = user && ['librarian', 'admin'].includes(user.role);

  // 1. Sidebar Nav
  const navContainer = document.getElementById('sidebar-nav-container');
  if (navContainer) {
    navContainer.innerHTML = `
      <div class="nav-section-title">Explore</div>
      <a href="#/home" class="nav-item ${window.appState.currentRoute === 'home' ? 'active' : ''}" onclick="navigateTo('home')">
        <span class="icon">${getIcon('search')}</span>
        <span>Catalog Search</span>
      </a>
      <a href="#/shelf" class="nav-item ${window.appState.currentRoute === 'shelf' ? 'active' : ''}" onclick="navigateTo('shelf')">
        <span class="icon">${getIcon('bookmark')}</span>
        <span>My Shelf</span>
      </a>
      <a href="#/leaderboard" class="nav-item ${window.appState.currentRoute === 'leaderboard' ? 'active' : ''}" onclick="navigateTo('leaderboard')">
        <span class="icon">${getIcon('trophy')}</span>
        <span>Leaderboard</span>
      </a>
      <a href="#/suggestions" class="nav-item ${window.appState.currentRoute === 'suggestions' ? 'active' : ''}" onclick="navigateTo('suggestions')">
        <span class="icon">${getIcon('sparkles')}</span>
        <span>Suggest Books</span>
      </a>
      <a href="#/kiosk" class="nav-item ${window.appState.currentRoute === 'kiosk' ? 'active' : ''}" onclick="navigateTo('kiosk')">
        <span class="icon">${getIcon('terminal')}</span>
        <span>Kiosk Terminal</span>
      </a>

      ${isLibrarian ? `
        <div class="nav-section-title">Librarian Management</div>
        <a href="#/circulation" class="nav-item ${window.appState.currentRoute === 'circulation' ? 'active' : ''}" onclick="navigateTo('circulation')">
          <span class="icon">${getIcon('repeat')}</span>
          <span>Circulation Desk</span>
        </a>
        <a href="#/books-admin" class="nav-item ${window.appState.currentRoute === 'books-admin' ? 'active' : ''}" onclick="navigateTo('books-admin')">
          <span class="icon">${getIcon('book')}</span>
          <span>Books Inventory</span>
        </a>
        <a href="#/members-admin" class="nav-item ${window.appState.currentRoute === 'members-admin' ? 'active' : ''}" onclick="navigateTo('members-admin')">
          <span class="icon">${getIcon('users')}</span>
          <span>Members & Cards</span>
        </a>
        <a href="#/fines-admin" class="nav-item ${window.appState.currentRoute === 'fines-admin' ? 'active' : ''}" onclick="navigateTo('fines-admin')">
          <span class="icon">${getIcon('dollarSign')}</span>
          <span>Overdue & Fines</span>
        </a>
        <a href="#/reservations-admin" class="nav-item ${window.appState.currentRoute === 'reservations-admin' ? 'active' : ''}" onclick="navigateTo('reservations-admin')">
          <span class="icon">${getIcon('clock')}</span>
          <span>Reservations</span>
        </a>
        <a href="#/reports-admin" class="nav-item ${window.appState.currentRoute === 'reports-admin' ? 'active' : ''}" onclick="navigateTo('reports-admin')">
          <span class="icon">${getIcon('barChart')}</span>
          <span>Reports & Stats</span>
        </a>
        <a href="#/settings-admin" class="nav-item ${window.appState.currentRoute === 'settings-admin' ? 'active' : ''}" onclick="navigateTo('settings-admin')">
          <span class="icon">${getIcon('settings')}</span>
          <span>Settings & Backup</span>
        </a>
      ` : ''}
    `;
  }

  // 2. User Profile / Login Area in Topbar
  const userArea = document.getElementById('topbar-user-area');
  if (userArea) {
    if (user) {
      userArea.innerHTML = `
        <div style="display:flex; align-items:center; gap:10px;">
          <div style="width:34px; height:34px; border-radius:var(--radius-pill); background:var(--accent-subtle); color:var(--accent-primary); display:flex; align-items:center; justify-content:center; font-weight:800; font-size:0.9rem;">
            ${user.name.charAt(0)}
          </div>
          <div style="text-align:left; line-height:1.2;" class="no-mobile">
            <div style="font-size:0.85rem; font-weight:700;">${user.name}</div>
            <div style="font-size:0.7rem; color:var(--text-muted); text-transform:capitalize;">${user.role} (${user.member_id})</div>
          </div>
          <button class="btn btn-ghost btn-icon" title="Sign Out" onclick="logout()">${getIcon('logOut')}</button>
        </div>
      `;
    } else {
      userArea.innerHTML = `
        <button class="btn btn-primary btn-sm" onclick="openLoginModal()">
          ${getIcon('key')} Log In
        </button>
      `;
    }
  }

  // 3. Mobile Navigation Bottom Bar
  const mobileNav = document.getElementById('mobile-bottom-nav');
  if (mobileNav) {
    mobileNav.innerHTML = `
      <a href="#/home" class="mobile-nav-item ${window.appState.currentRoute === 'home' ? 'active' : ''}" onclick="navigateTo('home')">
        ${getIcon('search')}
        <span>Search</span>
      </a>
      <a href="#/shelf" class="mobile-nav-item ${window.appState.currentRoute === 'shelf' ? 'active' : ''}" onclick="navigateTo('shelf')">
        ${getIcon('bookmark')}
        <span>My Shelf</span>
      </a>
      ${isLibrarian ? `
        <a href="#/circulation" class="mobile-nav-item ${window.appState.currentRoute === 'circulation' ? 'active' : ''}" onclick="navigateTo('circulation')">
          ${getIcon('repeat')}
          <span>Circulate</span>
        </a>
        <a href="#/reports-admin" class="mobile-nav-item ${window.appState.currentRoute === 'reports-admin' ? 'active' : ''}" onclick="navigateTo('reports-admin')">
          ${getIcon('barChart')}
          <span>Reports</span>
        </a>
      ` : `
        <a href="#/leaderboard" class="mobile-nav-item ${window.appState.currentRoute === 'leaderboard' ? 'active' : ''}" onclick="navigateTo('leaderboard')">
          ${getIcon('trophy')}
          <span>Leaders</span>
        </a>
      `}
      <a href="javascript:void(0)" class="mobile-nav-item" onclick="window.cmdPalette.open()">
        ${getIcon('sparkles')}
        <span>Actions</span>
      </a>
    `;
  }
}

// Router
function navigateTo(route, updateHistory = true) {
  window.appState.currentRoute = route;
  if (updateHistory) {
    window.location.hash = `#/${route}`;
  }

  updateShellUI();

  // Close any active drawers or modals
  closeDrawer();
  closeModal();

  // Route Dispatcher
  switch (route) {
    case 'home':
      renderStudentHome();
      break;
    case 'shelf':
      renderMyShelf();
      break;
    case 'circulation':
      renderCirculation();
      break;
    case 'books-admin':
      renderBooksAdmin();
      break;
    case 'members-admin':
      renderMembersAdmin();
      break;
    case 'fines-admin':
      renderFinesAdmin();
      break;
    case 'reservations-admin':
      renderReservations();
      break;
    case 'reports-admin':
      renderReportsAdmin();
      break;
    case 'suggestions':
      renderSuggestions();
      break;
    case 'leaderboard':
      renderLeaderboard();
      break;
    case 'settings-admin':
      renderSettingsAdmin();
      break;
    case 'kiosk':
      renderKiosk();
      break;
    default:
      renderStudentHome();
      break;
  }

  // Scroll to top
  const main = document.querySelector('.app-main');
  if (main) main.scrollTop = 0;
}

// Theme Switcher (Dark / Light)
function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', next);
  window.appState.theme = next;
  localStorage.setItem('lms_theme', next);
  showToast(`Switched to ${next} mode`, 'info');
}

// Global Modals
function openModal(htmlContent) {
  const backdrop = document.getElementById('global-modal-backdrop');
  const body = document.getElementById('global-modal-content');
  if (backdrop && body) {
    body.innerHTML = htmlContent;
    backdrop.classList.add('active');
  }
}

function closeModal() {
  const backdrop = document.getElementById('global-modal-backdrop');
  if (backdrop) backdrop.classList.remove('active');
}

// Global Slide-Over Drawer
function openDrawer(htmlContent) {
  const backdrop = document.getElementById('global-drawer-backdrop');
  const drawer = document.getElementById('global-drawer');
  if (backdrop && drawer) {
    drawer.innerHTML = htmlContent;
    backdrop.classList.add('active');
    drawer.classList.add('active');
  }
}

function closeDrawer() {
  const backdrop = document.getElementById('global-drawer-backdrop');
  const drawer = document.getElementById('global-drawer');
  if (backdrop && drawer) {
    backdrop.classList.remove('active');
    drawer.classList.remove('active');
  }
}

// Toast Notifications Stack
function showToast(message, type = 'info', undoAction = null) {
  const container = document.getElementById('global-toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'toast';

  let icon = getIcon('checkCircle');
  if (type === 'danger') icon = getIcon('alertCircle');
  else if (type === 'warning') icon = getIcon('alertCircle');

  toast.innerHTML = `
    <div class="toast-message">
      <span style="color:${type === 'danger' ? 'var(--color-danger)' : (type === 'success' ? 'var(--color-success)' : 'var(--accent-primary)')};">${icon}</span>
      <span>${message}</span>
    </div>
    ${undoAction ? `<button class="toast-undo-btn" id="toast-undo-btn">Undo</button>` : `<button class="btn btn-ghost btn-sm" onclick="this.parentElement.remove()">${getIcon('x')}</button>`}
  `;

  container.appendChild(toast);
  setTimeout(() => toast.classList.add('active'), 20);

  if (undoAction) {
    const undoBtn = toast.querySelector('#toast-undo-btn');
    if (undoBtn) {
      undoBtn.addEventListener('click', () => {
        undoAction();
        toast.remove();
      });
    }
  }

  setTimeout(() => {
    toast.classList.remove('active');
    setTimeout(() => toast.remove(), 300);
  }, 4500);
}

// Login Modal
function openLoginModal() {
  const modalHtml = `
    <div class="modal-header">
      <h3>🔑 Log In to Library Account</h3>
      <button class="btn btn-ghost btn-icon" onclick="window.closeModal()">${getIcon('x')}</button>
    </div>
    <form id="login-form" onsubmit="submitLogin(event)">
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">Member ID / Email *</label>
          <input type="text" name="username" class="input" required placeholder="e.g. STU2024001, FAC001, or ADMIN001" autofocus />
        </div>
        <div class="form-group">
          <label class="form-label">Password *</label>
          <input type="password" name="password" class="input" required placeholder="Enter your password" />
        </div>

        <div style="background:var(--bg-input); border-radius:var(--radius-md); padding:12px; font-size:0.75rem; color:var(--text-secondary); margin-top:10px;">
          <strong>Demo Logins:</strong><br/>
          • Student: <code>STU2024001</code> / <code>password123</code><br/>
          • Faculty: <code>FAC001</code> / <code>password123</code><br/>
          • Librarian: <code>LIB001</code> / <code>password123</code><br/>
          • Admin: <code>ADMIN001</code> / <code>admin127</code>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" onclick="window.closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">Sign In</button>
      </div>
    </form>
  `;

  openModal(modalHtml);
}

async function submitLogin(e) {
  e.preventDefault();
  const form = e.target;
  const formData = new FormData(form);
  const creds = Object.fromEntries(formData.entries());

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(creds)
    });
    const data = await res.json();

    if (data.success) {
      window.appState.token = data.token;
      window.appState.user = data.user;
      localStorage.setItem('lms_token', data.token);

      closeModal();
      showToast(`Welcome back, ${data.user.name}!`, 'success');
      updateShellUI();

      if (data.user.force_password_change) {
        openForcePasswordChangeModal();
      } else {
        navigateTo(window.appState.currentRoute || 'home');
      }
    } else {
      showToast(data.message, 'danger');
    }
  } catch (err) {
    showToast('Login failed: ' + err.message, 'danger');
  }
}

// Forced First-Login Password Change Modal
function openForcePasswordChangeModal() {
  const modalHtml = `
    <div class="modal-header">
      <h3 style="color:var(--color-warning);">🔒 Password Reset Required</h3>
    </div>
    <form id="force-password-form" onsubmit="submitForcePasswordChange(event)">
      <div class="modal-body">
        <div style="background:var(--color-warning-bg); border:1px solid rgba(245,158,11,0.3); border-radius:var(--radius-md); padding:12px 16px; font-size:0.85rem; color:var(--color-warning); margin-bottom:16px;">
          For institutional security, default administrator accounts must set a new secure password upon initial login.
        </div>
        <div class="form-group">
          <label class="form-label">New Password (Min 6 characters) *</label>
          <input type="password" name="newPassword" class="input" required minlength="6" autofocus />
        </div>
      </div>
      <div class="modal-footer">
        <button type="submit" class="btn btn-primary">Save New Password</button>
      </div>
    </form>
  `;

  openModal(modalHtml);
}

async function submitForcePasswordChange(e) {
  e.preventDefault();
  const form = e.target;
  const newPassword = form.newPassword.value;

  try {
    const res = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${window.appState.token}`
      },
      body: JSON.stringify({ newPassword })
    });
    const data = await res.json();
    if (data.success) {
      showToast('Password updated securely!', 'success');
      closeModal();
      navigateTo('reports-admin');
    } else {
      showToast(data.message, 'danger');
    }
  } catch (err) {
    showToast('Failed to update password', 'danger');
  }
}

// Image Credits Modal (Unsplash & Pexels Attribution)
async function openImageCreditsModal() {
  try {
    let images = [];
    const res = await fetch('/images/images.json');
    if (res.ok) {
      images = await res.json();
    }

    const html = `
      <div class="modal-header">
        <div style="display:flex; align-items:center; gap:10px;">
          <span style="font-size:1.3rem;">📷</span>
          <div>
            <h3 style="margin:0;">Stock Photography Credits</h3>
            <p style="font-size:0.8rem; color:var(--text-muted); margin:0;">Free photography sourced from Unsplash & Pexels under open licenses</p>
          </div>
        </div>
        <button class="btn btn-ghost btn-icon" onclick="closeModal()">${getIcon('x')}</button>
      </div>
      <div class="modal-body" style="padding:16px 20px;">
        <p style="font-size:0.85rem; color:var(--text-secondary); margin-bottom:16px;">
          All UI imagery is downloaded for 100% offline self-containment. Sincere thanks to the generous photographers below:
        </p>
        <div class="credits-grid">
          ${images.length > 0 ? images.map(img => `
            <div class="credit-card">
              <img src="${img.path}" alt="${img.alt || img.title}" class="credit-thumb" loading="lazy" />
              <div class="credit-info">
                <div class="credit-title" title="${img.title}">${img.title}</div>
                <div class="credit-author">
                  Photo by <a href="${img.photographer_url}" target="_blank" rel="noopener noreferrer" style="color:var(--accent-primary); font-weight:600;">${img.photographer}</a> on <strong>${img.api}</strong>
                </div>
              </div>
            </div>
          `).join('') : `
            <div style="grid-column:1/-1; padding:20px; text-align:center; color:var(--text-muted);">
              Run <code>npm run fetch-images</code> to download and generate photography credits.
            </div>
          `}
        </div>
      </div>
      <div class="modal-footer" style="display:flex; justify-content:space-between; align-items:center;">
        <span style="font-size:0.8rem; color:var(--text-muted);">Apex LMS • Open Source</span>
        <button class="btn btn-secondary btn-sm" onclick="closeModal()">Close</button>
      </div>
    `;

    openModal(html);
  } catch (err) {
    showToast('Failed to load image credits', 'danger');
  }
}

// Global Exports
window.openModal = openModal;
window.closeModal = closeModal;
window.openDrawer = openDrawer;
window.closeDrawer = closeDrawer;
window.showToast = showToast;
window.openLoginModal = openLoginModal;
window.openImageCreditsModal = openImageCreditsModal;
window.logout = logout;
window.navigateTo = navigateTo;
window.toggleTheme = toggleTheme;

