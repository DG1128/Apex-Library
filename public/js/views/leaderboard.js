// Gamification Leaderboard View: Department Rankings & Top Readers

async function renderLeaderboard() {
  const container = document.getElementById('main-view-container');
  if (!container) return;

  container.innerHTML = `
    <!-- Header -->
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px;">
      <div>
        <h1 style="font-size:1.8rem; display:flex; align-items:center; gap:10px;">
          <span>🏆 Library Reading Leaderboard</span>
        </h1>
        <p style="color:var(--text-secondary);">Celebrating campus reading champions and top department literary achievements</p>
      </div>
      <button class="btn btn-secondary btn-sm" onclick="loadLeaderboardData()">${getIcon('refreshCw')} Refresh</button>
    </div>

    <!-- Dual Leaderboards Bento -->
    <div class="bento-grid">
      <!-- 1. Department Champions -->
      <div class="bento-col-6">
        <div class="glass-card" style="padding:22px;">
          <h2 style="font-size:1.2rem; margin-bottom:4px; display:flex; align-items:center; gap:8px;">
            <span>🏛️ Department Rankings</span>
          </h2>
          <p style="font-size:0.8rem; color:var(--text-muted); margin-bottom:16px;">Ranked by total books read by students this academic term</p>
          <div id="leaderboard-depts-list" style="display:flex; flex-direction:column; gap:10px;">
            <div class="skeleton" style="height:70px;"></div>
            <div class="skeleton" style="height:70px;"></div>
            <div class="skeleton" style="height:70px;"></div>
          </div>
        </div>
      </div>

      <!-- 2. Top Student Readers (Anonymized) -->
      <div class="bento-col-6">
        <div class="glass-card" style="padding:22px;">
          <h2 style="font-size:1.2rem; margin-bottom:4px; display:flex; align-items:center; gap:8px;">
            <span>✨ Campus Top Readers</span>
          </h2>
          <p style="font-size:0.8rem; color:var(--text-muted); margin-bottom:16px;">Top student scholars by books completed & active reading streaks</p>
          <div id="leaderboard-readers-list" style="display:flex; flex-direction:column; gap:10px;">
            <div class="skeleton" style="height:70px;"></div>
            <div class="skeleton" style="height:70px;"></div>
            <div class="skeleton" style="height:70px;"></div>
          </div>
        </div>
      </div>
    </div>
  `;

  loadLeaderboardData();
}

async function loadLeaderboardData() {
  try {
    const [deptRes, readerRes] = await Promise.all([
      fetch('/api/leaderboard/departments'),
      fetch('/api/leaderboard/readers')
    ]);

    const deptData = await deptRes.json();
    const readerData = await readerRes.json();

    // 1. Render Departments
    const deptList = document.getElementById('leaderboard-depts-list');
    if (deptList) {
      if (!deptData.enabled) {
        deptList.innerHTML = `<div style="text-align:center; padding:30px; color:var(--text-muted);">Gamification leaderboard is currently disabled by librarian in Settings.</div>`;
      } else if (!deptData.departments || deptData.departments.length === 0) {
        deptList.innerHTML = `<div style="text-align:center; padding:30px; color:var(--text-muted);">No department reading activity recorded yet.</div>`;
      } else {
        const medalEmojis = ['🥇', '🥈', '🥉'];
        deptList.innerHTML = deptData.departments.map((d, index) => `
          <div style="background:var(--bg-input); border-radius:var(--radius-md); padding:14px 18px; display:flex; align-items:center; justify-content:space-between; border:${index === 0 ? '2px solid var(--accent-primary)' : '1px solid var(--border-subtle)'};">
            <div style="display:flex; align-items:center; gap:14px;">
              <div style="font-size:1.5rem; width:32px; text-align:center;">
                ${medalEmojis[index] || `#${index + 1}`}
              </div>
              <div>
                <div style="font-weight:700; font-size:1rem; color:var(--text-primary);">${d.department}</div>
                <div style="font-size:0.75rem; color:var(--text-muted);">${d.student_count} student readers participating</div>
              </div>
            </div>
            <div style="text-align:right;">
              <div style="font-size:1.2rem; font-weight:800; color:var(--accent-primary);">${d.total_books_read}</div>
              <div style="font-size:0.7rem; color:var(--text-muted); text-transform:uppercase;">Books Read</div>
            </div>
          </div>
        `).join('');
      }
    }

    // 2. Render Readers
    const readerList = document.getElementById('leaderboard-readers-list');
    if (readerList) {
      if (!readerData.enabled) {
        readerList.innerHTML = `<div style="text-align:center; padding:30px; color:var(--text-muted);">Gamification leaderboard is currently disabled.</div>`;
      } else if (!readerData.readers || readerData.readers.length === 0) {
        readerList.innerHTML = `<div style="text-align:center; padding:30px; color:var(--text-muted);">No student reading activity yet. Start borrowing books to appear on the leaderboard!</div>`;
      } else {
        const medalEmojis = ['🥇', '🥈', '🥉'];
        const avatarMap = {
          'Aarav Sharma': '/images/avatars/student-aarav.jpg',
          'Diya Patel': '/images/avatars/student-diya.jpg',
          'Rohan Gupta': '/images/avatars/student-rohan.jpg',
          'Ananya Singh': '/images/avatars/student-ananya.jpg'
        };

        readerList.innerHTML = readerData.readers.slice(0, 10).map((r, index) => {
          const avSrc = avatarMap[r.name] || '/images/avatars/student-aarav.jpg';
          return `
          <div style="background:var(--bg-input); border-radius:var(--radius-md); padding:12px 16px; display:flex; align-items:center; justify-content:space-between; border:${index === 0 ? '2px solid var(--color-warning)' : '1px solid var(--border-subtle)'};">
            <div style="display:flex; align-items:center; gap:12px;">
              <div style="font-size:1.4rem; width:28px; text-align:center;">
                ${medalEmojis[index] || `#${r.rank}`}
              </div>
              <img src="${avSrc}" alt="${r.name}" style="width:34px; height:34px; border-radius:50%; object-fit:cover; border:1.5px solid var(--border-strong);" loading="lazy" />
              <div>
                <div style="font-weight:700; font-size:0.95rem;">${r.name}</div>
                <div style="font-size:0.75rem; color:var(--text-muted);">${r.department} ${r.semester ? `(${r.semester})` : ''}</div>
              </div>
            </div>
            <div style="display:flex; align-items:center; gap:16px;">
              <div style="text-align:center;">
                <div style="font-size:0.95rem; font-weight:800; color:var(--color-warning);">🔥 ${r.reading_streak}</div>
                <div style="font-size:0.65rem; color:var(--text-muted);">Streak</div>
              </div>
              <div style="text-align:right;">
                <div style="font-size:1.1rem; font-weight:800; color:var(--text-primary);">${r.books_read_count}</div>
                <div style="font-size:0.65rem; color:var(--text-muted);">Books</div>
              </div>
            </div>
          </div>
        `;
        }).join('');
      }
    }
  } catch (e) {
    showToast('Failed to load leaderboard data', 'danger');
  }
}
