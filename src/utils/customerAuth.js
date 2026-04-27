import {
  loginCustomerRequest,
  registerCustomerRequest,
} from '../api/customerApi';

const SESSION_KEY = 'pizzeria_pro_customer_session';

function safeParse(value, fallback) {
  try {
    return JSON.parse(value) ?? fallback;
  } catch {
    return fallback;
  }
}

function readStorage(key, fallback) {
  if (typeof window === 'undefined') {
    return fallback;
  }

  const rawValue = window.localStorage.getItem(key);

  if (!rawValue) {
    return fallback;
  }

  return safeParse(rawValue, fallback);
}

function writeStorage(key, value) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(value));
}

function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

export function getCurrentCustomer() {
  return readStorage(SESSION_KEY, null);
}

export async function registerCustomer({
  name,
  email,
  password,
  confirmPassword,
}) {
  const trimmedName = name.trim();
  const normalizedEmail = normalizeEmail(email);

  if (!trimmedName) {
    return {ok: false, message: 'Anna asiakkaan nimi.'};
  }

  if (!normalizedEmail) {
    return {ok: false, message: 'Anna sähköpostiosoite.'};
  }

  if (password.length < 6) {
    return {ok: false, message: 'Salasanan on oltava vähintään 6 merkkiä.'};
  }

  if (password !== confirmPassword) {
    return {ok: false, message: 'Salasanat eivät täsmää.'};
  }

  try {
    const result = await registerCustomerRequest({
      name: trimmedName,
      email: normalizedEmail,
      password,
      confirmPassword,
    });

    if (!result.ok) {
      return result;
    }

    return {
      ok: true,
      customer: result.customer,
    };
  } catch {
    return {
      ok: false,
      message: 'Yhteys palvelimeen epäonnistui. Yritä hetken kuluttua uudelleen.',
    };
  }
}

export async function loginCustomer({email, password}) {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail || !password) {
    return {ok: false, message: 'Täytä sähköposti ja salasana.'};
  }

  try {
    const result = await loginCustomerRequest({
      email: normalizedEmail,
      password,
    });

    if (!result.ok || !result.customer) {
      return result.ok
        ? {ok: false, message: 'Tarkista sähköposti ja salasana.'}
        : result;
    }

    writeStorage(SESSION_KEY, result.customer);
    return {ok: true, customer: result.customer};
  } catch {
    return {
      ok: false,
      message: 'Yhteys palvelimeen epäonnistui. Yritä hetken kuluttua uudelleen.',
    };
  }
}

export function logoutCustomer() {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(SESSION_KEY);
}
