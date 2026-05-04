import {getCurrentCustomer} from './customerAuth';

export function isAdminCustomer(customer) {
  return Boolean(customer && String(customer.role || '').toLowerCase() === 'admin');
}

export function getAdminRequestHeaders() {
  const customer = getCurrentCustomer();

  if (!isAdminCustomer(customer)) {
    return {};
  }

  return {
    'x-admin-email': customer.email,
  };
}