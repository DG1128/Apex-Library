// Fines & Dues Management View (Librarian & Admin)

let finesAdminPage = 1;

async function renderFinesAdmin() {
  const container = document.getElementById('main-view-container');
  if (!container) return;

  container.innerHTML = `
    <!-- Top Action Bar -->
    <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px; margin-bottom:24px;">
      <div>
        <h1 style="font-size:1.8rem;">Overdue Fines & Revenue Desk</h1>
        <p style="color:var(--text-secondary);">Track overdue book charges, collect payments, issue receipts, and manage waivers</p>
      </div>
      <button class="btn btn-secondary btn-sm" onclick="window.open('/api/reports/export/fines', '_blank')">
        ${getIcon('download')} Export Fines CSV
      </button>
    </div>

    <!-- Summary Stat Cards Bento -->
    <div class="bento-grid" style="margin-bottom:24px;">
      <div class="bento-col-4">
        <div class="stat-card">
          <div class="stat-card-header">
            <span class="stat-card-title">Total Unpaid Balance</span>
            <div class="stat-icon" style="background:var(--color-danger-bg); color:var(--color-danger);">${getIcon('alertCircle')}</div>
          </div>
          <div class="stat-value" id="fines-stat-unpaid" style="color:var(--color-danger);">₹0.00</div>
          <div class="stat-footer">
            <span id="fines-stat-unpaid-count">0 unpaid fines</span>
          </div>
        </div>
      </div>

      <div class="bento-col-4">
        <div class="stat-card">
          <div class="stat-card-header">
            <span class="stat-card-title">Total Fines Collected</span>
            <div class="stat-icon" style="background:var(--color-success-bg); color:var(--color-success);">${getIcon('dollarSign')}</div>
          </div>
          <div class="stat-value" id="fines-stat-collected" style="color:var(--color-success);">₹0.00</div>
          <div class="stat-footer">
            <span>All-time library revenue</span>
          </div>
        </div>
      </div>

      <div class="bento-col-4">
        <div class="stat-card">
          <div class="stat-card-header">
            <span class="stat-card-title">Current Fine Rate</span>
            <div class="stat-icon">${getIcon('settings')}</div>
          </div>
          <div class="stat-value">₹2.00 / day</div>
          <div class="stat-footer">
            <a href="javascript:void(0)" onclick="window.navigateTo('settings-admin')">Configure Rate in Settings →</a>
          </div>
        </div>
      </div>
    </div>

    <!-- Filter & Search Bar -->
    <div class="glass-card" style="padding:16px 20px; margin-bottom:20px; display:flex; gap:14px; flex-wrap:wrap; align-items:center;">
      <div style="flex:1; min-width:240px;">
        <input type="text" id="fines-admin-search" class="input" placeholder="Search by Member Name, ID, Receipt No, Book Title..." oninput="debounceFinesSearch()" />
      </div>
      <div style="width:180px;">
        <select id="fines-admin-status" class="select" onchange="loadFinesAdminTable()">
          <option value="">All Fine Records</option>
          <option value="unpaid" selected>Unpaid Only</option>
          <option value="paid">Paid Records</option>
          <option value="waived">Waived Records</option>
        </select>
      </div>
      <button class="btn btn-secondary btn-sm" onclick="loadFinesAdminTable()">${getIcon('refreshCw')} Refresh</button>
    </div>

    <!-- Fines Data Table -->
    <div class="data-table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th>Receipt / ID</th>
            <th>Member</th>
            <th>Book Title</th>
            <th>Overdue Days</th>
            <th>Fine Amount</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody id="fines-admin-tbody">
          <tr><td colspan="7" style="text-align:center; padding:30px;">Loading fine records...</td></tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div id="fines-admin-pagination" style="display:flex; justify-content:center; gap:8px; margin-top:24px;"></div>
  `;

  loadFinesAdminTable();
}

let fineSearchDebounce = null;
function debounceFinesSearch() {
  if (fineSearchDebounce) clearTimeout(fineSearchDebounce);
  fineSearchDebounce = setTimeout(() => {
    finesAdminPage = 1;
    loadFinesAdminTable();
  }, 250);
}

