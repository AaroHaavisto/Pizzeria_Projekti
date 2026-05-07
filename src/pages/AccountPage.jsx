import {useEffect, useMemo, useState} from 'react';
import {Link, useLocation} from 'react-router-dom';
import {fetchCustomerOrders} from '../api/orderApi';
import Navigation from '../components/Navigation';
import {useCart} from '../contexts/CartContext';
import {useCustomerSession} from '../contexts/CustomerSessionContext';
import {useLanguage} from '../contexts/LanguageContext';
import '../css/auth_style.css';

const initialFormState = {
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
};

function AccountPage() {
  const location = useLocation();
  const {language} = useLanguage();
  const isEnglish = language === 'en';
  const {
    customer: currentCustomer,
    loginCustomer,
    logoutCustomer,
    registerCustomer,
  } = useCustomerSession();
  const {items: cartItems, cartLimitReached, cartLimitMessage} = useCart();
  const [mode, setMode] = useState('login');
  const [formData, setFormData] = useState(initialFormState);
  const [feedback, setFeedback] = useState({type: '', message: ''});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState('');

  const isRegistration = mode === 'register';
  const favoriteLocations = [
    {
      name: 'Slice Hunt - keskusta',
      description: 'Urho Kekkosen katu 1, 00100 Helsinki',
      href: '/location',
    },
  ];

  const title = useMemo(
    () =>
      currentCustomer
        ? isEnglish
          ? `Welcome back, ${currentCustomer.name}.`
          : `Tervetuloa takaisin, ${currentCustomer.name}.`
        : isRegistration
          ? isEnglish
            ? 'Create an account for faster ordering.'
            : 'Luo asiakastili nopeaa tilaamista varten.'
          : isEnglish
            ? 'Log in and continue your order from where you left off.'
            : 'Kirjaudu sisään ja jatka tilausta siitä mihin jäit.',
    [currentCustomer, isRegistration, isEnglish]
  );

  useEffect(() => {
    if (currentCustomer) {
      return;
    }

    const params = new URLSearchParams(location.search);
    const nextMode = params.get('mode') === 'register' ? 'register' : 'login';
    setMode(nextMode);
  }, [currentCustomer, location.search]);

  useEffect(() => {
    let mounted = true;

    async function loadOrders() {
      if (!currentCustomer?.id) {
        setOrders([]);
        setOrdersError('');
        return;
      }

      try {
        setOrdersLoading(true);
        setOrdersError('');
        const nextOrders = await fetchCustomerOrders(currentCustomer.id);

        if (mounted) {
          setOrders(nextOrders);
        }
      } catch {
        if (mounted) {
          setOrdersError(isEnglish ? 'Unable to load your orders.' : 'Tilausten lataaminen epäonnistui.');
        }
      } finally {
        if (mounted) {
          setOrdersLoading(false);
        }
      }
    }

    loadOrders();

    return () => {
      mounted = false;
    };
  }, [currentCustomer?.id, isEnglish]);

  function resetFeedback() {
    setFeedback({type: '', message: ''});
  }

  function handleChange(event) {
    const {name, value} = event.target;

    setFormData(previous => ({
      ...previous,
      [name]: value,
    }));
  }

  function handleModeChange(nextMode) {
    setMode(nextMode);
    resetFeedback();
    setFormData(initialFormState);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSubmitting(true);

    if (isRegistration) {
      try {
        const result = await registerCustomer({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          confirmPassword: formData.confirmPassword,
        });

        if (!result.ok) {
          setFeedback({type: 'error', message: result.message});
          return;
        }

        setFeedback({
          type: 'success',
          message: isEnglish
            ? 'Account created successfully. You can now log in.'
            : 'Tili luotu onnistuneesti. Voit nyt kirjautua sisään.',
        });
        setFormData(initialFormState);
        setMode('login');
        return;
      } finally {
        setIsSubmitting(false);
      }
    }

    try {
      const result = await loginCustomer({
        email: formData.email,
        password: formData.password,
      });

      if (!result.ok) {
        setFeedback({type: 'error', message: result.message});
        return;
      }

      setFeedback({
        type: 'success',
        message: isEnglish ? 'Log in successful.' : 'Kirjautuminen onnistui.',
      });
      setFormData(initialFormState);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleLogout() {
    logoutCustomer();
    setFeedback({
      type: 'success',
      message: isEnglish ? 'You have been logged out.' : 'Olet kirjautunut ulos.',
    });
  }

  return (
    <div className="account-page">
      <header className="hero hero--account">
        <Navigation />

        <section className="hero__content account-hero" id="kirjautuminen">
          <p className="eyebrow">{isEnglish ? 'Account' : 'Asiakastili'}</p>
          <h1>{title}</h1>
        </section>
      </header>

      <main className="account-layout">
        {currentCustomer ? (
          <aside className="account-panel account-panel--summary account-panel--full">
            <p className="section__label">{isEnglish ? 'Status' : 'Tila'}</p>
            <h2>{isEnglish ? 'Account summary' : 'Asiakastilin yhteenveto'}</h2>

            <div className="session-card">
              <p>
                <strong>{isEnglish ? 'Logged-in user:' : 'Kirjautunut käyttäjä:'}</strong> {currentCustomer.name}
              </p>
              <p>
                <strong>{isEnglish ? 'Email:' : 'Sähköposti:'}</strong> {currentCustomer.email}
              </p>
            </div>

            <div className="account-dashboard">
              <article className="account-dashboard__card">
                <p className="section__label">{isEnglish ? 'Favorite locations' : 'Lempi sijainnit'}</p>
                <h3>{isEnglish ? 'Primary location' : 'Pääsijainti'}</h3>
                {favoriteLocations.map(locationItem => (
                  <div className="account-dashboard__item" key={locationItem.name}>
                    <p>
                      <strong>{locationItem.name}</strong>
                    </p>
                    <p>{locationItem.description}</p>
                    <Link className="button button--secondary" to={locationItem.href}>
                      {isEnglish ? 'Edit' : 'Muokkaa'}
                    </Link>
                  </div>
                ))}
              </article>

              <article className="account-dashboard__card">
                <p className="section__label">{isEnglish ? 'Shopping list' : 'Ostoslista'}</p>
                <h3>{isEnglish ? 'In the cart now' : 'Korissa nyt'}</h3>
                {cartItems.filter(item => item.quantity > 0).length > 0 ? (
                  <ul className="account-dashboard__list">
                    {cartItems
                      .filter(item => item.quantity > 0)
                      .slice(0, 3)
                      .map(item => (
                        <li key={item.id}>
                          <span>
                            {item.name} x{item.quantity}
                          </span>
                          <span>
                            {new Intl.NumberFormat('fi-FI', {style: 'currency', currency: 'EUR'}).format((Number(item.priceCents || 0) * Number(item.quantity || 0)) / 100)}
                          </span>
                        </li>
                      ))}
                  </ul>
                ) : (
                  <p>{isEnglish ? 'The shopping list is empty.' : 'Ostoslista on tyhjä.'}</p>
                )}
                {cartLimitReached ? <p className="cart-limit" role="status">{cartLimitMessage}</p> : null}
                <Link className="button button--secondary" to="/cart">
                  {isEnglish ? 'Edit' : 'Muokkaa'}
                </Link>
              </article>

              <article className="account-dashboard__card account-dashboard__card--orders">
                <p className="section__label">{isEnglish ? 'Orders' : 'Tilaukset'}</p>
                <h3 id="tilaukset">{currentCustomer.name}</h3>

                {ordersLoading ? <p>{isEnglish ? 'Loading orders...' : 'Ladataan tilauksia...'}</p> : null}
                {ordersError ? <p className="feedback feedback--error">{ordersError}</p> : null}

                {!ordersLoading && !ordersError && orders.length > 0 ? (
                  <div className="account-orders">
                    {orders.map(order => (
                      <article id={`order-${order.id}`} className="account-orders__item" key={order.id}>
                        <div className="account-orders__header">
                          <strong>#{order.id}</strong>
                          <span>{new Intl.DateTimeFormat('fi-FI', {dateStyle: 'short', timeStyle: 'short'}).format(new Date(order.createdAt))}</span>
                        </div>
                        <p>
                          {isEnglish ? 'Total' : 'Yhteensä'} {new Intl.NumberFormat('fi-FI', {style: 'currency', currency: 'EUR'}).format(Number(order.totalAmount || 0))}
                        </p>
                        <ul className="account-orders__items">
                          {order.items.map(item => (
                            <li key={item.id}>
                              <span>{item.name} x{item.quantity}</span>
                              <span>
                                {new Intl.NumberFormat('fi-FI', {style: 'currency', currency: 'EUR'}).format(Number(item.discountedUnitPrice ?? item.originalUnitPrice ?? 0))}
                                {' / '}
                                {new Intl.NumberFormat('fi-FI', {style: 'currency', currency: 'EUR'}).format(Number(item.lineTotal || 0))}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </article>
                    ))}
                  </div>
                ) : null}

                {!ordersLoading && !ordersError && orders.length === 0 ? (
                  <p>{isEnglish ? 'No saved orders yet.' : 'Tallennettuja tilauksia ei vielä ole.'}</p>
                ) : null}

                <Link className="button button--secondary" to="/feedback">
                  {isEnglish ? 'Give feedback' : 'Anna palautetta'}
                </Link>
              </article>
            </div>

            <button
              type="button"
              className="button button--secondary session-card__button"
              onClick={handleLogout}
            >
              {isEnglish ? 'Log out' : 'Kirjaudu ulos'}
            </button>
          </aside>
        ) : (
          <section className="account-panel account-panel--form account-panel--full">
            <div className="account-panel__tabs" role="tablist" aria-label={isEnglish ? 'Account' : 'Tili'}>
              <button
                type="button"
                className={`tab-button${isRegistration ? '' : ' tab-button--active'}`}
                onClick={() => handleModeChange('login')}
              >
                {isEnglish ? 'Log in' : 'Kirjaudu'}
              </button>
              <button
                type="button"
                className={`tab-button${isRegistration ? ' tab-button--active' : ''}`}
                onClick={() => handleModeChange('register')}
              >
                {isEnglish ? 'Register' : 'Rekisteröidy'}
              </button>
            </div>

            <form className="account-form" onSubmit={handleSubmit}>
              {isRegistration && (
                <label className="field">
                  <span>{isEnglish ? 'Name' : 'Nimi'}</span>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder={isEnglish ? 'First name Last name' : 'Etunimi Sukunimi'}
                    autoComplete="name"
                    required
                  />
                </label>
              )}

              <label className="field">
                <span>{isEnglish ? 'Email' : 'Sähköposti'}</span>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder={isEnglish ? 'customer@example.com' : 'asiakas@esimerkki.fi'}
                  autoComplete="email"
                  required
                />
              </label>

              <label className="field">
                <span>{isEnglish ? 'Password' : 'Salasana'}</span>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder={isEnglish ? 'At least 6 characters' : 'Vähintään 6 merkkiä'}
                  autoComplete={
                    isRegistration ? 'new-password' : 'current-password'
                  }
                  required
                />
              </label>

              {isRegistration && (
                <label className="field">
                  <span>{isEnglish ? 'Confirm password' : 'Vahvista salasana'}</span>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder={isEnglish ? 'Repeat the password' : 'Kirjoita salasana uudelleen'}
                    autoComplete="new-password"
                    required
                  />
                </label>
              )}

              {feedback.message && (
                <p
                  className={`feedback feedback--${feedback.type}`}
                  role="status"
                >
                  {feedback.message}
                </p>
              )}

              <button
                className="button button--primary account-form__submit"
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? (isEnglish ? 'Sending...' : 'Lähetetään...')
                  : isRegistration
                    ? (isEnglish ? 'Create account' : 'Luo tili')
                    : (isEnglish ? 'Log in' : 'Kirjaudu sisään')}
              </button>
            </form>
          </section>
        )}
      </main>
    </div>
  );
}

export default AccountPage;
