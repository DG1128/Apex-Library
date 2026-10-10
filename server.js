const express = require('express');
const path = require('path');
const fs = require('fs');
const { db, getSetting } = require('./database/db');
const { getLocalIpAddresses } = require('./utils/ipHelper');

// Import routes
const authRoutes = require('./routes/authRoutes');
const bookRoutes = require('./routes/bookRoutes');
const memberRoutes = require('./routes/memberRoutes');
const circulationRoutes = require('./routes/circulationRoutes');
const fineRoutes = require('./routes/fineRoutes');
const reservationRoutes = require('./routes/reservationRoutes');
const reportRoutes = require('./routes/reportRoutes');
const systemRoutes = require('./routes/systemRoutes');
const leaderboardRoutes = require('./routes/leaderboardRoutes');
const guestRoutes = require('./routes/guestRoutes');

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

// Middlewares
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files from public directory
app.use(express.static(path.join(__dirname, 'public'), {
  etag: true,
  maxAge: '1h'
}));

// Mount API routes
app.use('/api/auth', authRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/members', memberRoutes);
app.use('/api/circulation', circulationRoutes);
app.use('/api/fines', fineRoutes);
app.use('/api/reservations', reservationRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/system', systemRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api', guestRoutes);

// Fallback SPA routing - serve index.html for all page routes
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ success: false, message: 'API route not found' });
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Central error handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  const status = err.status || 500;
  res.status(status).json({
    success: false,
    message: err.message || 'An unexpected server error occurred.'
  });
});

// Start listening
const server = app.listen(PORT, HOST, () => {
  const libraryName = getSetting('library_name', 'College Library Management System');
  const lanIps = getLocalIpAddresses();
  const memMb = (process.memoryUsage().rss / 1024 / 1024).toFixed(1);

  console.log('\n=============================================================');
  console.log(` 📚 ${libraryName}`);
  console.log('    Next-Gen Ultra-Fast Library Management System (Offline-Ready)');
  console.log('=============================================================');
  console.log(` 🚀 Server running at:`);
  console.log(`    🏠 Local PC:     http://localhost:${PORT}`);
  if (lanIps.length > 0) {
    lanIps.forEach(ip => {
      console.log(`    🌐 College LAN:  http://${ip}:${PORT}`);
    });
  }
  console.log(`\n ⚡ Performance Stats:`);
  console.log(`    💾 Memory Footprint: ${memMb} MB RAM`);
  console.log(`    🗄️  Database: SQLite in WAL Mode (Instant response)`);
  console.log(`    ⚡ FTS5 Full-Text Catalog Index: ACTIVE`);
  console.log(`\n 🔑 Default Demo Accounts:`);
  console.log(`    👑 Admin:     ADMIN001    admin127   (Reset on 1st login)`);
  console.log(`    📚 Librarian: LIB001      password123`);
  console.log(`    🎓 Faculty:   FAC001      password123`);
  console.log(`    📖 Student:   STU2024001  password123`);
  console.log('=============================================================\n');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nGracefully shutting down LMS server...');
  server.close(() => {
    try {
      db.exec('PRAGMA wal_checkpoint(TRUNCATE);');
    } catch (e) {}
    console.log('LMS stopped cleanly.');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  server.close(() => process.exit(0));
});

module.exports = app;
