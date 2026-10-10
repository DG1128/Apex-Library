// Rapid Single-Screen Scan-First Circulation View for Librarians

let currentScannedMember = null;
let currentScannedCopy = null;

async function renderCirculation() {
  const container = document.getElementById('main-view-container');
  if (!container) return;

  container.innerHTML = `
    <div class="scan-terminal">
      <!-- Title & Live Barcode Scan Hero Box -->
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:18px;">
        <div>
          <h1 style="font-size:1.8rem;">Rapid Circulation Desk</h1>
          <p style="color:var(--text-secondary);">Scan member ID card or book barcode to instantly issue, return, or renew</p>
        </div>
        <button class="btn btn-secondary btn-sm" onclick="clearCirculationDesk()">${getIcon('refreshCw')} Clear Desk</button>
      </div>

      <!-- Pulsating Scan Input Box -->
      <div class="scan-input-halo-box">
        <span style="color:var(--accent-primary); font-size:1.8rem;">${getIcon('barcode')}</span>
        <input type="text" id="circulation-scan-input" class="scan-hero-input"
               placeholder="Scan or type Member ID (e.g. STU2024001) or Book Barcode (e.g. ACC-1001-C1)..."
               autocomplete="off" autofocus />
        <button class="btn btn-primary" onclick="handleScanSubmit()">Lookup Code</button>
      </div>

      <!-- Quick Scan Helper Chips -->
      <div style="display:flex; gap:10px; margin-bottom:24px; font-size:0.8rem; color:var(--text-muted); align-items:center;">
        <span>💡 Quick Demo Fill:</span>
        <button class="btn btn-ghost btn-sm" onclick="quickFillScan('STU2024001')">Student (STU2024001)</button>
        <button class="btn btn-ghost btn-sm" onclick="quickFillScan('FAC001')">Faculty (FAC001)</button>
        <button class="btn btn-ghost btn-sm" onclick="quickFillScan('ACC-1001-C2')">Available Book (ACC-1001-C2)</button>
        <button class="btn btn-ghost btn-sm" onclick="quickFillScan('ACC-1001-C1')">Issued Book (ACC-1001-C1)</button>
      </div>

      <!-- Dual Preview Split Screen (Member Card + Book Copy Card) -->
      <div class="circulation-split-view">
        <!-- 1. Member Preview Card -->
        <div id="circ-member-preview" class="scan-preview-card">
          <div class="scan-empty-state">
            <div>${getIcon('users')}</div>
            <h3>Scan Member Barcode / ID</h3>
            <p>Scan a student or faculty ID card or type enrollment number</p>
          </div>
        </div>

        <!-- 2. Book Copy Preview Card -->
        <div id="circ-book-preview" class="scan-preview-card">
          <div class="scan-empty-state">
            <div>${getIcon('book')}</div>
            <h3>Scan Book Copy Barcode</h3>
            <p>Scan book copy barcode tag (e.g. ACC-1001-C1)</p>
          </div>
        </div>
      </div>

      <!-- Action Banner -->
      <div id="circ-action-banner" style="display:none; margin-bottom:30px;"></div>

      <!-- Recent Circulation Activity Stream -->
      <div>
        <h3 style="margin-bottom:12px; display:flex; align-items:center; gap:8px;">
          <span>⚡ Recent Circulation Transactions</span>
        </h3>
        <div id="circ-recent-activity-container">
          <div class="skeleton" style="height:120px;"></div>
        </div>
      </div>
    </div>
  `;

  currentScannedMember = null;
  currentScannedCopy = null;

  // Bind Enter key on scan input
  const input = document.getElementById('circulation-scan-input');
  if (input) {
    input.focus();
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleScanSubmit();
      }
    });
  }

  loadRecentCirculation();
}

// Offline Audio Beep Synthesizer using Web Audio API
function playSound(type = 'success') {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'success') {
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1); // A5
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } else if (type === 'error') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      osc.frequency.setValueAtTime(160, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    }
  } catch (e) {}
}

function quickFillScan(code) {
  const input = document.getElementById('circulation-scan-input');
  if (input) {
    input.value = code;
    handleScanSubmit();
  }
}

