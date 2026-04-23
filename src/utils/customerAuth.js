const USERS_KEY = 'pizzeria_pro_customers';
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

function getCustomers() {
  return readStorage(USERS_KEY, []);
}

function saveCustomers(customers) {
  writeStorage(USERS_KEY, customers);
}

export function getCurrentCustomer() {
  return readStorage(SESSION_KEY, null);
}

export function registerCustomer({name, email, password, confirmPassword}) {
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

  const customers = getCustomers();
  const duplicate = customers.find(
    customer => customer.email === normalizedEmail
  );

  if (duplicate) {
    return {ok: false, message: 'Tällä sähköpostilla on jo tili.'};
  }

  const customer = {
    id: crypto.randomUUID(),
    name: trimmedName,
    email: normalizedEmail,
    password,
  };

  saveCustomers([...customers, customer]);
  writeStorage(SESSION_KEY, {
    id: customer.id,
    name: customer.name,
    email: customer.email,
  });

  return {
    ok: true,
    customer: {id: customer.id, name: customer.name, email: customer.email},
  };
}

export function loginCustomer({email, password}) {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail || !password) {
    return {ok: false, message: 'Täytä sähköposti ja salasana.'};
  }

  const customers = getCustomers();
  const customer = customers.find(entry => entry.email === normalizedEmail);

  if (!customer || customer.password !== password) {
    return {ok: false, message: 'Tarkista sähköposti ja salasana.'};
  }

  const sessionCustomer = {
    id: customer.id,
    name: customer.name,
    email: customer.email,
  };

  writeStorage(SESSION_KEY, sessionCustomer);

  return {ok: true, customer: sessionCustomer};
}

export function logoutCustomer() {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(SESSION_KEY);
}
