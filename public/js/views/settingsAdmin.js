// Settings, System Health, Hot Backups & Audit Trail View (Admin & Librarian)

async function renderSettingsAdmin() {
  const container = document.getElementById('main-view-container');
  if (!container) return;

  container.innerHTML = `
    <!-- Top Action Bar -->
    <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px; margin-bottom:24px;">
      <div>
        <h1 style="font-size:1.8rem;">System Settings & Administration</h1>
        <p style="color:var(--text-secondary);">Configure borrowing limits, fine rates, theme accents, hot database backups, and view audit trail</p>
      </div>
      <button class="btn btn-secondary btn-sm" onclick="loadSettingsData()">${getIcon('refreshCw')} Reload Settings</button>
    </div>

    <!-- 1. System Health & RAM Footprint Card -->
    <div id="settings-health-card" class="glass-card" style="padding:20px; margin-bottom:24px;">
      <div class="skeleton" style="height:60px;"></div>
    </div>

    <!-- 2. Circulation Rules & Theme Settings Form -->
    <div class="bento-grid" style="margin-bottom:28px;">
      <!-- Borrowing & Fine Rules -->
      <div class="bento-col-7">
        <div class="glass-card" style="padding:22px;">
          <h2 style="font-size:1.2rem; margin-bottom:6px;">⚙️ Circulation & Borrowing Policy</h2>
          <p style="font-size:0.8rem; color:var(--text-muted); margin-bottom:18px;">Automated rules enforced on student & faculty checkout</p>
          <form id="settings-rules-form" onsubmit="saveCirculationSettings(event)">
            <div class="bento-grid">
              <div class="bento-col-6 form-group">
                <label class="form-label">Student Max Books</label>
                <input type="number" id="set-stu-max" name="student_max_books" class="input" min="1" max="20" required />
              </div>
              <div class="bento-col-6 form-group">
                <label class="form-label">Student Loan Period (Days)</label>
                <input type="number" id="set-stu-days" name="student_loan_days" class="input" min="1" max="90" required />
              </div>
              <div class="bento-col-6 form-group">
                <label class="form-label">Student Max Renewals</label>
                <input type="number" id="set-stu-ren" name="student_max_renewals" class="input" min="0" max="10" required />
              </div>
              <div class="bento-col-6 form-group">
                <label class="form-label">Overdue Fine Rate (₹ / Day)</label>
                <input type="number" step="0.5" id="set-fine-rate" name="fine_per_day" class="input" min="0" required />
              </div>
              <div class="bento-col-4 form-group">
                <label class="form-label">Faculty Max Books</label>
                <input type="number" id="set-fac-max" name="faculty_max_books" class="input" min="1" max="50" required />
              </div>
              <div class="bento-col-4 form-group">
                <label class="form-label">Faculty Loan Period (Days)</label>
                <input type="number" id="set-fac-days" name="faculty_loan_days" class="input" min="1" max="180" required />
              </div>
              <div class="bento-col-4 form-group">
                <label class="form-label">Faculty Max Renewals</label>
                <input type="number" id="set-fac-ren" name="faculty_max_renewals" class="input" min="0" max="10" required />
              </div>
            </div>
            <div style="text-align:right; margin-top:10px;">
              <button type="submit" class="btn btn-primary">Save Circulation Rules</button>
            </div>
          </form>
        </div>
      </div>

      <!-- Theme & Branding Settings -->
      <div class="bento-col-5">
        <div class="glass-card" style="padding:22px;">
          <h2 style="font-size:1.2rem; margin-bottom:6px;">🎨 Visual Identity & Features</h2>
          <p style="font-size:0.8rem; color:var(--text-muted); margin-bottom:18px;">Customize library name and UI accent gradients</p>
          <form id="settings-brand-form" onsubmit="saveBrandingSettings(event)">
            <div class="form-group">
              <label class="form-label">College Library Name</label>
              <input type="text" id="set-lib-name" name="library_name" class="input" required />
            </div>
            <div class="form-group">
              <label class="form-label">Accent Theme Gradient</label>
              <select id="set-theme-accent" name="theme_accent" class="select" onchange="applyLiveAccent(this.value)">
                <option value="violet">💜 Electric Violet (Default)</option>
                <option value="cyan">🩵 Cyber Cyan</option>
                <option value="emerald">💚 Emerald Mint</option>
                <option value="sunset">🌅 Sunset Rose & Amber</option>
                <option value="amber">🔥 Cyber Amber</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Gamification & Reading Streaks</label>
              <select id="set-gamification" name="gamification_enabled" class="select">
                <option value="1">Enabled (Reading Streaks & Badges)</option>
                <option value="0">Disabled</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Kiosk Auto-Reset Timeout (Seconds)</label>
              <input type="number" id="set-kiosk-timeout" name="kiosk_timeout_seconds" class="input" min="15" max="300" value="60" />
            </div>
            <div style="text-align:right; margin-top:10px;">
              <button type="submit" class="btn btn-primary">Save Preferences</button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- 3. SQLite Database Safety: Hot Backup & Restore Hub -->
    <div class="glass-card" style="padding:22px; margin-bottom:28px;">
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:14px; margin-bottom:18px;">
        <div>
          <h2 style="font-size:1.2rem; margin-bottom:4px;">🛡️ SQLite Data Safety & Hot Backups</h2>
          <p style="font-size:0.8rem; color:var(--text-muted);">Instant zero-downtime snapshots of library.db with timestamping and restore</p>
        </div>
        <div style="display:flex; gap:10px;">
          <button class="btn btn-primary btn-sm" onclick="triggerHotBackup()">
            💾 Create Hot Backup Snapshot Now
          </button>
          <button class="btn btn-secondary btn-sm" onclick="openRestoreDatabaseModal()">
            📥 Restore from .db File
          </button>
        </div>
      </div>

      <!-- Backups List -->
      <div id="settings-backups-list" style="display:flex; flex-direction:column; gap:8px;">
        <div class="skeleton" style="height:48px;"></div>
      </div>
    </div>

    <!-- 4. Security Audit Trail Log Viewer -->
    <div class="glass-card" style="padding:22px; margin-bottom:30px;">
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; margin-bottom:16px;">
        <div>
          <h2 style="font-size:1.2rem; margin-bottom:4px;">🔒 Librarian & Admin Audit Trail</h2>
          <p style="font-size:0.8rem; color:var(--text-muted);">Complete immutable log of issues, returns, book additions, and configuration changes</p>
        </div>
        <button class="btn btn-secondary btn-sm" onclick="loadAuditLogs()">${getIcon('refreshCw')} Refresh Logs</button>
      </div>
      <div class="data-table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Staff User</th>
              <th>Action</th>
              <th>Entity</th>
              <th>Details</th>
              <th>IP Address</th>
            </tr>
          </thead>
          <tbody id="settings-audit-tbody">
            <tr><td colspan="6" style="text-align:center; padding:30px;">Loading audit logs...</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  `;

  loadSettingsData();
  loadAuditLogs();
}