async function loadFinesAdminTable() {
  const tbody = document.getElementById('fines-admin-tbody');
  if (!tbody) return;

  const searchInput = document.getElementById('fines-admin-search');
  const statusSelect = document.getElementById('fines-admin-status');

  const q = searchInput ? searchInput.value.trim() : '';
  const status = statusSelect ? statusSelect.value : 'unpaid';

  let url = `/api/fines?page=${finesAdminPage}&limit=20`;
  if (q) url += `&search=${encodeURIComponent(q)}`;
  if (status) url += `&status=${encodeURIComponent(status)}`;

  try {
    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${window.appState.token}` }
    });
    const data = await res.json();

    if (data.stats) {
      const unpaidEl = document.getElementById('fines-stat-unpaid');
      const unpaidCountEl = document.getElementById('fines-stat-unpaid-count');
      const collEl = document.getElementById('fines-stat-collected');
      if (unpaidEl) unpaidEl.textContent = `₹${data.stats.total_unpaid.toFixed(2)}`;
      if (unpaidCountEl) unpaidCountEl.textContent = `${data.stats.unpaid_count} unpaid records`;
      if (collEl) collEl.textContent = `₹${data.stats.total_collected.toFixed(2)}`;
    }

    if (!data.success || !data.fines || data.fines.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:40px; color:var(--text-muted);">No fine records found.</td></tr>`;
      renderFinesPagination(0, 1, 20);
      return;
    }

    tbody.innerHTML = data.fines.map(f => {
      const isUnpaid = f.status === 'unpaid';
      return `
        <tr>
          <td><code>${f.receipt_no || `FINE-${f.id}`}</code></td>
          <td>
            <div style="font-weight:700;">${f.member_name}</div>
            <div style="font-size:0.75rem; color:var(--text-muted);"><code>${f.member_code}</code> • ${f.member_role} (${f.member_dept})</div>
          </td>
          <td>
            <div style="font-weight:600;">${f.book_title}</div>
            <div style="font-size:0.75rem; color:var(--text-muted);">Due: ${f.due_date.substring(0, 10)}</div>
          </td>
          <td><strong>${f.days_overdue} days</strong></td>
          <td>
            <div style="font-size:1.1rem; font-weight:800; color:${isUnpaid ? 'var(--color-danger)' : 'var(--color-success)'};">
              ₹${f.amount.toFixed(2)}
            </div>
            ${f.paid_amount > 0 && isUnpaid ? `<div style="font-size:0.7rem; color:var(--text-muted);">Paid: ₹${f.paid_amount.toFixed(2)}</div>` : ''}
          </td>
          <td>
            <span class="badge ${f.status === 'paid' ? 'badge-success' : (f.status === 'unpaid' ? 'badge-danger' : 'badge-neutral')}">
              ${f.status.toUpperCase()}
            </span>
          </td>
          <td>
            <div style="display:flex; gap:6px;">
              ${isUnpaid ? `
                <button class="btn btn-primary btn-sm" onclick="openCollectFineModal(${f.id}, ${f.amount - f.paid_amount}, '${f.member_name.replace(/'/g, "\\'")}', '${f.book_title.replace(/'/g, "\\'")}')">
                  💰 Collect Fine
                </button>
                <button class="btn btn-ghost btn-sm" style="color:var(--text-muted);" onclick="waiveFinePrompt(${f.id}, ${f.amount})">
                  Waive
                </button>
              ` : `
                <button class="btn btn-secondary btn-sm" onclick="printFineReceipt(${f.id})">
                  🧾 Receipt
                </button>
              `}
            </div>
          </td>
        </tr>
      `;
    }).join('');

    renderFinesPagination(data.pagination.total, data.pagination.page, data.pagination.limit);
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--color-danger);">Error loading fine records.</td></tr>`;
  }
}

function renderFinesPagination(total, currentPage, limit) {
  const container = document.getElementById('fines-admin-pagination');
  if (!container) return;

  const totalPages = Math.ceil(total / limit);
  if (totalPages <= 1) {
    container.innerHTML = '';
    return;
  }

  let html = '';
  if (currentPage > 1) {
    html += `<button class="btn btn-secondary btn-sm" onclick="setFinesAdminPage(${currentPage - 1})">← Prev</button>`;
  }

  for (let p = Math.max(1, currentPage - 2); p <= Math.min(totalPages, currentPage + 2); p++) {
    html += `
      <button class="btn ${p === currentPage ? 'btn-primary' : 'btn-secondary'} btn-sm"
              onclick="setFinesAdminPage(${p})">${p}</button>
    `;
  }

  if (currentPage < totalPages) {
    html += `<button class="btn btn-secondary btn-sm" onclick="setFinesAdminPage(${currentPage + 1})">Next →</button>`;
  }

  container.innerHTML = html;
}

function setFinesAdminPage(p) {
  finesAdminPage = p;
  loadFinesAdminTable();
}

// Collect Fine Payment Modal
function openCollectFineModal(fineId, remainingAmount, memberName, bookTitle) {
  const modalHtml = `
    <div class="modal-header">
      <h3>💰 Record Fine Payment</h3>
      <button class="btn btn-ghost btn-icon" onclick="window.closeModal()">${getIcon('x')}</button>
    </div>
    <form id="collect-fine-form" onsubmit="submitCollectFine(event, ${fineId})">
      <div class="modal-body">
        <div style="background:var(--bg-input); border-radius:var(--radius-md); padding:14px; margin-bottom:18px;">
          <div style="font-size:0.85rem; color:var(--text-muted);">Member:</div>
          <div style="font-weight:700; font-size:1.05rem;">${memberName}</div>
          <div style="font-size:0.85rem; color:var(--text-secondary); margin-top:4px;">Book: ${bookTitle}</div>
        </div>

        <div class="form-group">
          <label class="form-label">Payment Amount (₹) *</label>
          <input type="number" step="0.5" name="amountPaid" class="input" required value="${remainingAmount}" />
        </div>

        <div class="form-group">
          <label class="form-label">Payment Method *</label>
          <select name="paymentMethod" class="select" required>
            <option value="cash">💵 Cash Payment at Counter</option>
            <option value="upi">📱 College UPI / QR Transfer</option>
            <option value="card">💳 POS Card Swipe</option>
          </select>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" onclick="window.closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">Record Payment & Issue Receipt</button>
      </div>
    </form>
  `;

  window.openModal(modalHtml);
}

