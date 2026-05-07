function normalizeBaseUrl(value, fallback) {
  const rawValue = String(value || fallback || '').trim();

  return rawValue.replace(/\/+$/u, '');
}

export function getTestConfig() {
  return {
    appUrl: normalizeBaseUrl(process.env.TEST_APP_URL, 'http://localhost:5173'),
    apiUrl: normalizeBaseUrl(process.env.TEST_API_URL, 'http://localhost:3005/api'),
  };
}