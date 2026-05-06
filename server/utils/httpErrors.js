export function createHttpError(status, code, message, details = []) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  error.details = details;
  return error;
}

export function sendError(res, err) {
  let status = err.status || 500;
  let code = err.code || 'INTERNAL_ERROR';
  let message = err.message || 'Tuntematon virhe';
  const details = Array.isArray(err.details) ? err.details : [];

  const dbConnectionErrorCodes = new Set([
    'ECONNREFUSED',
    'PROTOCOL_CONNECTION_LOST',
    'ER_ACCESS_DENIED_ERROR',
    'ER_BAD_DB_ERROR',
  ]);

  if (status === 500 && dbConnectionErrorCodes.has(err.code)) {
    status = 503;
    code = 'DB_CONNECTION_ERROR';
    message =
      'Tietokantayhteys epäonnistui. Tarkista DB_HOST, DB_PORT, DB_USER, DB_PASSWORD ja DB_NAME.';
  }

  return res.status(status).json({
    error: {
      code,
      message,
      details,
    },
  });
}