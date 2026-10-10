const express = require('express');
const router = express.Router();
const { db } = require('../database/db');
const { authenticate, requireRole, optionalAuth } = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');
const { generateCode128SVG, generateQRSVG } = require('../utils/barcode');

// GET /api/events (List events)
router.get('/events', optionalAuth, (req, res) => {
  const events = db.prepare(`
    SELECT e.*,
           (SELECT COUNT(*) FROM guest_passes g WHERE g.event_id = e.id) as total_guests,
           (SELECT COUNT(*) FROM guest_passes g WHERE g.event_id = e.id AND g.status = 'checked_in') as currently_checked_in
    FROM events e
    ORDER BY e.start_time DESC
  `).all();
  return res.json({ success: true, events });
});

// POST /api/events (Create an event)
router.post('/events', authenticate, requireRole('librarian', 'admin'), (req, res) => {
  const {
    title, organizer_name, department, start_time, end_time,
    max_guests = 100, allow_borrowing = 0, max_borrow_hours = 4
  } = req.body;

  if (!title || !organizer_name || !department || !start_time || !end_time) {
    return res.status(400).json({ success: false, message: 'Title, Organizer, Department, and Start/End times are required.' });
  }

  const lastEvent = db.prepare('SELECT id FROM events ORDER BY id DESC LIMIT 1').get();
  const nextId = (lastEvent ? lastEvent.id : 0) + 1;
  const eventCode = `EVT-${new Date().getFullYear()}-${String(nextId).padStart(3, '0')}`;

  const result = db.prepare(`
    INSERT INTO events (
      event_code, title, organizer_name, department,
      start_time, end_time, max_guests, allow_borrowing, max_borrow_hours, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
  `).run(
    eventCode, title.trim(), organizer_name.trim(), department.trim(),
    start_time, end_time, parseInt(max_guests, 10) || 100,
    allow_borrowing ? 1 : 0, parseInt(max_borrow_hours, 10) || 4
  );

  logAudit(req, 'CREATE_EVENT', 'event', result.lastInsertRowid, `Created event "${title}" (${eventCode})`);

  return res.json({
    success: true,
    message: `Event "${title}" created successfully!`,
    eventId: result.lastInsertRowid,
    eventCode
  });
});

// POST /api/events/:id/guest-pass (Generate guest pass)
router.post('/events/:id/guest-pass', authenticate, requireRole('librarian', 'admin'), (req, res) => {
  const eventId = req.params.id;
  const { guest_name, institution = '', email = '', phone = '' } = req.body;

  if (!guest_name) {
    return res.status(400).json({ success: false, message: 'Guest name is required.' });
  }

  const event = db.prepare('SELECT * FROM events WHERE id = ?').get(eventId);
  if (!event) {
    return res.status(404).json({ success: false, message: 'Event not found.' });
  }

  const count = db.prepare('SELECT COUNT(*) as c FROM guest_passes WHERE event_id = ?').get(eventId).c;
  const passCode = `GST-${event.event_code.replace('EVT-', '')}-${String(count + 1).padStart(3, '0')}`;

  const result = db.prepare(`
    INSERT INTO guest_passes (
      pass_code, event_id, guest_name, institution, email, phone,
      valid_from, valid_until, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')
  `).run(
    passCode, eventId, guest_name.trim(), institution.trim(),
    email ? email.trim() : null, phone ? phone.trim() : null,
    event.start_time, event.end_time
  );

  const barcodeSvg = generateCode128SVG(passCode, { height: 40, showText: true });
  const qrSvg = generateQRSVG(`GUEST_PASS:${passCode}:${guest_name}`, 100);

  logAudit(req, 'ISSUE_GUEST_PASS', 'guest_pass', result.lastInsertRowid, `Issued guest pass ${passCode} to ${guest_name}`);

  return res.json({
    success: true,
    message: `Guest pass ${passCode} issued to ${guest_name}!`,
    pass: {
      id: result.lastInsertRowid,
      pass_code: passCode,
      guest_name,
      institution,
      event_title: event.title,
      valid_from: event.start_time,
      valid_until: event.end_time,
      barcode_svg: barcodeSvg,
      qr_svg: qrSvg
    }
  });
});