async function handleScanSubmit() {
  const input = document.getElementById('circulation-scan-input');
  if (!input) return;

  const code = input.value.trim();
  if (!code) return;

  try {
    const res = await fetch('/api/circulation/lookup-scan', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${window.appState.token}`
      },
      body: JSON.stringify({ code })
    });

    const result = await res.json();
    if (!result.success) {
      playSound('error');
      showToast(result.message, 'danger');
      input.select();
      return;
    }

    playSound('success');

    if (result.scanType === 'member') {
      currentScannedMember = result.data;
      renderMemberCard(result.data);
      showToast(`Member scanned: ${result.data.name}`, 'info');
    } else if (result.scanType === 'copy') {
      currentScannedCopy = result.data.copy;
      renderCopyCard(result.data.copy, result.data.currentLoan);
      showToast(`Book copy scanned: ${result.data.copy.title}`, 'info');
    } else if (result.scanType === 'book') {
      const book = result.data.book;
      const copies = result.data.copies;
      const avail = copies.find(c => c.status === 'available');
      if (avail) {
        currentScannedCopy = { ...avail, title: book.title, author: book.author, accession_no: book.accession_no, shelf_location: book.shelf_location };
        renderCopyCard(currentScannedCopy);
      } else {
        renderCopyCard({ ...book, status: 'unavailable', barcode: `${book.accession_no} (All copies out)` });
      }
      showToast(`Book scanned: ${book.title}`, 'info');
    }

    updateActionBanner();
    input.value = '';
    input.focus();
  } catch (err) {
    playSound('error');
    showToast('Lookup error: ' + err.message, 'danger');
  }
}

function renderMemberCard(m) {
  const card = document.getElementById('circ-member-preview');
  if (!card) return;

  const maxBooks = m.role === 'faculty' ? 8 : 3;
  const isLimitReached = m.active_loans_count >= maxBooks;

  card.innerHTML = `
    <div>
      <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px;">
        <div style="display:flex; align-items:center; gap:12px;">
          <div style="width:48px; height:48px; border-radius:var(--radius-pill); background:var(--accent-subtle); color:var(--accent-primary); display:flex; align-items:center; justify-content:center; font-size:1.3rem; font-weight:800;">
            ${m.name.charAt(0)}
          </div>
          <div>
            <h3 style="font-size:1.2rem; margin-bottom:2px;">${m.name}</h3>
            <div style="font-size:0.85rem; color:var(--text-secondary);">
              <code>${m.member_id}</code> • <span style="text-transform:capitalize;">${m.role}</span> (${m.department})
            </div>
          </div>
        </div>
        <button class="btn btn-ghost btn-icon btn-sm" onclick="clearScannedMember()">${getIcon('x')}</button>
      </div>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:16px;">
        <div style="background:var(--bg-input); padding:10px 14px; border-radius:var(--radius-md);">
          <div style="font-size:0.75rem; color:var(--text-muted);">Active Borrowed Loans</div>
          <div style="font-size:1.2rem; font-weight:800; color:${isLimitReached ? 'var(--color-danger)' : 'var(--text-primary)'};">
            ${m.active_loans_count} / ${maxBooks} max
          </div>
        </div>
        <div style="background:var(--bg-input); padding:10px 14px; border-radius:var(--radius-md);">
          <div style="font-size:0.75rem; color:var(--text-muted);">Unpaid Fine Balance</div>
          <div style="font-size:1.2rem; font-weight:800; color:${m.unpaid_fines_total > 0 ? 'var(--color-danger)' : 'var(--color-success)'};">
            ₹${m.unpaid_fines_total.toFixed(2)}
          </div>
        </div>
      </div>

      <!-- Warning badges -->
      <div style="display:flex; flex-wrap:wrap; gap:6px;">
        ${m.is_expired ? `<span class="badge badge-danger">Membership Expired (${m.validity_date})</span>` : `<span class="badge badge-success">Valid Membership</span>`}
        ${m.has_overdue ? `<span class="badge badge-danger">Has Overdue Books!</span>` : ''}
        ${m.unpaid_fines_total > 0 ? `<span class="badge badge-warning">Unpaid Fines Pending</span>` : ''}
      </div>
    </div>
  `;
}

function renderCopyCard(c, currentLoan = null) {
  const card = document.getElementById('circ-book-preview');
  if (!card) return;

  const isIssued = c.status === 'issued';

  card.innerHTML = `
    <div>
      <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px;">
        <div style="display:flex; gap:14px;">
          <div style="width:60px; height:80px; flex-shrink:0;">
            ${generateBookCoverSVG(c.title, c.author, '', 120, 160)}
          </div>
          <div>
            <h3 style="font-size:1.15rem; margin-bottom:2px;" title="${c.title}">${c.title}</h3>
            <div style="font-size:0.85rem; color:var(--text-secondary); margin-bottom:6px;">by ${c.author}</div>
            <div style="font-size:0.8rem; color:var(--text-muted);">
              Barcode: <code>${c.barcode}</code> • Shelf: <strong>${c.shelf_location}</strong>
            </div>
          </div>
        </div>
        <button class="btn btn-ghost btn-icon btn-sm" onclick="clearScannedCopy()">${getIcon('x')}</button>
      </div>

      <div style="background:var(--bg-input); padding:12px 14px; border-radius:var(--radius-md); margin-bottom:12px;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span style="font-size:0.85rem; font-weight:600;">Status:</span>
          <span class="badge ${c.status === 'available' ? 'badge-success' : (c.status === 'issued' ? 'badge-warning' : 'badge-danger')}">
            ${c.status.toUpperCase()}
          </span>
        </div>
        ${currentLoan ? `
          <div style="margin-top:8px; font-size:0.8rem; color:var(--text-secondary); border-top:1px solid var(--border-subtle); padding-top:6px;">
            Issued to: <strong>${currentLoan.member_name} (${currentLoan.member_code})</strong><br/>
            Due Date: <strong>${currentLoan.due_date.substring(0, 10)}</strong>
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

function clearScannedMember() {
  currentScannedMember = null;
  const card = document.getElementById('circ-member-preview');
  if (card) {
    card.innerHTML = `
      <div class="scan-empty-state">
        <div>${getIcon('users')}</div>
        <h3>Scan Member Barcode / ID</h3>
        <p>Scan a student or faculty ID card</p>
      </div>
    `;
  }
  updateActionBanner();
}

function clearScannedCopy() {
  currentScannedCopy = null;
  const card = document.getElementById('circ-book-preview');
  if (card) {
    card.innerHTML = `
      <div class="scan-empty-state">
        <div>${getIcon('book')}</div>
        <h3>Scan Book Copy Barcode</h3>
        <p>Scan book copy barcode tag</p>
      </div>
    `;
  }
  updateActionBanner();
}

function clearCirculationDesk() {
  clearScannedMember();
  clearScannedCopy();
  const input = document.getElementById('circulation-scan-input');
  if (input) {
    input.value = '';
    input.focus();
  }
}

function updateActionBanner() {
  const banner = document.getElementById('circ-action-banner');
  if (!banner) return;

  // Case A: Book Copy is scanned and is currently ISSUED -> Instant RETURN or RENEW option
  if (currentScannedCopy && currentScannedCopy.status === 'issued') {
    banner.style.display = 'block';
    banner.innerHTML = `
      <div style="background:var(--bg-card); border:2px solid var(--accent-primary); border-radius:var(--radius-xl); padding:20px; display:flex; justify-content:space-between; align-items:center; box-shadow:var(--shadow-lg);">
        <div>
          <h3 style="font-size:1.2rem; color:var(--accent-primary);">⚡ Book is currently ISSUED</h3>
          <p style="font-size:0.9rem; color:var(--text-secondary);">Click below to return this copy or process renewal</p>
        </div>
        <div style="display:flex; gap:12px;">
          <button class="btn btn-primary btn-lg" onclick="executeReturn('${currentScannedCopy.barcode}')">
            ${getIcon('checkCircle')} RETURN THIS BOOK
          </button>
        </div>
      </div>
    `;
    return;
  }

  // Case B: Member scanned + Available copy scanned -> Instant ISSUE option
  if (currentScannedMember && currentScannedCopy && currentScannedCopy.status === 'available') {
    const isBlocked = currentScannedMember.is_expired || currentScannedMember.has_overdue || currentScannedMember.unpaid_fines_total > 0;

    banner.style.display = 'block';
    banner.innerHTML = `
      <div style="background:var(--bg-card); border:2px solid ${isBlocked ? 'var(--color-danger)' : 'var(--color-success)'}; border-radius:var(--radius-xl); padding:20px; display:flex; justify-content:space-between; align-items:center; box-shadow:var(--shadow-lg);">
        <div>
          <h3 style="font-size:1.2rem; color:${isBlocked ? 'var(--color-danger)' : 'var(--color-success)'};">
            ${isBlocked ? '⚠️ Issue Blocked by Library Rules' : '✅ Ready to Issue!'}
          </h3>
          <p style="font-size:0.9rem; color:var(--text-secondary);">
            Issue "<strong>${currentScannedCopy.title}</strong>" to <strong>${currentScannedMember.name}</strong> (${currentScannedMember.member_id})
          </p>
        </div>
        <div>
          <button class="btn btn-primary btn-lg" ${isBlocked ? 'disabled' : ''} onclick="executeIssue(${currentScannedMember.id}, '${currentScannedCopy.barcode}')">
            ⚡ ISSUE BOOK TO MEMBER
          </button>
        </div>
      </div>
    `;
    return;
  }

  banner.style.display = 'none';
}

async function executeIssue(memberId, copyBarcode) {
  try {
    const res = await fetch('/api/circulation/issue', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${window.appState.token}`
      },
      body: JSON.stringify({ memberId, copyBarcode })
    });

    const data = await res.json();
    if (data.success) {
      playSound('success');
      showToast(data.message, 'success');
      clearCirculationDesk();
      loadRecentCirculation();
    } else {
      playSound('error');
      showToast(data.message, 'danger');
    }
  } catch (err) {
    playSound('error');
    showToast('Failed to issue book: ' + err.message, 'danger');
  }
}

