// Student & Faculty "My Shelf" View with Circular Countdown Rings & Gamification

async function renderMyShelf() {
  const container = document.getElementById('main-view-container');
  if (!container) return;

  if (!window.appState.user) {
    container.innerHTML = `
      <div style="text-align:center; padding:80px 20px;">
        <div style="margin-bottom:16px;">${getIcon('bookOpen')}</div>
        <h2>Sign in to view your Bookshelf</h2>
        <p style="margin-top:6px; margin-bottom:20px; color:var(--text-secondary);">Track your borrowed books, countdown rings, due dates, renewals, and reading badges.</p>
        <button class="btn btn-primary btn-lg" onclick="window.openLoginModal()">Log In to Library Account</button>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <!-- Header -->
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px;">
      <div>
        <h1 style="font-size:1.8rem;">My Shelf</h1>
        <p style="color:var(--text-secondary);">Active loans, countdown timers, reservations, and reading streak</p>
      </div>
      <button class="btn btn-secondary btn-sm" onclick="loadMyShelfData()">${getIcon('refreshCw')} Refresh</button>
    </div>

    <!-- Reading Streak & Gamification Flame Widget -->
    <div id="shelf-streak-container"></div>

    <!-- Active Borrowed Books Section -->
    <div style="margin-bottom:36px;">
      <h2 style="font-size:1.3rem; margin-bottom:14px; display:flex; align-items:center; gap:8px;">
        <span>📖 Currently Borrowed Books</span>
        <span id="active-loans-count-badge" class="badge badge-neutral">0</span>
      </h2>
      <div id="active-loans-grid" style="display:grid; grid-template-columns:repeat(auto-fill, minmax(360px, 1fr)); gap:18px;">
        <div class="skeleton" style="height:120px; border-radius:var(--radius-lg);"></div>
      </div>
    </div>

    <!-- Unpaid Fines Alert (if any) -->
    <div id="shelf-fines-alert" style="display:none; margin-bottom:30px;"></div>

    <!-- Two Columns: Active Reservations & Reading Badges -->
    <div class="bento-grid" style="margin-bottom:36px;">
      <div class="bento-col-6">
        <div class="glass-card" style="padding:22px;">
          <h3 style="margin-bottom:14px; display:flex; align-items:center; gap:8px;">
            <span>⏳ My Active Reservations</span>
          </h3>
          <div id="shelf-reservations-list" style="display:flex; flex-direction:column; gap:10px;">
            <div class="skeleton" style="height:60px;"></div>
          </div>
        </div>
      </div>

      <div class="bento-col-6">
        <div class="glass-card" style="padding:22px;">
          <h3 style="margin-bottom:14px; display:flex; align-items:center; gap:8px;">
            <span>🏆 Earned Reading Badges</span>
          </h3>
          <div id="shelf-badges-grid" style="display:grid; grid-template-columns:repeat(auto-fill, minmax(130px, 1fr)); gap:12px;">
            <div class="skeleton" style="height:80px;"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Reading History Section -->
    <div>
      <h3 style="margin-bottom:14px;">📜 Past Reading History</h3>
      <div id="shelf-history-table-container"></div>
    </div>
  `;

  loadMyShelfData();
}

async function loadMyShelfData() {
  try {
    const res = await fetch('/api/circulation/my-loans', {
      headers: { 'Authorization': `Bearer ${window.appState.token}` }
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message);

    // 1. Render Streak Widget
    const streakContainer = document.getElementById('shelf-streak-container');
    if (streakContainer) {
      const streak = data.stats ? data.stats.reading_streak : 0;
      const readCount = data.stats ? data.stats.books_read_count : 0;
      streakContainer.innerHTML = `
        <div class="streak-widget">
          <div class="streak-left">
            <span class="streak-flame">🔥</span>
            <div>
              <div style="font-size:1.15rem; font-weight:800; color:var(--text-primary);">
                ${streak > 0 ? `${streak}-Book Reading Streak Active!` : 'Start your Reading Streak!'}
              </div>
              <div style="font-size:0.85rem; color:var(--text-secondary);">
                You have completed reading <strong>${readCount} books</strong> this semester. Keep it up!
              </div>
            </div>
          </div>
          <button class="btn btn-secondary btn-sm" onclick="window.navigateTo('leaderboard')">
            ${getIcon('trophy')} Leaderboard
          </button>
        </div>
      `;
    }

    // 2. Render Active Loans
    const loansGrid = document.getElementById('active-loans-grid');
    const loansBadge = document.getElementById('active-loans-count-badge');
    if (loansBadge) loansBadge.textContent = data.active_loans.length;

    if (loansGrid) {
      if (data.active_loans.length === 0) {
        loansGrid.innerHTML = `
          <div style="grid-column:1/-1; padding:40px; text-align:center; background:var(--bg-card); border-radius:var(--radius-lg); color:var(--text-muted);">
            <div style="margin-bottom:8px;">${getIcon('book')}</div>
            <p>You currently have no borrowed books.</p>
            <button class="btn btn-primary btn-sm" style="margin-top:12px;" onclick="window.navigateTo('home')">Search Catalog & Borrow</button>
          </div>
        `;
      } else {
        loansGrid.innerHTML = data.active_loans.map(loan => {
          const isOverdue = loan.state === 'overdue';
          const isDueSoon = loan.state === 'due_soon';

          // Circular countdown ring SVG calculations
          const radius = 28;
          const circumference = 2 * Math.PI * radius;
          const strokeOffset = circumference - (loan.progress_percent / 100) * circumference;

          let ringColorClass = '';
          let statePill = `<span class="badge badge-success">On Schedule</span>`;
          if (isOverdue) {
            ringColorClass = 'danger';
            statePill = `<span class="badge badge-danger">⚠️ Overdue (${Math.abs(loan.remaining_days)}d)</span>`;
          } else if (isDueSoon) {
            ringColorClass = 'warning';
            statePill = `<span class="badge badge-warning">⚡ Due Soon (${loan.remaining_days}d)</span>`;
          }

          return `
            <div class="loan-card state-${loan.state}">
              <div class="loan-cover-mini">
                ${getBookCoverHTML(loan.title, loan.author, loan.category, 120, 168)}
              </div>
              <div class="loan-details">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:4px;">
                  <div class="loan-title" title="${loan.title}">${loan.title}</div>
                </div>
                <div class="loan-author">by ${loan.author}</div>
                <div style="display:flex; gap:8px; align-items:center; margin-bottom:10px; font-size:0.8rem; color:var(--text-muted);">
                  <span>Barcode: <code>${loan.copy_barcode}</code></span>
                  <span>•</span>
                  <span>Due: <strong>${loan.due_date.substring(0, 10)}</strong></span>
                </div>
                <div style="display:flex; justify-content:space-between; align-items:center;">
                  ${statePill}
                  <button class="btn btn-secondary btn-sm" onclick="renewMyLoan(${loan.transaction_id})">
                    ${getIcon('refreshCw')} Renew (${loan.renewal_count || 0})
                  </button>
                </div>
              </div>
              <div class="countdown-ring">
                <svg width="68" height="68">
                  <circle class="bg-circle" cx="34" cy="34" r="${radius}"></circle>
                  <circle class="progress-circle ${ringColorClass}" cx="34" cy="34" r="${radius}"
                          stroke-dasharray="${circumference}" stroke-dashoffset="${strokeOffset}"></circle>
                </svg>
                <div class="countdown-text">
                  <div class="countdown-number" style="color:${isOverdue ? 'var(--color-danger)' : (isDueSoon ? 'var(--color-warning)' : 'var(--text-primary)')};">
                    ${Math.abs(loan.remaining_days)}
                  </div>
                  <div class="countdown-label">${isOverdue ? 'd over' : 'd left'}</div>
                </div>
              </div>
            </div>
          `;
        }).join('');
      }
    }

    // 3. Fines Alert
    const finesAlert = document.getElementById('shelf-fines-alert');
    if (finesAlert) {
      if (data.total_fines_owed > 0) {
        finesAlert.style.display = 'block';
        finesAlert.innerHTML = `
          <div style="background:var(--color-danger-bg); border:1px solid rgba(244,63,94,0.3); border-radius:var(--radius-lg); padding:16px 20px; display:flex; justify-content:space-between; align-items:center;">
            <div style="display:flex; align-items:center; gap:12px;">
              <span style="font-size:1.8rem;">⚠️</span>
              <div>
                <strong style="color:var(--color-danger); font-size:1.05rem;">Unpaid Library Fines: ₹${data.total_fines_owed.toFixed(2)}</strong>
                <p style="font-size:0.85rem; color:var(--text-secondary); margin-top:2px;">
                  Please clear your pending fine at the library circulation desk or ask the librarian.
                </p>
              </div>
            </div>
          </div>
        `;
      } else {
        finesAlert.style.display = 'none';
      }
    }

    // 4. Reservations List
    const resList = document.getElementById('shelf-reservations-list');
    if (resList) {
      if (data.reservations.length === 0) {
        resList.innerHTML = `<div style="text-align:center; padding:20px; color:var(--text-muted); font-size:0.85rem;">No active reservations.</div>`;
      } else {
        resList.innerHTML = data.reservations.map(r => `
          <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 14px; background:var(--bg-input); border-radius:var(--radius-md);">
            <div>
              <div style="font-weight:600; font-size:0.9rem;">${r.title}</div>
              <div style="font-size:0.75rem; color:var(--text-muted);">by ${r.author} • Shelf: ${r.shelf_location}</div>
            </div>
            <div style="display:flex; align-items:center; gap:8px;">
              <span class="badge ${r.status === 'ready' ? 'badge-success' : 'badge-warning'}">
                ${r.status === 'ready' ? '🟢 Ready for Pickup' : `⏳ Queue #${r.queue_position || 1}`}
              </span>
              <button class="btn btn-ghost btn-sm" onclick="cancelReservation(${r.id}, ${r.book_id})">${getIcon('x')}</button>
            </div>
          </div>
        `).join('');
      }
    }

    // 5. Badges Showcase
    const badgesGrid = document.getElementById('shelf-badges-grid');
    if (badgesGrid) {
      const allBadges = [
        { key: 'first_borrow', name: 'First Borrow', icon: '🌱', desc: 'Issued your 1st library book' },
        { key: 'bookworm', name: 'Bookworm', icon: '🐛', desc: 'Read 10+ books' },
        { key: 'genre_explorer', name: 'Explorer', icon: '🧭', desc: 'Read books across 3 categories' },
        { key: 'speed_reader', name: 'Speed Reader', icon: '⚡', desc: 'Returned 5 books on time' },
        { key: 'streak_5', name: '5-Streak', icon: '🔥', desc: '5 consecutive on-time returns' },
        { key: 'night_owl', name: 'Scholar', icon: '🦉', desc: 'Consistent top borrower' }
      ];

      const userBadgeKeys = (window.appState.user.badges || []).map(b => b.badge_key);

      badgesGrid.innerHTML = allBadges.map(b => {
        const unlocked = userBadgeKeys.includes(b.key) || (data.stats && data.stats.books_read_count >= 1 && b.key === 'first_borrow');
        return `
          <div style="background:var(--bg-input); border-radius:var(--radius-md); padding:14px; text-align:center; opacity:${unlocked ? '1' : '0.45'}; border:${unlocked ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)'};">
            <div style="font-size:1.8rem; margin-bottom:4px;">${b.icon}</div>
            <div style="font-size:0.85rem; font-weight:700; color:var(--text-primary);">${b.name}</div>
            <div style="font-size:0.7rem; color:var(--text-muted); margin-top:2px;">${b.desc}</div>
            ${unlocked ? `<span class="badge badge-success" style="margin-top:6px; font-size:0.65rem;">Unlocked</span>` : `<span style="font-size:0.65rem; color:var(--text-muted); margin-top:6px; display:inline-block;">Locked</span>`}
          </div>
        `;
      }).join('');
    }

    // 6. History Table
    const histContainer = document.getElementById('shelf-history-table-container');
    if (histContainer) {
      if (data.history.length === 0) {
        histContainer.innerHTML = `<div style="text-align:center; padding:20px; color:var(--text-muted);">No past borrowing history yet.</div>`;
      } else {
        histContainer.innerHTML = `
          <div class="data-table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Book Title</th>
                  <th>Author</th>
                  <th>Issued Date</th>
                  <th>Returned Date</th>
                  <th>Fine Paid</th>
                </tr>
              </thead>
              <tbody>
                ${data.history.map(h => `
                  <tr>
                    <td><strong>${h.title}</strong></td>
                    <td>${h.author}</td>
                    <td>${h.issue_date.substring(0, 10)}</td>
                    <td>${h.return_date ? h.return_date.substring(0, 10) : '—'}</td>
                    <td>${h.fine_amount > 0 ? `₹${h.fine_amount.toFixed(2)}` : '₹0.00'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `;
      }
    }

  } catch (e) {
    showToast('Failed to load shelf data: ' + e.message, 'danger');
  }
}

async function renewMyLoan(transactionId) {
  try {
    const res = await fetch('/api/circulation/renew', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${window.appState.token}`
      },
      body: JSON.stringify({ transactionId })
    });
    const data = await res.json();
    if (data.success) {
      showToast(data.message, 'success');
      loadMyShelfData();
    } else {
      showToast(data.message, 'danger');
    }
  } catch (e) {
    showToast('Failed to renew loan', 'danger');
  }
}
