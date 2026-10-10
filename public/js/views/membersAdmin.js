// Member Management View (Librarian & Admin)

let membersAdminPage = 1;

async function renderMembersAdmin() {
  const container = document.getElementById('main-view-container');
  if (!container) return;

  container.innerHTML = `
    <!-- Top Action Bar -->
    <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px; margin-bottom:24px;">
      <div>
        <h1 style="font-size:1.8rem;">Members Management</h1>
        <p style="color:var(--text-secondary);">Manage students & faculty accounts, view borrowing limits, and print ID cards</p>
      </div>
      <div style="display:flex; gap:10px; flex-wrap:wrap;">
        <button class="btn btn-secondary btn-sm" onclick="openBulkImportMembersModal()">
          ${getIcon('upload')} Bulk Import CSV
        </button>
        <button class="btn btn-primary btn-sm" onclick="openAddMemberModal()">
          ${getIcon('plus')} Add New Member
        </button>
      </div>
    </div>

    <!-- Filter & Search Bar -->
    <div class="glass-card" style="padding:16px 20px; margin-bottom:20px; display:flex; gap:14px; flex-wrap:wrap; align-items:center;">
      <div style="flex:1; min-width:240px;">
        <input type="text" id="members-admin-search" class="input" placeholder="Search by Member ID, Name, Email, Phone..." oninput="debounceMembersSearch()" />
      </div>
      <div style="width:180px;">
        <select id="members-admin-role" class="select" onchange="loadMembersAdminTable()">
          <option value="">All Roles</option>
          <option value="student">Student</option>
          <option value="faculty">Faculty</option>
          <option value="librarian">Librarian</option>
        </select>
      </div>
      <div style="width:160px;">
        <select id="members-admin-status" class="select" onchange="loadMembersAdminTable()">
          <option value="">All Statuses</option>
          <option value="active">Active Only</option>
          <option value="deactivated">Deactivated</option>
        </select>
      </div>
      <button class="btn btn-secondary btn-sm" onclick="loadMembersAdminTable()">${getIcon('refreshCw')} Refresh</button>
    </div>

    <!-- Members Data Table -->
    <div class="data-table-container">
      <table class="data-table" id="members-admin-table">
        <thead>
          <tr>
            <th>Member ID</th>
            <th>Full Name</th>
            <th>Role & Dept</th>
            <th>Active Loans</th>
            <th>Unpaid Fine</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody id="members-admin-tbody">
          <tr><td colspan="7" style="text-align:center; padding:30px;">Loading members directory...</td></tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div id="members-admin-pagination" style="display:flex; justify-content:center; gap:8px; margin-top:24px;"></div>
  `;

  loadMembersAdminTable();
}

let memberSearchDebounce = null;
function debounceMembersSearch() {
  if (memberSearchDebounce) clearTimeout(memberSearchDebounce);
  memberSearchDebounce = setTimeout(() => {
    membersAdminPage = 1;
    loadMembersAdminTable();
  }, 250);
}

