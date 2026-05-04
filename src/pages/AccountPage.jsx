import {useEffect, useMemo, useState} from 'react';
import {Link, useLocation} from 'react-router-dom';
import Navigation from '../components/Navigation';
import {useCart} from '../contexts/CartContext';
import {useCustomerSession} from '../contexts/CustomerSessionContext';
import '../css/auth_style.css';

const initialFormState = {
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
};

function AccountPage() {
  const location = useLocation();
  const {
    customer: currentCustomer,
    loginCustomer,
    logoutCustomer,
    registerCustomer,
  } = useCustomerSession();
  const {items: cartItems} = useCart();
  const [mode, setMode] = useState('login');
  const [formData, setFormData] = useState(initialFormState);
  const [feedback, setFeedback] = useState({type: '', message: ''});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isRegistration = mode === 'register';
  const favoriteLocations = [
    {
      name: 'Pizzeria Pro - keskusta',
      description: 'Urho Kekkosen katu 1, 00100 Helsinki',
      href: '/location',
    },
  ];

  const title = useMemo(
    () =>
      currentCustomer
        ? `Tervetuloa takaisin, ${currentCustomer.name}.`
        : isRegistration
          ? 'Luo asiakastili nopeaa tilaamista varten.'
          : 'Kirjaudu sisään ja jatka tilausta siitä mihin jäit.',
    [currentCustomer, isRegistration]
  );

  useEffect(() => {
    if (currentCustomer) {
      return;
    }

    const params = new URLSearchParams(location.search);
    const nextMode = params.get('mode') === 'register' ? 'register' : 'login';
    setMode(nextMode);
  }, [currentCustomer, location.search]);

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
          message: 'Tili luotu onnistuneesti. Voit nyt kirjautua sisään.',
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

      setFeedback({type: 'success', message: 'Kirjautuminen onnistui.'});
      setFormData(initialFormState);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleLogout() {
    logoutCustomer();
    setFeedback({type: 'success', message: 'Olet kirjautunut ulos.'});
  }

  return (
    <div className="account-page">
      <header className="hero hero--account">
        <Navigation />

        <section className="hero__content account-hero" id="kirjautuminen">
          <p className="eyebrow">Asiakastili</p>
          <h1>{title}</h1>
        </section>
      </header>

      <main className="account-layout">
        {currentCustomer ? (
          <aside className="account-panel account-panel--summary account-panel--full">
            <p className="section__label">Tila</p>
            <h2>Asiakastilin yhteenveto</h2>

            <div className="session-card">
              <p>
                <strong>Kirjautunut käyttäjä:</strong> {currentCustomer.name}
              </p>
              <p>
                <strong>Sähköposti:</strong> {currentCustomer.email}
              </p>
            </div>

            <div className="account-dashboard">
              <article className="account-dashboard__card">
                <p className="section__label">Lempi sijainnit</p>
                <h3>Pääsijainti</h3>
                {favoriteLocations.map(locationItem => (
                  <div className="account-dashboard__item" key={locationItem.name}>
                    <p>
                      <strong>{locationItem.name}</strong>
                    </p>
                    <p>{locationItem.description}</p>
                    <Link className="button button--secondary" to={locationItem.href}>
                      Muokkaa
                    </Link>
                  </div>
                ))}
              </article>

              <article className="account-dashboard__card">
                <p className="section__label">Ostoslista</p>
                <h3>Korissa nyt</h3>
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
                        </li>
                      ))}
                  </ul>
                ) : (
                  <p>Ostoslista on tyhjä.</p>
                )}
                <Link className="button button--secondary" to="/cart">
                  Muokkaa
                </Link>
              </article>
            </div>

            <button
              type="button"
              className="button button--secondary session-card__button"
              onClick={handleLogout}
            >
              Kirjaudu ulos
            </button>
          </aside>
        ) : (
          <section className="account-panel account-panel--form account-panel--full">
            <div className="account-panel__tabs" role="tablist" aria-label="Tili">
              <button
                type="button"
                className={`tab-button${isRegistration ? '' : ' tab-button--active'}`}
                onClick={() => handleModeChange('login')}
              >
                Kirjaudu
              </button>
              <button
                type="button"
                className={`tab-button${isRegistration ? ' tab-button--active' : ''}`}
                onClick={() => handleModeChange('register')}
              >
                Rekisteröidy
              </button>
            </div>

            <form className="account-form" onSubmit={handleSubmit}>
              {isRegistration && (
                <label className="field">
                  <span>Nimi</span>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Etunimi Sukunimi"
                    autoComplete="name"
                    required
                  />
                </label>
              )}

              <label className="field">
                <span>Sähköposti</span>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="asiakas@esimerkki.fi"
                  autoComplete="email"
                  required
                />
              </label>

              <label className="field">
                <span>Salasana</span>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Vähintään 6 merkkiä"
                  autoComplete={
                    isRegistration ? 'new-password' : 'current-password'
                  }
                  required
                />
              </label>

              {isRegistration && (
                <label className="field">
                  <span>Vahvista salasana</span>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Kirjoita salasana uudelleen"
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
                  ? 'Lähetetään...'
                  : isRegistration
                    ? 'Luo tili'
                    : 'Kirjaudu sisään'}
              </button>
            </form>
          </section>
        )}
      </main>
    </div>
  );
}

export default AccountPage;
