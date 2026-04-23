import {createContext, useContext, useMemo, useState} from 'react';
import {
  getCurrentCustomer,
  loginCustomer as loginCustomerApi,
  logoutCustomer as logoutCustomerApi,
  registerCustomer as registerCustomerApi,
} from '../utils/customerAuth';

const CustomerSessionContext = createContext(null);

export function CustomerSessionProvider({children}) {
  const [customer, setCustomer] = useState(() => getCurrentCustomer());

  const value = useMemo(
    () => ({
      customer,
      registerCustomer(formData) {
        const result = registerCustomerApi(formData);

        if (result.ok) {
          setCustomer(result.customer);
        }

        return result;
      },
      loginCustomer(formData) {
        const result = loginCustomerApi(formData);

        if (result.ok) {
          setCustomer(result.customer);
        }

        return result;
      },
      logoutCustomer() {
        logoutCustomerApi();
        setCustomer(null);
      },
    }),
    [customer]
  );

  return (
    <CustomerSessionContext.Provider value={value}>
      {children}
    </CustomerSessionContext.Provider>
  );
}

export function useCustomerSession() {
  const context = useContext(CustomerSessionContext);

  if (!context) {
    throw new Error(
      'useCustomerSession must be used within a CustomerSessionProvider'
    );
  }

  return context;
}