async function loadSettingsData() {
  try {
    const [setRes, healthRes, backupRes] = await Promise.all([
      fetch('/api/system/settings', { headers: { 'Authorization': `Bearer ${window.appState.token}` } }),
      fetch('/api/system/health', { headers: { 'Authorization': `Bearer ${window.appState.token}` } }),
      fetch('/api/system/backups', { headers: { 'Authorization': `Bearer ${window.appState.token}` } })
    ]);

    const setData = await setRes.json();
    const healthData = await healthRes.json();
    const backupData = await backupRes.json();

    // Fill Settings Form
    if (setData.success && setData.settings) {
      const s = setData.settings;
      const setVal = (id, val) => { const el = document.getElementById(id); if (el && val !== undefined) el.value = val; };
      setVal('set-stu-max', s.student_max_books);
      setVal('set-stu-days', s.student_loan_days);
      setVal('set-stu-ren', s.student_max_renewals);
      setVal('set-fine-rate', s.fine_per_day);
      setVal('set-fac-max', s.faculty_max_books);
      setVal('set-fac-days', s.faculty_loan_days);
      setVal('set-fac-ren', s.faculty_max_renewals);
      setVal('set-lib-name', s.library_name);
      setVal('set-theme-accent', s.theme_accent || 'violet');
      setVal('set-gamification', s.gamification_enabled);
      setVal('set-kiosk-timeout', s.kiosk_timeout_seconds || 60);
    }

    // Render Health Card
    const healthCard = document.getElementById('settings-health-card');
    if (healthCard && healthData.success) {
      const lanIps = (healthData.network.lan_ips || []).map(ip => `<code>http://${ip}:3000</code>`).join(' &nbsp;•&nbsp; ');
      healthCard.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:14px;">
          <div>
            <div style="font-size:0.75rem; text-transform:uppercase; font-weight:700; color:var(--color-success); display:flex; align-items:center; gap:6px;">
              <span style="width:8px; height:8px; border-radius:50%; background:var(--color-success);"></span>
              System Operating Normally (Ultra-Low Resource Profile)
            </div>
            <div style="font-size:1.1rem; font-weight:800; margin-top:2px;">
              Memory Footprint: <span style="color:var(--accent-primary);">${healthData.memory.rss_mb} MB RAM</span> (Heap: ${healthData.memory.heap_used_mb} MB)
            </div>
            <div style="font-size:0.8rem; color:var(--text-secondary); margin-top:4px;">
              SQLite WAL Database Size: <strong>${healthData.database.size_kb} KB</strong> • Uptime: <strong>${Math.floor(healthData.uptime_seconds / 60)} min</strong>
            </div>
          </div>
          <div style="font-size:0.8rem; background:var(--bg-input); padding:10px 14px; border-radius:var(--radius-md);">
            <div style="font-weight:700; color:var(--text-primary); margin-bottom:2px;">College LAN URL:</div>
            <div>${lanIps || '<code>http://localhost:3000</code>'}</div>
          </div>
        </div>
      `;
    }

    // Render Backups List
    const backupList = document.getElementById('settings-backups-list');
    if (backupList && backupData.success) {
      if (!backupData.backups || backupData.backups.length === 0) {
        backupList.innerHTML = `<div style="text-align:center; padding:16px; color:var(--text-muted); font-size:0.85rem;">No manual snapshots created yet. Click "Create Hot Backup" above to generate one.</div>`;
      } else {
        backupList.innerHTML = backupData.backups.slice(0, 5).map(b => `
          <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 14px; background:var(--bg-input); border-radius:var(--radius-md); font-size:0.85rem;">
            <div>
              <strong>${b.filename}</strong>
              <div style="font-size:0.75rem; color:var(--text-muted);">${(b.size / 1024).toFixed(1)} KB • Created ${b.created_at.substring(0, 19)}</div>
            </div>
            <button class="btn btn-secondary btn-sm" onclick="window.open('/api/system/backups/download/${b.filename}', '_blank')">
              ${getIcon('download')} Download
            </button>
          </div>
        `).join('');
      }
    }
  } catch (e) {
    showToast('Failed to load settings', 'danger');
  }
}

function applyLiveAccent(accent) {
  document.documentElement.setAttribute('data-accent', accent);
}

async function saveCirculationSettings(e) {
  e.preventDefault();
  const form = e.target;
  const formData = new FormData(form);
  const updates = Object.fromEntries(formData.entries());

  try {
    const res = await fetch('/api/system/settings', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${window.appState.token}`
      },
      body: JSON.stringify(updates)
    });
    const data = await res.json();
    if (data.success) {
      showToast(data.message, 'success');
      loadSettingsData();
    }
  } catch (e) {
    showToast('Failed to save rules', 'danger');
  }
}