async function loadMembersAdminTable() {
  const tbody = document.getElementById('members-admin-tbody');
  if (!tbody) return;

  const searchInput = document.getElementById('members-admin-search');
  const roleSelect = document.getElementById('members-admin-role');
  const statusSelect = document.getElementById('members-admin-status');

  const q = searchInput ? searchInput.value.trim() : '';
  const role = roleSelect ? roleSelect.value : '';
  const status = statusSelect ? statusSelect.value : '';

  let url = `/api/members?page=${membersAdminPage}&limit=20`;
  if (q) url += `&q=${encodeURIComponent(q)}`;
  if (role) url += `&role=${encodeURIComponent(role)}`;
  if (status) url += `&status=${encodeURIComponent(status)}`;

  try {
    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${window.appState.token}` }
    });
    const data = await res.json();

    if (!data.success || !data.members || data.members.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:40px; color:var(--text-muted);">No members found matching search criteria.</td></tr>`;
      renderMembersPagination(0, 1, 20);
      return;
    }

    tbody.innerHTML = data.members.map(m => {
      const avatarMap = {
        'ADMIN001': '/images/avatars/admin.jpg',
        'LIB001': '/images/avatars/librarian.jpg',
        'FAC001': '/images/avatars/faculty-ada.jpg',
        'FAC-CS-101': '/images/avatars/faculty-turing.jpg',
        'STU2024001': '/images/avatars/student-aarav.jpg',
        'STU2024002': '/images/avatars/student-diya.jpg',
        'STU2024003': '/images/avatars/student-rohan.jpg',
        'STU2024004': '/images/avatars/student-ananya.jpg'
      };

      const avatarHtml = avatarMap[m.member_id]
        ? `<img src="${avatarMap[m.member_id]}" alt="${m.name}" style="width:36px; height:36px; border-radius:50%; object-fit:cover; border:2px solid var(--border-strong);" loading="lazy" />`
        : `<div style="width:36px; height:36px; border-radius:50%; background:var(--accent-gradient); color:#fff; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:0.8rem;">${(m.name || 'U').substring(0, 2).toUpperCase()}</div>`;

      return `
      <tr>
        <td><code>${m.member_id}</code></td>
        <td>
          <div style="display:flex; align-items:center; gap:12px;">
            ${avatarHtml}
            <div>
              <div style="font-weight:700; color:var(--text-primary);">${m.name}</div>
              <div style="font-size:0.75rem; color:var(--text-muted);">${m.email || m.phone || 'No contact on file'}</div>
            </div>
          </div>
        </td>
        <td>
          <span class="badge ${m.role === 'faculty' ? 'badge-info' : (m.role === 'student' ? 'badge-neutral' : 'badge-warning')}" style="text-transform:capitalize;">
            ${m.role}
          </span>
          <div style="font-size:0.8rem; color:var(--text-secondary); margin-top:2px;">${m.department} ${m.semester ? `(${m.semester})` : ''}</div>
        </td>
        <td>
          <span class="badge ${m.active_loans > 0 ? 'badge-warning' : 'badge-neutral'}">
            ${m.active_loans} Active
          </span>
        </td>
        <td>
          <span style="font-weight:700; color:${m.unpaid_fines > 0 ? 'var(--color-danger)' : 'var(--color-success)'};">
            ${m.unpaid_fines > 0 ? `₹${m.unpaid_fines.toFixed(2)}` : '₹0.00'}
          </span>
        </td>
        <td>
          <span class="badge ${m.status === 'active' ? 'badge-success' : 'badge-danger'}">
            ${m.status}
          </span>
        </td>
        <td>
          <div style="display:flex; gap:6px;">
            <button class="btn btn-secondary btn-sm" title="Print ID Card" onclick="openPrintIdCardModal(${m.id})">
              🪪 ID Card
            </button>
            <button class="btn btn-ghost btn-sm" title="Edit Member" onclick="openEditMemberModal(${m.id})">
              ✏️
            </button>
            <button class="btn btn-ghost btn-sm" title="Toggle Status" onclick="toggleMemberStatus(${m.id}, '${m.status}')">
              ${m.status === 'active' ? '🔒' : '🔓'}
            </button>
          </div>
        </td>
      </tr>
    `).join('');

    renderMembersPagination(data.pagination.total, data.pagination.page, data.pagination.limit);
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--color-danger);">Error loading members table.</td></tr>`;
  }
}

function renderMembersPagination(total, currentPage, limit) {
  const container = document.getElementById('members-admin-pagination');
  if (!container) return;

  const totalPages = Math.ceil(total / limit);
  if (totalPages <= 1) {
    container.innerHTML = '';
    return;
  }

  let html = '';
  if (currentPage > 1) {
    html += `<button class="btn btn-secondary btn-sm" onclick="setMembersAdminPage(${currentPage - 1})">← Prev</button>`;
  }

  for (let p = Math.max(1, currentPage - 2); p <= Math.min(totalPages, currentPage + 2); p++) {
    html += `
      <button class="btn ${p === currentPage ? 'btn-primary' : 'btn-secondary'} btn-sm"
              onclick="setMembersAdminPage(${p})">${p}</button>
    `;
  }

  if (currentPage < totalPages) {
    html += `<button class="btn btn-secondary btn-sm" onclick="setMembersAdminPage(${currentPage + 1})">Next →</button>`;
  }

  container.innerHTML = html;
}