async function executeReturn(copyBarcode) {
  try {
    const res = await fetch('/api/circulation/return', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${window.appState.token}`
      },
      body: JSON.stringify({ copyBarcode })
    });

    const data = await res.json();
    if (data.success) {
      playSound('success');
      launchConfetti(); // Confetti celebration!

      let msg = data.message;
      if (data.fine_charged > 0) {
        msg += ` Late fine of ₹${data.fine_charged.toFixed(2)} recorded.`;
      }
      if (data.next_reservation) {
        msg += ` ⏳ ${data.next_reservation.message}`;
      }

      showToast(msg, 'success');
      clearCirculationDesk();
      loadRecentCirculation();
    } else {
      playSound('error');
      showToast(data.message, 'danger');
    }
  } catch (err) {
    playSound('error');
    showToast('Failed to return book: ' + err.message, 'danger');
  }
}

async function loadRecentCirculation() {
  const container = document.getElementById('circ-recent-activity-container');
  if (!container) return;

  try {
    const res = await fetch('/api/reports/dashboard', {
      headers: { 'Authorization': `Bearer ${window.appState.token}` }
    });
    const data = await res.json();

    if (data.success && data.recentActivity && data.recentActivity.length > 0) {
      container.innerHTML = `
        <div class="data-table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Book</th>
                <th>Issue Date</th>
                <th>Due Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${data.recentActivity.map(t => `
                <tr>
                  <td><strong>${t.member_name}</strong> <span style="font-size:0.75rem; color:var(--text-muted);">(${t.member_code})</span></td>
                  <td>${t.book_title}</td>
                  <td>${t.issue_date.substring(0, 10)}</td>
                  <td>${t.due_date.substring(0, 10)}</td>
                  <td>
                    <span class="badge ${t.status === 'returned' ? 'badge-neutral' : (new Date(t.due_date) < new Date() ? 'badge-danger' : 'badge-success')}">
                      ${t.status === 'returned' ? 'Returned' : (new Date(t.due_date) < new Date() ? 'Overdue' : 'Active')}
                    </span>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    }
  } catch (e) {}
}
