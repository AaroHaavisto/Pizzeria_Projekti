const CUSTOMER_REGISTER_ENDPOINT = '/api/customers/register';
const CUSTOMER_LOGIN_ENDPOINT = '/api/customers/login';

async function parseJsonSafely(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function toKnownError(payload, fallbackMessage) {
  const message = payload?.error?.message || payload?.message || fallbackMessage;
  return {ok: false, message};
}

export async function registerCustomerRequest(formData) {
  const response = await fetch(CUSTOMER_REGISTER_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(formData),
  });

  const payload = await parseJsonSafely(response);

  if (!response.ok) {
    return toKnownError(payload, 'Tilin luominen epäonnistui.');
  }

  return {ok: true, customer: payload?.customer ?? null};
}

export async function loginCustomerRequest(formData) {
  const response = await fetch(CUSTOMER_LOGIN_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(formData),
  });

  const payload = await parseJsonSafely(response);

  if (!response.ok) {
    return toKnownError(payload, 'Kirjautuminen epäonnistui.');
  }

  return {ok: true, customer: payload?.customer ?? null};
}
