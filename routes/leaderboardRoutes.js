const express = require('express');
const router = express.Router();
const { db, getSetting } = require('../database/db');
const { optionalAuth } = require('../middleware/auth');

// GET /api/leaderboard/departments
router.get('/departments', optionalAuth, (req, res) => {
  if (getSetting('gamification_enabled', '1') !== '1') {
    return res.json({ success: true, enabled: false, departments: [], readers: [] });
  }

  const departments = db.prepare(`
    SELECT
      u.department,
      COUNT(DISTINCT u.id) as student_count,
      COALESCE(SUM(u.books_read_count), 0) as total_books_read,
      COALESCE(AVG(u.reading_streak), 0) as avg_streak
    FROM users u
    WHERE u.role = 'student' AND u.department != 'Library Administration' AND u.department != ''
    GROUP BY u.department
    ORDER BY total_books_read DESC, avg_streak DESC
  `).all();

  return res.json({ success: true, enabled: true, departments });
});

// GET /api/leaderboard/readers (Anonymized top student readers)
router.get('/readers', optionalAuth, (req, res) => {
  if (getSetting('gamification_enabled', '1') !== '1') {
    return res.json({ success: true, enabled: false, readers: [] });
  }

  const users = db.prepare(`
    SELECT id, name, department, semester, reading_streak, books_read_count
    FROM users
    WHERE role = 'student' AND status = 'active' AND (books_read_count > 0 OR reading_streak > 0)
    ORDER BY books_read_count DESC, reading_streak DESC
    LIMIT 20
  `).all();

  // Helper to anonymize name (e.g. "Aarav Sharma" -> "Aarav S.")
  const anonymize = (fullName) => {
    const parts = fullName.trim().split(' ');
    if (parts.length > 1) {
      return `${parts[0]} ${parts[parts.length - 1][0]}.`;
    }
    return fullName;
  };

  const readers = users.map((u, index) => {
    const badges = db.prepare('SELECT badge_key FROM member_badges WHERE member_id = ?').all(u.id).map(b => b.badge_key);
    return {
      rank: index + 1,
      name: anonymize(u.name),
      department: u.department,
      semester: u.semester,
      books_read_count: u.books_read_count,
      reading_streak: u.reading_streak,
      badges
    };
  });

  return res.json({ success: true, enabled: true, readers });
});

module.exports = router;
