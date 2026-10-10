// Lightweight in-memory rate limiter with zero dependencies

const loginAttempts = new Map();
const WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const MAX_ATTEMPTS = 15; // 15 attempts per window

// Clean up expired buckets periodically
setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of loginAttempts.entries()) {
    if (now - data.resetTime > 0) {
      loginAttempts.delete(ip);
    }
  }
}, 60 * 1000).unref();

function rateLimitLogin(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const now = Date.now();

  let entry = loginAttempts.get(ip);
  if (!entry || now > entry.resetTime) {
    entry = { count: 0, resetTime: now + WINDOW_MS };
    loginAttempts.set(ip, entry);
  }

  if (entry.count >= MAX_ATTEMPTS) {
    const retryAfterSec = Math.ceil((entry.resetTime - now) / 1000);
    return res.status(429).json({
      success: false,
      message: `Too many login attempts. Please try again in ${retryAfterSec} seconds.`
    });
  }

  // Hook into response to increment on failure
  res.on('finish', () => {
    if (res.statusCode === 401 || res.statusCode === 400) {
      entry.count += 1;
    } else if (res.statusCode === 200) {
      loginAttempts.delete(ip);
    }
  });

  next();
}

module.exports = {
  rateLimitLogin
};
