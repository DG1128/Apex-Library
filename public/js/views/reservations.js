// Reservations & Hold Queue Management View (Librarian & Admin)

async function renderReservations() {
  const container = document.getElementById('main-view-container');
  if (!container) return;

  container.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px;">
      <div>
        <h1 style="font-size:1.8rem;">Book Reservations Queue</h1>
        <p style="color:var(--text-secondary);">Manage waiting lists, ready-for-pickup holds, and queue allocations</p>
      </div>
      <button class="btn btn-secondary btn-sm" onclick="loadReservationsList()">${getIcon('refreshCw')} Refresh</button>
    </div>

    <!-- Filter Buttons -->
    <div class="glass-card" style="padding:14px 20px; margin-bottom:20px; display:flex; gap:10px;">
      <button class="btn btn-secondary btn-sm active" id="res-filter-all" onclick="filterReservations('', this)">All Reservations</button>
      <button class="btn btn-secondary btn-sm" id="res-filter-ready" onclick="filterReservations('ready', this)">🟢 Ready for Pickup</button>
      <button class="btn btn-secondary btn-sm" id="res-filter-waiting" onclick="filterReservations('waiting', this)">⏳ Waiting Queue</button>
    </div>

    <!-- Data Table -->
    <div class="data-table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th>Book Title</th>
            <th>Member</th>
            <th>Contact</th>
            <th>Hold Status</th>
            <th>Reserved Date</th>
            <th>Expiry Date</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody id="reservations-tbody">
          <tr><td colspan="7" style="text-align:center; padding:30px;">Loading reservations queue...</td></tr>
        </tbody>
      </table>
    </div>
  `;

  window.currentResFilter = '';
  loadReservationsList();
}

function filterReservations(status, btn) {
  document.querySelectorAll('#main-view-container .btn-secondary').forEach(b => b.classList.remove('active', 'btn-primary'));
  if (btn) btn.classList.add('active', 'btn-primary');
  window.currentResFilter = status;
  loadReservationsList();
}

async function loadReservationsList() {
  const tbody = document.getElementById('reservations-tbody');
  if (!tbody) return;

  try {
    const res = await fetch(`/api/reservations?status=${window.currentResFilter || ''}`, {
      headers: { 'Authorization': `Bearer ${window.appState.token}` }
    });
    const data = await res.json();

    if (!data.success || !data.reservations || data.reservations.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:40px; color:var(--text-muted);">No active reservations found.</td></tr>`;
      return;
    }

    tbody.innerHTML = data.reservations.map(r => `
      <tr>
        <td>
          <div style="font-weight:700; color:var(--text-primary);">${r.book_title}</div>
          <div style="font-size:0.75rem; color:var(--text-muted);">by ${r.book_author} • Shelf: ${r.shelf_location}</div>
        </td>
        <td>
          <div style="font-weight:600;">${r.member_name}</div>
          <div style="font-size:0.75rem; color:var(--text-muted);"><code>${r.member_code}</code> • ${r.member_role} (${r.member_dept})</div>
        </td>
        <td>${r.member_phone || '—'}</td>
        <td>
          <span class="badge ${r.status === 'ready' ? 'badge-success' : 'badge-warning'}">
            ${r.status === 'ready' ? '🟢 Ready for Pickup' : '⏳ In Waiting Queue'}
          </span>
        </td>
        <td>${r.reservation_date.substring(0, 10)}</td>
        <td>${r.expiry_date ? r.expiry_date.substring(0, 10) : '—'}</td>
        <td>
          <button class="btn btn-ghost btn-sm" style="color:var(--color-danger);" onclick="cancelReservationFromAdmin(${r.id})">
            Cancel
          </button>
        </td>
      </tr>
    `).join('');
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--color-danger);">Failed to load reservations list.</td></tr>`;
  }
}

async function cancelReservationFromAdmin(resId) {
  if (!confirm('Cancel this reservation?')) return;
  try {
    const res = await fetch(`/api/reservations/${resId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${window.appState.token}` }
    });
    const data = await res.json();
    if (data.success) {
      showToast('Reservation cancelled', 'info');
      loadReservationsList();
    }
  } catch (e) {
    showToast('Failed to cancel reservation', 'danger');
  }
}
