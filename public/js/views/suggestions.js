// Book Suggestion & Procurement Acquisition Requests View

async function renderSuggestions() {
  const container = document.getElementById('main-view-container');
  if (!container) return;

  const isLibrarian = window.appState.user && ['librarian', 'admin'].includes(window.appState.user.role);

  container.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px; margin-bottom:24px;">
      <div>
        <h1 style="font-size:1.8rem;">Book Acquisition Requests</h1>
        <p style="color:var(--text-secondary);">Faculty and student recommendations for new library titles & textbooks</p>
      </div>
      <button class="btn btn-primary btn-sm" onclick="openSuggestBookModal()">
        ${getIcon('plus')} Suggest New Book
      </button>
    </div>

    <!-- Suggestions Data Table -->
    <div class="data-table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th>Book Title</th>
            <th>Author & Publisher</th>
            <th>Requested By</th>
            <th>Reason / Course Elective</th>
            <th>Status</th>
            ${isLibrarian ? '<th>Librarian Review</th>' : ''}
          </tr>
        </thead>
        <tbody id="suggestions-tbody">
          <tr><td colspan="${isLibrarian ? 6 : 5}" style="text-align:center; padding:30px;">Loading book requests...</td></tr>
        </tbody>
      </table>
    </div>
  `;

  loadSuggestionsList();
}

async function loadSuggestionsList() {
  const tbody = document.getElementById('suggestions-tbody');
  if (!tbody) return;

  const isLibrarian = window.appState.user && ['librarian', 'admin'].includes(window.appState.user.role);

  try {
    const res = await fetch('/api/books/suggestions', {
      headers: { 'Authorization': `Bearer ${window.appState.token}` }
    });
    const data = await res.json();

    if (!data.success || !data.suggestions || data.suggestions.length === 0) {
      tbody.innerHTML = `<tr><td colspan="${isLibrarian ? 6 : 5}" style="text-align:center; padding:40px; color:var(--text-muted);">No book requests submitted yet.</td></tr>`;
      return;
    }

    tbody.innerHTML = data.suggestions.map(s => {
      let statusBadge = '<span class="badge badge-warning">Pending Review</span>';
      if (s.status === 'approved') statusBadge = '<span class="badge badge-success">Approved for Purchase</span>';
      else if (s.status === 'ordered') statusBadge = '<span class="badge badge-info">PO Placed / Ordered</span>';
      else if (s.status === 'added') statusBadge = '<span class="badge badge-success">Added to Stacks</span>';
      else if (s.status === 'rejected') statusBadge = '<span class="badge badge-danger">Not Approved</span>';

      return `
        <tr>
          <td>
            <div style="font-weight:700; color:var(--text-primary);">${s.title}</div>
            <div style="font-size:0.75rem; color:var(--text-muted);">ISBN: ${s.isbn || 'N/A'}</div>
          </td>
          <td>
            <div>${s.author}</div>
            <div style="font-size:0.75rem; color:var(--text-muted);">${s.publisher || 'N/A'}</div>
          </td>
          <td>
            <div style="font-weight:600;">${s.member_name}</div>
            <div style="font-size:0.75rem; color:var(--text-muted);"><code>${s.member_code}</code> • ${s.member_role} (${s.member_dept})</div>
          </td>
          <td>
            <div style="max-width:280px; font-size:0.85rem;">${s.reason || '—'}</div>
            ${s.librarian_notes ? `<div style="font-size:0.75rem; color:var(--accent-primary); margin-top:4px;">Note: ${s.librarian_notes}</div>` : ''}
          </td>
          <td>${statusBadge}</td>
          ${isLibrarian ? `
            <td>
              <select class="select" style="padding:4px 8px; font-size:0.8rem;" onchange="updateSuggestionStatus(${s.id}, this.value)">
                <option value="pending" ${s.status === 'pending' ? 'selected' : ''}>Pending</option>
                <option value="approved" ${s.status === 'approved' ? 'selected' : ''}>Approve</option>
                <option value="ordered" ${s.status === 'ordered' ? 'selected' : ''}>Ordered</option>
                <option value="added" ${s.status === 'added' ? 'selected' : ''}>Added</option>
                <option value="rejected" ${s.status === 'rejected' ? 'selected' : ''}>Reject</option>
              </select>
            </td>
          ` : ''}
        </tr>
      `;
    }).join('');
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--color-danger);">Failed to load suggestions.</td></tr>`;
  }
}

function openSuggestBookModal() {
  if (!window.appState.user) {
    window.openLoginModal();
    showToast('Please log in to submit a book suggestion', 'info');
    return;
  }

  const modalHtml = `
    <div class="modal-header">
      <h3>✨ Suggest Book for Library Acquisition</h3>
      <button class="btn btn-ghost btn-icon" onclick="window.closeModal()">${getIcon('x')}</button>
    </div>
    <form id="suggest-book-form" onsubmit="submitSuggestBook(event)">
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">Book Title *</label>
          <input type="text" name="title" class="input" required placeholder="e.g. Designing Machine Learning Systems" />
        </div>
        <div class="form-group">
          <label class="form-label">Author(s) *</label>
          <input type="text" name="author" class="input" required placeholder="e.g. Chip Huyen" />
        </div>
        <div class="bento-grid">
          <div class="bento-col-6 form-group">
            <label class="form-label">Publisher (Optional)</label>
            <input type="text" name="publisher" class="input" placeholder="e.g. O'Reilly Media" />
          </div>
          <div class="bento-col-6 form-group">
            <label class="form-label">ISBN (Optional)</label>
            <input type="text" name="isbn" class="input" placeholder="e.g. 978-1098135805" />
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Reason / Department Course Reference *</label>
          <textarea name="reason" class="textarea" required placeholder="Describe why this book is recommended (e.g. Required textbook for CS401 semester project)..."></textarea>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" onclick="window.closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">Submit Suggestion</button>
      </div>
    </form>
  `;

  window.openModal(modalHtml);
}

async function submitSuggestBook(e) {
  e.preventDefault();
  const form = e.target;
  const formData = new FormData(form);
  const data = Object.fromEntries(formData.entries());

  try {
    const res = await fetch('/api/books/suggest', {
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
      loadSuggestionsList();
    } else {
      showToast(result.message, 'danger');
    }
  } catch (err) {
    showToast('Failed to submit suggestion', 'danger');
  }
}

async function updateSuggestionStatus(id, status) {
  const notes = prompt(`Enter optional librarian note for status "${status}":`, '');
  try {
    const res = await fetch(`/api/books/suggestions/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${window.appState.token}`
      },
      body: JSON.stringify({ status, librarian_notes: notes || '' })
    });
    const data = await res.json();
    if (data.success) {
      showToast('Status updated', 'success');
      loadSuggestionsList();
    }
  } catch (e) {
    showToast('Failed to update status', 'danger');
  }
}
