// Universal Command Palette (Ctrl+K) & Keyboard Shortcut Engine

class CommandPalette {
  constructor() {
    this.isOpen = false;
    this.selectedIndex = 0;
    this.items = [];
    this.initDOM();
    this.bindEvents();
  }

  initDOM() {
    let backdrop = document.getElementById('cmd-palette-backdrop');
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.id = 'cmd-palette-backdrop';
      backdrop.className = 'cmd-palette-backdrop';
      backdrop.innerHTML = `
        <div class="cmd-palette" id="cmd-palette">
          <div class="cmd-input-wrap">
            <span style="color:var(--text-muted);">${getIcon('search')}</span>
            <input type="text" id="cmd-input" class="cmd-input" placeholder="Type a command or search a book..." autocomplete="off" />
            <span class="kbd-shortcut">ESC</span>
          </div>
          <div class="cmd-results" id="cmd-results"></div>
          <div style="padding: 10px 16px; border-top: 1px solid var(--border-subtle); display:flex; justify-content:space-between; font-size:0.75rem; color:var(--text-muted);">
            <span>Navigate: <kbd class="kbd-shortcut">↑</kbd> <kbd class="kbd-shortcut">↓</kbd></span>
            <span>Select: <kbd class="kbd-shortcut">↵</kbd></span>
            <span>Close: <kbd class="kbd-shortcut">ESC</kbd></span>
          </div>
        </div>
      `;
      document.body.appendChild(backdrop);
    }

