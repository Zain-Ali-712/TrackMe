import crypto from 'node:crypto';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Auth configuration for a single-user app: one shared password, no email,
 * no user table. The password never leaves the server — only a salted scrypt
 * digest of it is kept, and the browser holds a signed session token.
 */

const SESSION_DAYS = 30;
const SCRYPT_KEYLEN = 64;
// A fixed salt is correct here: there is exactly one password, and a random
// per-user salt buys nothing when there is no user store to keep it in.
const SCRYPT_SALT = 'trackme-static-salt';

const password = process.env.TRACKME_PASSWORD || '';
const sessionSecret = process.env.SESSION_SECRET || '';

let configError = null;
if (!password) configError = 'TRACKME_PASSWORD is not set';
else if (!sessionSecret) configError = 'SESSION_SECRET is not set';
else if (sessionSecret.length < 16) configError = 'SESSION_SECRET must be at least 16 characters';

export const getConfigError = () => configError;

const toBase64Url = (value) => Buffer.from(value, 'utf8').toString('base64url');

const fromBase64Url = (value) => Buffer.from(value, 'base64url').toString('utf8');

/** Derive the stored digest for a password. */
function deriveKey(password) {
  return crypto.scryptSync(password, SCRYPT_SALT, SCRYPT_KEYLEN).toString('hex');
}

// Derived once at boot; scrypt is intentionally slow, so this must not run per request.
const PASSWORD_DIGEST = password ? deriveKey(password) : '';

/**
 * Constant-time password check. A wrong password still pays the full scrypt
 * cost, so response timing doesn't reveal whether the password was close.
 */
export function verifyPassword(candidate) {
  if (!PASSWORD_DIGEST || typeof candidate !== 'string') return false;

  const candidateDigest = Buffer.from(deriveKey(candidate), 'hex');
  const expectedDigest = Buffer.from(PASSWORD_DIGEST, 'hex');

  return (
    candidateDigest.length === expectedDigest.length &&
    crypto.timingSafeEqual(candidateDigest, expectedDigest)
  );
}

export const SESSION_TTL_SECONDS = SESSION_DAYS * 24 * 60 * 60;

/** Create a signed token valid for SESSION_DAYS. */
export function createSessionToken() {
  const payload = toBase64Url(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS }));
  const signature = crypto.createHmac('sha256', sessionSecret).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

/**
 * Verify a token's signature and expiry.
 * @returns {{ valid: boolean, expired?: boolean }}
 */
export function verifySessionToken(token) {
  if (!token || typeof token !== 'string') return { valid: false };

  const separator = token.lastIndexOf('.');
  if (separator <= 0) return { valid: false };

  const payload = token.slice(0, separator);
  const signature = token.slice(separator + 1);

  const expected = crypto.createHmac('sha256', sessionSecret).update(payload).digest('base64url');

  const given = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  // Guard the length before timingSafeEqual, which throws on mismatched sizes.
  if (given.length !== expectedBuffer.length || !crypto.timingSafeEqual(given, expectedBuffer)) {
    return { valid: false };
  }

  try {
    const { exp } = JSON.parse(fromBase64Url(payload));
    if (typeof exp !== 'number' || exp * 1000 <= Date.now()) return { valid: false, expired: true };
    return { valid: true };
  } catch {
    return { valid: false };
  }
}