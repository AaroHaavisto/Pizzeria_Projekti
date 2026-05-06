export function validateCustomerAuthPayload(payload, mode) {
  const errors = [];

  if (!payload || typeof payload !== 'object') {
    return ['Body must be an object'];
  }

  if (mode === 'register') {
    if (!payload.name || typeof payload.name !== 'string' || !payload.name.trim()) {
      errors.push('name is required and must be string');
    }
  }

  if (!payload.email || typeof payload.email !== 'string' || !payload.email.trim()) {
    errors.push('email is required and must be string');
  }

  if (!payload.password || typeof payload.password !== 'string') {
    errors.push('password is required and must be string');
  } else if (mode === 'register' && payload.password.length < 6) {
    errors.push('password must be at least 6 characters');
  }

  if (
    mode === 'register' &&
    payload.confirmPassword != null &&
    payload.password !== payload.confirmPassword
  ) {
    errors.push('confirmPassword must match password');
  }

  return errors;
}