async function saveBrandingSettings(e) {
  e.preventDefault();
  const form = e.target;
  const formData = new FormData(form);
  const updates = Object.fromEntries(formData.entries());

  try {
    const res = await fetch('/api/system/settings', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${window.appState.token}`
      },
      body: JSON.stringify(updates)
    });
    const data = await res.json();
    if (data.success) {
      showToast(data.message, 'success');
      localStorage.setItem('lms_accent', updates.theme_accent);
      applyLiveAccent(updates.theme_accent);
      loadSettingsData();
    }
  } catch (e) {
    showToast('Failed to save branding', 'danger');
  }
}

async function triggerHotBackup() {
  try {
    const res = await fetch('/api/system/backup', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${window.appState.token}` }
    });
    const data = await res.json();
    if (data.success) {
      showToast(data.message, 'success');
      loadSettingsData();
    } else {
      showToast(data.message, 'danger');
    }
  } catch (e) {
    showToast('Backup failed: ' + e.message, 'danger');
  }
}

function openRestoreDatabaseModal() {
  const modalHtml = `
    <div class="modal-header">
      <h3>⚠️ Restore Database from Backup File</h3>
      <button class="btn btn-ghost btn-icon" onclick="window.closeModal()">${getIcon('x')}</button>
    </div>
    <form id="restore-db-form" onsubmit="submitRestoreDB(event)">
      <div class="modal-body">
        <div style="background:var(--color-danger-bg); border:1px solid rgba(244,63,94,0.3); border-radius:var(--radius-md); padding:14px; margin-bottom:16px; font-size:0.85rem; color:var(--color-danger);">
          <strong>Warning:</strong> Restoring will replace the active SQLite database with the uploaded file. A safety backup of the current database state will be automatically created first.
        </div>
        <div class="form-group">
          <label class="form-label">Select .db or .sqlite backup file *</label>
          <input type="file" id="restore-file-input" name="file" accept=".db,.sqlite" required class="input" />
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" onclick="window.closeModal()">Cancel</button>
        <button type="submit" class="btn btn-danger">Proceed & Restore Database</button>
      </div>
    </form>
  `;

  window.openModal(modalHtml);
}