// GET /api/events/:id/guests (List all passes for an event)
router.get('/events/:id/guests', authenticate, requireRole('librarian', 'admin'), (req, res) => {
  const passes = db.prepare(`
    SELECT g.*, e.title as event_title, e.event_code
    FROM guest_passes g
    JOIN events e ON e.id = g.event_id
    WHERE g.event_id = ?
    ORDER BY g.id DESC
  `).all(req.params.id);

  return res.json({ success: true, passes });
});

// POST /api/guest/check-in
router.post('/guest/check-in', authenticate, requireRole('librarian', 'admin'), (req, res) => {
  const { passCode } = req.body;
  if (!passCode) return res.status(400).json({ success: false, message: 'Pass code is required.' });

  const pass = db.prepare(`
    SELECT g.*, e.title as event_title, e.end_time
    FROM guest_passes g
    JOIN events e ON e.id = g.event_id
    WHERE g.pass_code = ? COLLATE NOCASE
  `).get(passCode.trim());

  if (!pass) return res.status(404).json({ success: false, message: 'Guest pass not found.' });

  const now = new Date();
  if (now > new Date(pass.end_time) || now > new Date(pass.valid_until)) {
    db.prepare("UPDATE guest_passes SET status = 'expired' WHERE id = ?").run(pass.id);
    return res.status(400).json({ success: false, message: `Pass ${pass.pass_code} has expired.` });
  }

  db.prepare(`
    UPDATE guest_passes
    SET status = 'checked_in', check_in_time = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(pass.id);

  logAudit(req, 'GUEST_CHECKIN', 'guest_pass', pass.id, `Guest ${pass.guest_name} (${pass.pass_code}) checked in`);

  return res.json({
    success: true,
    message: `Welcome, ${pass.guest_name}! Checked in for "${pass.event_title}".`,
    guest: pass
  });
});

// POST /api/guest/check-out
router.post('/guest/check-out', authenticate, requireRole('librarian', 'admin'), (req, res) => {
  const { passCode } = req.body;
  if (!passCode) return res.status(400).json({ success: false, message: 'Pass code is required.' });

  const pass = db.prepare('SELECT * FROM guest_passes WHERE pass_code = ? COLLATE NOCASE').get(passCode.trim());
  if (!pass) return res.status(404).json({ success: false, message: 'Guest pass not found.' });

  db.prepare(`
    UPDATE guest_passes
    SET status = 'active', check_out_time = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(pass.id);

  logAudit(req, 'GUEST_CHECKOUT', 'guest_pass', pass.id, `Guest ${pass.guest_name} (${pass.pass_code}) checked out`);

  return res.json({ success: true, message: `Guest ${pass.guest_name} checked out.` });
});

// GET /api/guest/verify/:passCode (Public verification)
router.get('/guest/verify/:passCode', (req, res) => {
  const pass = db.prepare(`
    SELECT g.pass_code, g.guest_name, g.institution, g.valid_from, g.valid_until, g.status,
           e.title as event_title, e.organizer_name, e.allow_borrowing, e.max_borrow_hours
    FROM guest_passes g
    JOIN events e ON e.id = g.event_id
    WHERE g.pass_code = ? COLLATE NOCASE
  `).get(req.params.passCode.trim());

  if (!pass) return res.status(404).json({ success: false, message: 'Invalid pass code.' });

  const now = new Date();
  const isExpired = now > new Date(pass.valid_until);
  const remainingHours = Math.max(0, Math.round((new Date(pass.valid_until) - now) / (1000 * 60 * 60)));

  return res.json({
    success: true,
    pass: {
      ...pass,
      is_expired: isExpired,
      remaining_hours: remainingHours
    }
  });
});

module.exports = router;
