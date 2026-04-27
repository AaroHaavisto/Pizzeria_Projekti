import {useMemo, useState} from 'react';
import {Link} from 'react-router-dom';
import Navigation from '../components/Navigation';
import {useCustomerSession} from '../contexts/CustomerSessionContext';
import '../css/auth_style.css';

const initialFormState = {
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
};

function AccountPage() {
  const {
    customer: currentCustomer,
    loginCustomer,
    logoutCustomer,
    registerCustomer,
  } = useCustomerSession();
  const [mode, setMode] = useState('login');
  const [formData, setFormData] = useState(initialFormState);
  const [feedback, setFeedback] = useState({type: '', message: ''});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isRegistration = mode === 'register';

  const title = useMemo(
    () =>
      isRegistration
        ? 'Luo asiakastili nopeaa tilaamista varten.'
        : 'Kirjaudu sisään ja jatka tilausta siitä mihin jäit.',
    [isRegistration]
  );

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
          <p className="hero__text account-hero__text">
            Kirjautuminen nopeuttaa tilaamista ja selkeyttää omien tietojen
            hallintaa.
          </p>
        </section>
      </header>

      <main className="account-layout">
        <section className="account-panel account-panel--form">
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

        <aside className="account-panel account-panel--summary">
          <p className="section__label">Tila</p>
          <h2>Asiakastilin yhteenveto</h2>

          {currentCustomer ? (
            <div className="session-card">
              <p>
                <strong>Kirjautunut käyttäjä:</strong> {currentCustomer.name}
              </p>
              <p>
                <strong>Sähköposti:</strong> {currentCustomer.email}
              </p>
              <p>
                Tilitiedot tallennetaan palvelimen tietokantaan ja
                kirjautumissessio säilytetään paikallisesti selaimessa.
              </p>
              <button
                type="button"
                className="button button--secondary session-card__button"
                onClick={handleLogout}
              >
                Kirjaudu ulos
              </button>
            </div>
          ) : (
            <div className="session-card">
              <p>
                Kirjautumalla asiakas voi myöhemmin hyödyntää nopeaa tilaamista,
                tilahistoriaa ja ostoskoria.
              </p>
              <p>
                <Link className="inline-link" to="/menu">
                  Siirry ruokalistaan
                </Link>{' '}
                ja palaa sitten takaisin jatkamaan kirjautumista.
              </p>
            </div>
          )}
        </aside>
      </main>
    </div>
  );
}

export default AccountPage;