async function submitRestoreDB(e) {
  e.preventDefault();
  const fileInput = document.getElementById('restore-file-input');
  if (!fileInput || !fileInput.files[0]) return;

  const formData = new FormData();
  formData.append('file', fileInput.files[0]);

  try {
    const res = await fetch('/api/system/restore', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${window.appState.token}` },
      body: formData
    });
    const data = await res.json();
    if (data.success) {
      showToast(data.message, 'success');
      window.closeModal();
      setTimeout(() => window.location.reload(), 1500);
    } else {
      showToast(data.message, 'danger');
    }
  } catch (e) {
    showToast('Restore error: ' + e.message, 'danger');
  }
}

async function loadAuditLogs() {
  const tbody = document.getElementById('settings-audit-tbody');
  if (!tbody) return;

  try {
    const res = await fetch('/api/system/audit-logs?limit=25', {
      headers: { 'Authorization': `Bearer ${window.appState.token}` }
    });
    const data = await res.json();

    if (!data.success || !data.logs || data.logs.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:30px; color:var(--text-muted);">No audit log entries recorded.</td></tr>`;
      return;
    }

    tbody.innerHTML = data.logs.map(l => `
      <tr>
        <td><span style="font-size:0.75rem; color:var(--text-muted);">${l.created_at.substring(0, 19)}</span></td>
        <td><strong>${l.user_name}</strong></td>
        <td><span class="badge badge-neutral">${l.action}</span></td>
        <td><code>${l.entity_type}</code></td>
        <td style="max-width:300px; font-size:0.85rem;">${l.details}</td>
        <td><code>${l.ip_address}</code></td>
      </tr>
    `).join('');
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--color-danger);">Failed to load audit logs.</td></tr>`;
  }
}
