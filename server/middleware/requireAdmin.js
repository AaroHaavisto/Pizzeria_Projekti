import {getUserByEmail} from '../db.js';
import {createHttpError, sendError} from '../utils/httpErrors.js';

const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'dev-admin-token';

export async function requireAdmin(req, res, next) {
  const token = req.get('x-admin-token');
  const adminEmail = req.get('x-admin-email');

  if (token === ADMIN_TOKEN) {
    return next();
  }

  if (!adminEmail) {
    return sendError(
      res,
      createHttpError(401, 'UNAUTHORIZED', 'Missing admin credentials')
    );
  }

  try {
    const user = await getUserByEmail(adminEmail);

    if (!user || String(user.role || '').toLowerCase() !== 'admin') {
      return sendError(
        res,
        createHttpError(403, 'FORBIDDEN', 'Admin access required')
      );
    }

    return next();
  } catch (err) {
    return sendError(res, err);
  }
}