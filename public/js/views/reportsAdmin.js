// Comprehensive Reports, Bento Analytics & Data Exports View (Librarian & Admin)

async function renderReportsAdmin() {
  const container = document.getElementById('main-view-container');
  if (!container) return;

  container.innerHTML = `
    <!-- Top Action Bar -->
    <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px; margin-bottom:24px;">
      <div>
        <h1 style="font-size:1.8rem;">Reports & Analytics Dashboard</h1>
        <p style="color:var(--text-secondary);">Real-time circulation trends, overdue intelligence, department metrics, and CSV exports</p>
      </div>
      <div style="display:flex; gap:10px; flex-wrap:wrap;">
        <button class="btn btn-secondary btn-sm" onclick="window.print()">${getIcon('printer')} Print Report</button>
        <button class="btn btn-secondary btn-sm" onclick="loadReportsData()">${getIcon('refreshCw')} Refresh</button>
      </div>
    </div>

    <!-- 1. Bento Stat Cards Grid with Sparklines -->
    <div class="bento-grid" style="margin-bottom:24px;">
      <!-- Total Physical Copies -->
      <div class="bento-col-3">
        <div class="stat-card">
          <div class="stat-card-header">
            <span class="stat-card-title">Total Book Inventory</span>
            <div class="stat-icon">${getIcon('book')}</div>
          </div>
          <div class="stat-value" id="rep-total-copies">—</div>
          <div class="stat-footer">
            <span id="rep-unique-titles">0 unique titles</span>
            <span class="badge badge-success" id="rep-avail-copies">0 available</span>
          </div>
        </div>
      </div>

      <!-- Active Members -->
      <div class="bento-col-3">
        <div class="stat-card">
          <div class="stat-card-header">
            <span class="stat-card-title">Registered Members</span>
            <div class="stat-icon">${getIcon('users')}</div>
          </div>
          <div class="stat-value" id="rep-total-members">—</div>
          <div class="stat-footer">
            <span id="rep-student-faculty-split">0 students • 0 faculty</span>
          </div>
        </div>
      </div>

      <!-- Issued Today -->
      <div class="bento-col-3">
        <div class="stat-card">
          <div class="stat-card-header">
            <span class="stat-card-title">Circulation Today</span>
            <div class="stat-icon" style="background:var(--accent-subtle); color:var(--accent-primary);">${getIcon('repeat')}</div>
          </div>
          <div class="stat-value" id="rep-issued-today">—</div>
          <div class="stat-footer">
            <span id="rep-returned-today">0 returned today</span>
            <div id="rep-sparkline-issues"></div>
          </div>
        </div>
      </div>

      <!-- Overdue Books -->
      <div class="bento-col-3">
        <div class="stat-card">
          <div class="stat-card-header">
            <span class="stat-card-title">Overdue Loans</span>
            <div class="stat-icon" style="background:var(--color-danger-bg); color:var(--color-danger);">${getIcon('alertCircle')}</div>
          </div>
          <div class="stat-value" id="rep-overdue-count" style="color:var(--color-danger);">—</div>
          <div class="stat-footer">
            <span id="rep-fines-collected">₹0.00 fines today</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 2. Dual Visual Charts Bento -->
    <div class="bento-grid" style="margin-bottom:24px;">
      <!-- 7-Day Circulation Volume Trend -->
      <div class="bento-col-8">
        <div class="glass-card" style="padding:22px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
            <div>
              <h3 style="font-size:1.1rem;">7-Day Circulation Volume</h3>
              <p style="font-size:0.8rem; color:var(--text-muted);">Daily issue count (violet) vs return count (green)</p>
            </div>
            <div style="display:flex; gap:12px; font-size:0.8rem;">
              <span style="display:flex; align-items:center; gap:6px;"><span style="width:10px; height:10px; border-radius:50%; background:#8b5cf6;"></span> Issues</span>
              <span style="display:flex; align-items:center; gap:6px;"><span style="width:10px; height:10px; border-radius:50%; background:#10b981;"></span> Returns</span>
            </div>
          </div>
          <div id="rep-trend-chart-container" style="height:220px; display:flex; align-items:center; justify-content:center;">
            <div class="skeleton" style="width:100%; height:180px;"></div>
          </div>
        </div>
      </div>

      <!-- Category Distribution Donut -->
      <div class="bento-col-4">
        <div class="glass-card" style="padding:22px; display:flex; flex-direction:column; justify-content:space-between;">
          <div>
            <h3 style="font-size:1.1rem; margin-bottom:4px;">Top Category Loans</h3>
            <p style="font-size:0.8rem; color:var(--text-muted); margin-bottom:14px;">Distribution of borrowed titles by subject</p>
          </div>
          <div id="rep-donut-chart-container" style="display:flex; justify-content:center; align-items:center; min-height:180px;">
            <div class="skeleton" style="width:160px; height:160px; border-radius:50%;"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- 3. Department Usage & Export Hub -->
    <div class="bento-grid" style="margin-bottom:24px;">
      <!-- Department Usage Ranking -->
      <div class="bento-col-7">
        <div class="glass-card" style="padding:22px;">
          <h3 style="font-size:1.1rem; margin-bottom:6px;">Department Circulation Usage</h3>
          <p style="font-size:0.8rem; color:var(--text-muted); margin-bottom:16px;">Top departments ranked by student & faculty borrowings</p>
          <div id="rep-dept-bars-container">
            <div class="skeleton" style="height:120px;"></div>
          </div>
        </div>
      </div>

      <!-- One-Click CSV Export Cards -->
      <div class="bento-col-5">
        <div class="glass-card" style="padding:22px;">
          <h3 style="font-size:1.1rem; margin-bottom:6px;">📁 One-Click CSV Data Exports</h3>
          <p style="font-size:0.8rem; color:var(--text-muted); margin-bottom:16px;">Download comprehensive spreadsheets for college audits</p>
          <div style="display:flex; flex-direction:column; gap:10px;">
            <button class="btn btn-secondary" style="justify-content:space-between;" onclick="window.open('/api/reports/export/overdue', '_blank')">
              <span>⚠️ Overdue Borrowers Roster</span>
              <span>${getIcon('download')}</span>
            </button>
            <button class="btn btn-secondary" style="justify-content:space-between;" onclick="window.open('/api/reports/export/popular_books', '_blank')">
              <span>📚 Books Catalog & Circulation Ranking</span>
              <span>${getIcon('download')}</span>
            </button>
            <button class="btn btn-secondary" style="justify-content:space-between;" onclick="window.open('/api/reports/export/fines', '_blank')">
              <span>💰 Fines & Fee Revenue Ledger</span>
              <span>${getIcon('download')}</span>
            </button>
            <button class="btn btn-secondary" style="justify-content:space-between;" onclick="window.open('/api/reports/export/members', '_blank')">
              <span>👥 Student & Faculty Member Directory</span>
              <span>${getIcon('download')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 4. Detailed Overdue Loans Action Table -->
    <div style="margin-bottom:30px;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px;">
        <h3 style="font-size:1.2rem; display:flex; align-items:center; gap:8px;">
          <span style="color:var(--color-danger);">${getIcon('alertCircle')}</span>
          <span>Overdue Books Action List</span>
        </h3>
        <button class="btn btn-secondary btn-sm" onclick="window.open('/api/reports/export/overdue', '_blank')">
          ${getIcon('download')} Export Overdue CSV
        </button>
      </div>
      <div class="data-table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>Member Name</th>
              <th>Dept & Role</th>
              <th>Contact</th>
              <th>Book Title</th>
              <th>Due Date</th>
              <th>Days Overdue</th>
              <th>Estimated Fine</th>
            </tr>
          </thead>
          <tbody id="rep-overdue-tbody">
            <tr><td colspan="7" style="text-align:center; padding:30px;">Loading overdue list...</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  `;

  loadReportsData();
}