    this.backdrop = backdrop;
    this.input = document.getElementById('cmd-input');
    this.results = document.getElementById('cmd-results');
  }

  bindEvents() {
    // Global hotkey listener
    window.addEventListener('keydown', (e) => {
      // Ctrl+K or Cmd+K
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        this.toggle();
      } else if (e.key === 'Escape' && this.isOpen) {
        this.close();
      } else if (e.key === '?' && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
        e.preventDefault();
        this.openShortcutsModal();
      }
    });

    this.backdrop.addEventListener('click', (e) => {
      if (e.target === this.backdrop) {
        this.close();
      }
    });

    this.input.addEventListener('input', () => {
      this.filter(this.input.value);
    });

    this.input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        this.moveSelection(1);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        this.moveSelection(-1);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        this.executeSelected();
      }
    });
  }

  open() {
    this.isOpen = true;
    this.backdrop.classList.add('active');
    this.input.value = '';
    this.filter('');
    setTimeout(() => this.input.focus(), 50);
  }

  close() {
    this.isOpen = false;
    this.backdrop.classList.remove('active');
  }

  toggle() {
    if (this.isOpen) this.close();
    else this.open();
  }

  getCommandList() {
    const user = window.appState ? window.appState.user : null;
    const isLibrarian = user && ['librarian', 'admin'].includes(user.role);

    const baseNav = [
      { title: 'Search Catalog / Home', category: 'Navigation', icon: 'search', action: () => window.navigateTo('home') },
      { title: 'My Shelf & Borrowed Books', category: 'Navigation', icon: 'bookmark', action: () => window.navigateTo('shelf') },
      { title: 'Department Leaderboard', category: 'Navigation', icon: 'trophy', action: () => window.navigateTo('leaderboard') },
      { title: 'Suggest / Request New Books', category: 'Navigation', icon: 'sparkles', action: () => window.navigateTo('suggestions') },
      { title: 'Kiosk Terminal Mode', category: 'Navigation', icon: 'terminal', action: () => window.navigateTo('kiosk') }
    ];

    const librarianNav = isLibrarian ? [
      { title: 'Circulation (Scan Issue & Return)', category: 'Circulation', icon: 'repeat', action: () => window.navigateTo('circulation') },
      { title: 'Manage Books Catalog', category: 'Catalog', icon: 'book', action: () => window.navigateTo('books-admin') },
      { title: 'Add New Book', category: 'Catalog', icon: 'plus', action: () => { window.navigateTo('books-admin'); setTimeout(() => window.openAddBookModal && window.openAddBookModal(), 100); } },
      { title: 'Manage Members & ID Cards', category: 'Members', icon: 'users', action: () => window.navigateTo('members-admin') },
      { title: 'Add New Member', category: 'Members', icon: 'plus', action: () => { window.navigateTo('members-admin'); setTimeout(() => window.openAddMemberModal && window.openAddMemberModal(), 100); } },
      { title: 'Overdue Books & Fines', category: 'Circulation', icon: 'dollarSign', action: () => window.navigateTo('fines-admin') },
      { title: 'Manage Reservations Queue', category: 'Circulation', icon: 'clock', action: () => window.navigateTo('reservations-admin') },
      { title: 'Reports & Analytics Dashboard', category: 'Reports', icon: 'barChart', action: () => window.navigateTo('reports-admin') },
      { title: 'Export Overdue List to CSV', category: 'Reports', icon: 'download', action: () => window.open('/api/reports/export/overdue', '_blank') },
      { title: 'System Settings & Backups', category: 'System', icon: 'settings', action: () => window.navigateTo('settings-admin') }
    ] : [];

    const actions = [
      { title: 'Toggle Light / Dark Mode', category: 'Preferences', icon: 'moon', action: () => window.toggleTheme && window.toggleTheme() },
      { title: 'Switch Language: English', category: 'Preferences', icon: 'globe', action: () => window.changeLanguage && window.changeLanguage('en') },
      { title: 'Switch Language: हिन्दी (Hindi)', category: 'Preferences', icon: 'globe', action: () => window.changeLanguage && window.changeLanguage('hi') },
      { title: 'Switch Language: ગુજરાતી (Gujarati)', category: 'Preferences', icon: 'globe', action: () => window.changeLanguage && window.changeLanguage('gu') },
      { title: 'Keyboard Shortcuts Cheat Sheet', category: 'Help', icon: 'helpCircle', action: () => this.openShortcutsModal() }
    ];

    if (user) {
      actions.push({ title: 'Sign Out / Log Out', category: 'Account', icon: 'logOut', action: () => window.logout && window.logout() });
    } else {
      actions.push({ title: 'Log In to Library Account', category: 'Account', icon: 'key', action: () => window.openLoginModal && window.openLoginModal() });
    }

    return [...baseNav, ...librarianNav, ...actions];
  }

  async filter(query) {
    const q = query.toLowerCase().trim();
    const staticCommands = this.getCommandList();

    let matched = staticCommands.filter(c => c.title.toLowerCase().includes(q) || c.category.toLowerCase().includes(q));

    // If typing more than 2 chars, also live search books from SQLite!
    if (q.length >= 2) {
      try {
        const res = await fetch(`/api/books?q=${encodeURIComponent(q)}&limit=5`);
        const data = await res.json();
        if (data.success && data.books && data.books.length > 0) {
          const bookCommands = data.books.map(b => ({
            title: `${b.title} — by ${b.author}`,
            category: `Book (${b.available_copies > 0 ? `${b.available_copies} available` : 'Out on loan'})`,
            icon: 'book',
            action: () => {
              if (window.openBookDrawer) window.openBookDrawer(b.id);
            }
          }));
          matched = [...matched, ...bookCommands];
        }
      } catch (e) {}
    }

    this.items = matched;
    this.selectedIndex = 0;
    this.render();
  }

  render() {
    if (this.items.length === 0) {
      this.results.innerHTML = `<div style="padding:24px; text-align:center; color:var(--text-muted);">No matching commands or books found.</div>`;
      return;
    }

    this.results.innerHTML = this.items.map((item, index) => `
      <div class="cmd-item ${index === this.selectedIndex ? 'selected' : ''}" data-index="${index}">
        <div class="item-title">
          <span style="color:var(--accent-primary); display:flex;">${getIcon(item.icon)}</span>
          <span>${item.title}</span>
        </div>
        <span class="item-badge">${item.category}</span>
      </div>
    `).join('');

    // Attach click handlers
    this.results.querySelectorAll('.cmd-item').forEach(el => {
      el.addEventListener('click', () => {
        const idx = parseInt(el.dataset.index, 10);
        this.selectedIndex = idx;
        this.executeSelected();
      });
    });
  }

  moveSelection(delta) {
    if (this.items.length === 0) return;
    this.selectedIndex = (this.selectedIndex + delta + this.items.length) % this.items.length;
    this.render();
    const selectedEl = this.results.querySelector(`.cmd-item[data-index="${this.selectedIndex}"]`);
    if (selectedEl) selectedEl.scrollIntoView({ block: 'nearest' });
  }

  executeSelected() {
    if (this.items[this.selectedIndex]) {
      const item = this.items[this.selectedIndex];
      this.close();
      item.action();
    }
  }

  openShortcutsModal() {
    const modalHtml = `
      <div class="modal-header">
        <h3>⌨️ Keyboard Shortcuts</h3>
        <button class="btn btn-ghost btn-icon" onclick="window.closeModal()">${getIcon('x')}</button>
      </div>
      <div class="modal-body">
        <div style="display:flex; flex-direction:column; gap:12px;">
          <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid var(--border-subtle);">
            <span>Open Command Palette & Universal Search</span>
            <kbd class="kbd-shortcut">Ctrl + K</kbd>
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid var(--border-subtle);">
            <span>Open this Shortcuts Cheat Sheet</span>
            <kbd class="kbd-shortcut">?</kbd>
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid var(--border-subtle);">
            <span>Close active modal or drawer</span>
            <kbd class="kbd-shortcut">ESC</kbd>
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid var(--border-subtle);">
            <span>Circulation Scan Input Focus</span>
            <kbd class="kbd-shortcut">Alt + S</kbd>
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 0;">
            <span>Toggle Light / Dark Mode</span>
            <kbd class="kbd-shortcut">Alt + T</kbd>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-primary" onclick="window.closeModal()">Got it</button>
      </div>
    `;
    window.openModal(modalHtml);
  }
}

// Instantiate globally
window.cmdPalette = new CommandPalette();