function setMembersAdminPage(p) {
  membersAdminPage = p;
  loadMembersAdminTable();
}

// Add Member Modal
function openAddMemberModal() {
  const modalHtml = `
    <div class="modal-header">
      <h3>👤 Register New Library Member</h3>
      <button class="btn btn-ghost btn-icon" onclick="window.closeModal()">${getIcon('x')}</button>
    </div>
    <form id="add-member-form" onsubmit="submitAddMember(event)">
      <div class="modal-body">
        <div class="bento-grid">
          <div class="bento-col-6 form-group">
            <label class="form-label">Member ID / Enrollment No *</label>
            <input type="text" name="member_id" class="input" required placeholder="e.g. STU2024020" />
          </div>
          <div class="bento-col-6 form-group">
            <label class="form-label">Full Name *</label>
            <input type="text" name="name" class="input" required placeholder="e.g. Maya Patel" />
          </div>
          <div class="bento-col-6 form-group">
            <label class="form-label">Role *</label>
            <select name="role" class="select" required>
              <option value="student">Student</option>
              <option value="faculty">Faculty</option>
              <option value="librarian">Librarian / Staff</option>
            </select>
          </div>
          <div class="bento-col-6 form-group">
            <label class="form-label">Department *</label>
            <input type="text" name="department" class="input" required placeholder="e.g. Computer Science" />
          </div>
          <div class="bento-col-6 form-group">
            <label class="form-label">Semester / Designation</label>
            <input type="text" name="semester" class="input" placeholder="e.g. Semester 4" />
          </div>
          <div class="bento-col-6 form-group">
            <label class="form-label">Card Validity Date *</label>
            <input type="date" name="validity_date" class="input" required value="2027-06-30" />
          </div>
          <div class="bento-col-6 form-group">
            <label class="form-label">Email Address</label>
            <input type="email" name="email" class="input" placeholder="e.g. maya@college.edu" />
          </div>
          <div class="bento-col-6 form-group">
            <label class="form-label">Phone Number</label>
            <input type="text" name="phone" class="input" placeholder="e.g. +91 9876543210" />
          </div>
          <div class="bento-col-12 form-group">
            <label class="form-label">Initial Password (Default: password123)</label>
            <input type="text" name="password" class="input" value="password123" />
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" onclick="window.closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">Create Member Profile</button>
      </div>
    </form>
  `;

  window.openModal(modalHtml);
}

