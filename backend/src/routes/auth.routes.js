import express from 'express';
import {
  verifyPassword,
  createSessionToken,
  verifySessionToken,
  SESSION_TTL_SECONDS,
  getConfigError
} from '../config/authEnv.js';

const router = express.Router();

const MAX_ATTEMPTS = 5;
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;

// In-memory throttle. This is the single door to all the app's data, so brute
// forcing the password should be slow. A restart clears the counter, which is
// acceptable for a single-user app.
const attempts = new Map();

const clientKey = (req) => req.ip || 'unknown';

const isThrottled = (key) => {
  const record = attempts.get(key);
  if (!record) return false;

  if (Date.now() - record.firstAt > ATTEMPT_WINDOW_MS) {
    attempts.delete(key);
    return false;
  }
  return record.count >= MAX_ATTEMPTS;
};

const recordFailure = (key) => {
  const record = attempts.get(key);
  if (!record || Date.now() - record.firstAt > ATTEMPT_WINDOW_MS) {
    attempts.set(key, { count: 1, firstAt: Date.now() });
  } else {
    record.count += 1;
  }
};

/** POST /api/auth/login — exchange the password for a session token. */
router.post('/login', (req, res) => {
  if (getConfigError()) {
    return res.status(500).json({ message: 'Login is not configured on the server' });
  }

  const key = clientKey(req);

  if (isThrottled(key)) {
    return res.status(429).json({
      message: 'Too many attempts. Please try again in 15 minutes.'
    });
  }

  if (!verifyPassword(req.body?.password)) {
    recordFailure(key);
    return res.status(401).json({ message: 'Incorrect password' });
  }

  attempts.delete(key);

  res.json({
    token: createSessionToken(),
    expiresIn: SESSION_TTL_SECONDS
  });
});

/** GET /api/auth/me — validate a stored token on app boot. */
router.get('/me', (req, res) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : null;

  const { valid, expired } = verifySessionToken(token);

  if (!valid) {
    return res.status(401).json({ message: 'Session expired', expired: Boolean(expired) });
  }

  res.json({ authenticated: true, expiresIn: SESSION_TTL_SECONDS });
});

/** POST /api/auth/logout — the token is stateless, so the client discards it. */
router.post('/logout', (req, res) => {
  res.json({ success: true });
});

export default router;