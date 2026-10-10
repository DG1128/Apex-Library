const { db } = require('../database/db');

const auditStmt = db.prepare(`
  INSERT INTO audit_logs (user_id, user_name, action, entity_type, entity_id, details, ip_address, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
`);

function logAudit(req, action, entityType, entityId, details) {
  try {
    let userId = null;
    let userName = 'System';
    let ip = '127.0.0.1';

    if (req && req.user) {
      userId = req.user.id;
      userName = `${req.user.name} (${req.user.member_id})`;
      ip = req.ip || (req.headers && req.headers['x-forwarded-for']) || '127.0.0.1';
    } else if (typeof req === 'object' && req !== null && req.id) {
      userId = req.id;
      userName = req.name || 'User ' + req.id;
    }

    const detailsStr = typeof details === 'object' ? JSON.stringify(details) : String(details || '');
    auditStmt.run(userId, userName, action, entityType, String(entityId || ''), detailsStr, ip);
  } catch (err) {
    console.error('Audit log error:', err.message);
  }
}

module.exports = {
  logAudit
};
