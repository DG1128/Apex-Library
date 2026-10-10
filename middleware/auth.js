const jwt = require('jsonwebtoken');
const { db } = require('../database/db');

const JWT_SECRET = process.env.JWT_SECRET || 'lms-super-secure-offline-secret-key-2024';

// Generate JWT token
function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      member_id: user.member_id,
      role: user.role,
      name: user.name,
      department: user.department,
      force_password_change: user.force_password_change
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// Authenticate request token from header or cookie
function authenticate(req, res, next) {
  let token = null;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Authentication required. Please log in.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    // Fetch fresh user record to ensure active status
    const user = db.prepare('SELECT id, member_id, name, email, phone, role, department, semester, force_password_change, validity_date, status, reading_streak, books_read_count FROM users WHERE id = ?').get(decoded.id);

    if (!user || user.status === 'deactivated') {
      return res.status(401).json({ success: false, message: 'Account is invalid or deactivated.' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired session. Please log in again.' });
  }
}

// Optional authentication (for public search that can enrich user info if logged in)
function optionalAuth(req, res, next) {
  let token = null;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = db.prepare('SELECT id, member_id, name, email, phone, role, department, semester, force_password_change, validity_date, status, reading_streak, books_read_count FROM users WHERE id = ?').get(decoded.id);
      if (user && user.status === 'active') {
        req.user = user;
      }
    } catch (e) {
      // Ignore token verification errors for optional auth
    }
  }
  next();
}

// Restrict to specified roles (e.g. ['librarian', 'admin'])
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    // Admin has superuser access to librarian routes
    const userRole = req.user.role;
    const isAllowed = allowedRoles.includes(userRole) || (userRole === 'admin' && allowedRoles.includes('librarian'));

    if (!isAllowed) {
      return res.status(403).json({ success: false, message: `Access denied. Requires role: ${allowedRoles.join(' or ')}.` });
    }

    next();
  };
}

module.exports = {
  JWT_SECRET,
  generateToken,
  authenticate,
  optionalAuth,
  requireRole
};
