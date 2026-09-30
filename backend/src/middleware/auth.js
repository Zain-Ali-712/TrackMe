import { verifySessionToken } from '../config/authEnv.js';

const PUBLIC_PATHS = ['/api/health', '/api/auth/login', '/api/auth/logout', '/api/auth/me'];

const isPublic = (req) => {
  // Mounted with app.use('/api', ...), so req.path is relative to /api.
  // baseUrl + path reconstructs the full path.
  const path = `${req.baseUrl}${req.path}`;
  return PUBLIC_PATHS.some((publicPath) => path === publicPath || path.startsWith(`${publicPath}/`));
};

const extractToken = (req) => {
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) return header.slice(7).trim();

  const cookieToken = req.headers.cookie
    ?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith('trackme_session='));

  return cookieToken ? cookieToken.slice('trackme_session='.length) : null;
};

/**
 * Gate every route except the login endpoints and the health check.
 *
 * The token is stateless (signed, self-expiring), so no session store is
 * needed and this keeps working across Vercel's serverless cold starts.
 */
export function requireAuth(req, res, next) {
  if (isPublic(req)) return next();

  const { valid } = verifySessionToken(extractToken(req));
  if (!valid) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  return next();
}