async function loadReportsData() {
  try {
    // 1. Dashboard Stats & Charts
    const dashRes = await fetch('/api/reports/dashboard', {
      headers: { 'Authorization': `Bearer ${window.appState.token}` }
    });
    const dashData = await dashRes.json();

    if (dashData.success) {
      document.getElementById('rep-total-copies').textContent = dashData.books.total_copies;
      document.getElementById('rep-unique-titles').textContent = `${dashData.books.total_titles} unique titles`;
      document.getElementById('rep-avail-copies').textContent = `${dashData.books.available_copies} available`;

      document.getElementById('rep-total-members').textContent = dashData.members.total_members;
      document.getElementById('rep-student-faculty-split').textContent = `${dashData.members.student_count} students • ${dashData.members.faculty_count} faculty`;

      document.getElementById('rep-issued-today').textContent = dashData.today.issued_today;
      document.getElementById('rep-returned-today').textContent = `${dashData.today.returned_today} returned today`;

      document.getElementById('rep-overdue-count').textContent = dashData.overdue.overdue_count;
      document.getElementById('rep-fines-collected').textContent = `₹${dashData.fines.fines_today.toFixed(2)} fines collected today`;

      // Sparkline
      const sparkIssues = (dashData.sparkline || []).map(s => s.issues);
      document.getElementById('rep-sparkline-issues').innerHTML = renderSparklineSVG(sparkIssues, '#8b5cf6', 90, 24);

      // 7-day trend chart
      const trendContainer = document.getElementById('rep-trend-chart-container');
      if (trendContainer) {
        trendContainer.innerHTML = renderCirculationTrendSVG(dashData.sparkline, 640, 200);
      }

      // Donut chart
      const donutContainer = document.getElementById('rep-donut-chart-container');
      if (donutContainer) {
        donutContainer.innerHTML = renderDonutChartSVG(dashData.topCategories, 170);
      }

      // Department usage bars
      const deptContainer = document.getElementById('rep-dept-bars-container');
      if (deptContainer) {
        deptContainer.innerHTML = renderHorizontalBars(dashData.deptUsage);
      }
    }

    // 2. Overdue Table
    const overdueRes = await fetch('/api/reports/overdue', {
      headers: { 'Authorization': `Bearer ${window.appState.token}` }
    });
    const overdueData = await overdueRes.json();

    const tbody = document.getElementById('rep-overdue-tbody');
    if (tbody) {
      if (!overdueData.success || !overdueData.overdue || overdueData.overdue.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:30px; color:var(--color-success);">🎉 Great news! There are currently zero overdue books!</td></tr>`;
      } else {
        tbody.innerHTML = overdueData.overdue.map(o => `
          <tr>
            <td>
              <div style="font-weight:700;">${o.member_name}</div>
              <div style="font-size:0.75rem; color:var(--text-muted);"><code>${o.member_code}</code></div>
            </td>
            <td>
              <div>${o.member_dept}</div>
              <span class="badge badge-neutral" style="text-transform:capitalize; font-size:0.7rem;">${o.role || o.member_role}</span>
            </td>
            <td>
              <div>${o.member_phone || '—'}</div>
              <div style="font-size:0.75rem; color:var(--text-muted);">${o.member_email || ''}</div>
            </td>
            <td>
              <div style="font-weight:600;">${o.book_title}</div>
              <div style="font-size:0.75rem; color:var(--text-muted);">Shelf: ${o.shelf_location}</div>
            </td>
            <td><strong>${o.due_date.substring(0, 10)}</strong></td>
            <td>
              <span class="badge badge-danger">
                ${o.days_overdue} days overdue
              </span>
            </td>
            <td>
              <strong style="color:var(--color-danger); font-size:1rem;">₹${o.estimated_fine.toFixed(2)}</strong>
            </td>
          </tr>
        `).join('');
      }
    }
  } catch (e) {
    showToast('Failed to load report analytics', 'danger');
  }
}
