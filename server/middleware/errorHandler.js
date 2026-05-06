import {sendError} from '../utils/httpErrors.js';

export function errorHandler(err, _req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  return sendError(res, err);
}