async function submitAddMember(e) {
  e.preventDefault();
  const form = e.target;
  const formData = new FormData(form);
  const data = Object.fromEntries(formData.entries());

  try {
    const res = await fetch('/api/members', {
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
      loadMembersAdminTable();
    } else {
      showToast(result.message, 'danger');
    }
  } catch (err) {
    showToast('Failed to add member: ' + err.message, 'danger');
  }
}

// Edit Member Modal
async function openEditMemberModal(userId) {
  try {
    const res = await fetch(`/api/members/${userId}`, {
      headers: { 'Authorization': `Bearer ${window.appState.token}` }
    });
    const data = await res.json();
    if (!data.success) return showToast('Member not found', 'danger');

    const m = data.member;
    const modalHtml = `
      <div class="modal-header">
        <h3>✏️ Edit Member: ${m.member_id}</h3>
        <button class="btn btn-ghost btn-icon" onclick="window.closeModal()">${getIcon('x')}</button>
      </div>
      <form id="edit-member-form" onsubmit="submitEditMember(event, ${userId})">
        <div class="modal-body">
          <div class="bento-grid">
            <div class="bento-col-6 form-group">
              <label class="form-label">Full Name *</label>
              <input type="text" name="name" class="input" required value="${m.name}" />
            </div>
            <div class="bento-col-6 form-group">
              <label class="form-label">Department *</label>
              <input type="text" name="department" class="input" required value="${m.department}" />
            </div>
            <div class="bento-col-6 form-group">
              <label class="form-label">Role *</label>
              <select name="role" class="select" required>
                <option value="student" ${m.role === 'student' ? 'selected' : ''}>Student</option>
                <option value="faculty" ${m.role === 'faculty' ? 'selected' : ''}>Faculty</option>
                <option value="librarian" ${m.role === 'librarian' ? 'selected' : ''}>Librarian</option>
              </select>
            </div>
            <div class="bento-col-6 form-group">
              <label class="form-label">Semester / Designation</label>
              <input type="text" name="semester" class="input" value="${m.semester || ''}" />
            </div>
            <div class="bento-col-6 form-group">
              <label class="form-label">Email</label>
              <input type="email" name="email" class="input" value="${m.email || ''}" />
            </div>
            <div class="bento-col-6 form-group">
              <label class="form-label">Phone</label>
              <input type="text" name="phone" class="input" value="${m.phone || ''}" />
            </div>
            <div class="bento-col-6 form-group">
              <label class="form-label">Validity Date</label>
              <input type="date" name="validity_date" class="input" required value="${m.validity_date}" />
            </div>
            <div class="bento-col-6 form-group">
              <label class="form-label">Reset Password (Optional)</label>
              <input type="text" name="password" class="input" placeholder="Leave blank to keep current" />
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
    showToast('Failed to load member profile', 'danger');
  }
}

async function submitEditMember(e, userId) {
  e.preventDefault();
  const form = e.target;
  const formData = new FormData(form);
  const data = Object.fromEntries(formData.entries());

  try {
    const res = await fetch(`/api/members/${userId}`, {
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
      loadMembersAdminTable();
    } else {
      showToast(result.message, 'danger');
    }
  } catch (err) {
    showToast('Failed to update member: ' + err.message, 'danger');
  }
}

// Print ID Card Modal
async function openPrintIdCardModal(userId) {
  try {
    const res = await fetch(`/api/members/${userId}/id-card`, {
      headers: { 'Authorization': `Bearer ${window.appState.token}` }
    });
    const data = await res.json();
    if (!data.success) return showToast('Failed to generate ID card', 'danger');

    const card = data.card;
    const modalHtml = `
      <div class="modal-header no-print">
        <h3>🪪 Member Digital & Printable ID Card</h3>
        <button class="btn btn-ghost btn-icon" onclick="window.closeModal()">${getIcon('x')}</button>
      </div>
      <div class="modal-body" style="display:flex; justify-content:center; padding:20px;">
        <!-- High-Grade Physical ID Card Layout -->
        <div class="printable-card" style="width:380px; background:linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%); border:2px solid var(--accent-primary); border-radius:18px; padding:24px; color:#ffffff; box-shadow:var(--shadow-lg); position:relative; overflow:hidden;">
          <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.15); padding-bottom:12px; margin-bottom:16px;">
            <div style="display:flex; align-items:center; gap:10px;">
              <div style="width:34px; height:34px; border-radius:8px; background:var(--accent-gradient); display:flex; align-items:center; justify-content:center; font-weight:800; font-size:0.9rem;">
                AIT
              </div>
              <div>
                <div style="font-size:0.85rem; font-weight:800; letter-spacing:0.5px;">APEX INSTITUTE OF TECHNOLOGY</div>
                <div style="font-size:0.68rem; color:rgba(255,255,255,0.7);">Central College Library Card</div>
              </div>
            </div>
            <span class="badge ${card.role === 'faculty' ? 'badge-info' : 'badge-success'}" style="text-transform:uppercase; font-size:0.7rem;">
              ${card.role}
            </span>
          </div>

          <div style="display:flex; gap:16px; margin-bottom:16px; align-items:center;">
            <div style="width:70px; height:70px; border-radius:14px; background:var(--accent-subtle); display:flex; align-items:center; justify-content:center; font-size:2rem; font-weight:800; border:1px solid var(--accent-primary); color:var(--accent-primary);">
              ${card.name.charAt(0)}
            </div>
            <div>
              <div style="font-size:1.15rem; font-weight:800; line-height:1.2;">${card.name}</div>
              <div style="font-size:0.85rem; color:rgba(255,255,255,0.8); margin-top:2px;">${card.department}</div>
              <div style="font-size:0.75rem; color:rgba(255,255,255,0.6);">ID: <strong>${card.member_id}</strong> ${card.semester ? `• ${card.semester}` : ''}</div>
              <div style="font-size:0.72rem; color:rgba(255,255,255,0.6);">Valid Thru: <strong>${card.validity_date}</strong></div>
            </div>
          </div>

          <!-- Barcode & QR Code Section -->
          <div style="background:#ffffff; border-radius:10px; padding:10px; display:flex; justify-content:space-between; align-items:center;">
            <div style="flex:1; display:flex; justify-content:center;">
              ${card.barcode_svg}
            </div>
            <div style="width:60px; height:60px; flex-shrink:0;">
              ${card.qr_svg}
            </div>
          </div>
        </div>
      </div>
      <div class="modal-footer no-print">
        <button class="btn btn-secondary" onclick="window.closeModal()">Close</button>
        <button class="btn btn-primary" onclick="window.print()">${getIcon('printer')} Print ID Card</button>
      </div>
    `;

    window.openModal(modalHtml);
  } catch (e) {
    showToast('Failed to generate ID card', 'danger');
  }
}

// Bulk Import Members Modal
function openBulkImportMembersModal() {
  const modalHtml = `
    <div class="modal-header">
      <h3>📥 Bulk Import Members from CSV</h3>
      <button class="btn btn-ghost btn-icon" onclick="window.closeModal()">${getIcon('x')}</button>
    </div>
    <form id="bulk-import-members-form" onsubmit="submitBulkImportMembers(event)">
      <div class="modal-body">
        <p style="font-size:0.9rem; color:var(--text-secondary); margin-bottom:14px;">
          Upload CSV with headers: <code>member_id, name, role, department, semester, email, phone, validity_date</code>
        </p>
        <div style="border:2px dashed var(--border-strong); border-radius:var(--radius-lg); padding:30px; text-align:center; margin-bottom:14px; background:var(--bg-input);">
          <input type="file" id="bulk-members-file" name="file" accept=".csv" required style="display:block; margin:0 auto;" />
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

async function submitBulkImportMembers(e) {
  e.preventDefault();
  const fileInput = document.getElementById('bulk-members-file');
  if (!fileInput || !fileInput.files[0]) return;

  const formData = new FormData();
  formData.append('file', fileInput.files[0]);

  try {
    const res = await fetch('/api/members/bulk-import', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${window.appState.token}` },
      body: formData
    });
    const result = await res.json();
    if (result.success) {
      showToast(result.message, 'success');
      window.closeModal();
      loadMembersAdminTable();
    } else {
      showToast(result.message, 'danger');
    }
  } catch (err) {
    showToast('Import error: ' + err.message, 'danger');
  }
}

async function toggleMemberStatus(userId, currentStatus) {
  const newStatus = currentStatus === 'active' ? 'deactivated' : 'active';
  try {
    const res = await fetch(`/api/members/${userId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${window.appState.token}`
      },
      body: JSON.stringify({ status: newStatus })
    });
    const result = await res.json();
    if (result.success) {
      showToast(result.message, 'info');
      loadMembersAdminTable();
    }
  } catch (e) {
    showToast('Failed to toggle status', 'danger');
  }
}