async function submitCollectFine(e, fineId) {
  e.preventDefault();
  const form = e.target;
  const formData = new FormData(form);
  const data = Object.fromEntries(formData.entries());

  try {
    const res = await fetch(`/api/fines/${fineId}/pay`, {
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
      loadFinesAdminTable();
      printFineReceipt(fineId);
    } else {
      showToast(result.message, 'danger');
    }
  } catch (err) {
    showToast('Failed to record payment: ' + err.message, 'danger');
  }
}

// Print Fine Receipt Modal
async function printFineReceipt(fineId) {
  try {
    const res = await fetch(`/api/fines?search=FINE-${fineId}`, {
      headers: { 'Authorization': `Bearer ${window.appState.token}` }
    });
    const data = await res.json();
    const fine = (data.fines || []).find(f => f.id === fineId) || data.fines[0];

    if (!fine) return showToast('Fine record not found', 'danger');

    const modalHtml = `
      <div class="modal-header no-print">
        <h3>🧾 Library Official Fee Receipt</h3>
        <button class="btn btn-ghost btn-icon" onclick="window.closeModal()">${getIcon('x')}</button>
      </div>
      <div class="modal-body" style="display:flex; justify-content:center; padding:20px;">
        <div class="printable-card" style="width:420px; background:#ffffff; color:#0f172a; border:2px solid #0f172a; border-radius:12px; padding:24px; font-family:monospace; box-shadow:var(--shadow-lg);">
          <div style="text-align:center; border-bottom:2px dashed #334155; padding-bottom:12px; margin-bottom:14px;">
            <div style="font-size:1.1rem; font-weight:800;">APEX INSTITUTE OF TECHNOLOGY</div>
            <div style="font-size:0.8rem; font-weight:600;">CENTRAL LIBRARY • FINE RECEIPT</div>
            <div style="font-size:0.75rem; color:#475569; margin-top:2px;">Receipt No: <strong>${fine.receipt_no || `REC-2024-${fine.id}`}</strong></div>
            <div style="font-size:0.7rem; color:#64748b;">Date: ${fine.payment_date ? fine.payment_date.substring(0, 19) : new Date().toISOString().substring(0, 10)}</div>
          </div>

          <div style="font-size:0.85rem; display:flex; flex-direction:column; gap:6px; margin-bottom:14px;">
            <div><strong>Member:</strong> ${fine.member_name} (${fine.member_code})</div>
            <div><strong>Department:</strong> ${fine.member_dept}</div>
            <div><strong>Book:</strong> ${fine.book_title}</div>
            <div><strong>Accession:</strong> ${fine.accession_no}</div>
            <div><strong>Days Overdue:</strong> ${fine.days_overdue} days</div>
            <div><strong>Payment Mode:</strong> ${fine.payment_method ? fine.payment_method.toUpperCase() : 'CASH'}</div>
          </div>

          <div style="border-top:2px dashed #334155; border-bottom:2px dashed #334155; padding:10px 0; margin-bottom:16px; display:flex; justify-content:space-between; font-size:1.1rem; font-weight:800;">
            <span>TOTAL AMOUNT PAID:</span>
            <span>₹${fine.paid_amount ? fine.paid_amount.toFixed(2) : fine.amount.toFixed(2)}</span>
          </div>

          <div style="font-size:0.75rem; text-align:center; color:#64748b;">
            Collected by: <strong>${fine.collector_name || 'Library Staff'}</strong><br/>
            Thank you for returning library property on time.
          </div>
        </div>
      </div>
      <div class="modal-footer no-print">
        <button class="btn btn-secondary" onclick="window.closeModal()">Close</button>
        <button class="btn btn-primary" onclick="window.print()">${getIcon('printer')} Print Receipt</button>
      </div>
    `;

    window.openModal(modalHtml);
  } catch (e) {
    showToast('Failed to open receipt', 'danger');
  }
}

async function waiveFinePrompt(fineId, amount) {
  const reason = prompt(`Enter reason to waive ₹${amount.toFixed(2)} fine:`, 'Librarian Discretion');
  if (!reason) return;

  try {
    const res = await fetch(`/api/fines/${fineId}/waive`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${window.appState.token}`
      },
      body: JSON.stringify({ reason })
    });
    const result = await res.json();
    if (result.success) {
      showToast('Fine waived', 'info');
      loadFinesAdminTable();
    }
  } catch (e) {
    showToast('Failed to waive fine', 'danger');
  }
}
