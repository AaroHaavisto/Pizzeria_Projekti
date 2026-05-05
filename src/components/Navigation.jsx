import {Link} from 'react-router-dom';
import {useCustomerSession} from '../contexts/CustomerSessionContext';
import {useCart} from '../contexts/CartContext';
import {useLanguage} from '../contexts/LanguageContext';

/**
 * Main navigation bar component.
 * Displays branding, links, user menu, and language switcher.
 * @returns {React.ReactElement} Navigation bar JSX
 */
function Navigation() {
  const {customer, logoutCustomer} = useCustomerSession();
  const {itemCount} = useCart();
  const {language, changeLanguage} = useLanguage();

  return (
    <nav className="topbar" aria-label="Päävalikko">
      <Link className="brand" to="/">
        Pizzeria Pro
      </Link>
      <div className="topbar__links">
        <div className="topbar__group">
          <Link to="/" className="topbar__trigger">
            Etusivu
          </Link>
          <div className="topbar__dropdown" role="menu" aria-label="Etusivu">
            <Link to="/">Yleiskatsaus</Link>
            <Link to="/#tarjoukset">Tarjoukset</Link>
          </div>
        </div>
        <Link to="/menu">Menu</Link>
        <Link to="/location">Sijainti</Link>
        <Link to="/cart">
          Ostoskori {itemCount > 0 ? `(${itemCount})` : ''}
        </Link>
        <div className="topbar__group">
          <Link
            className="topbar__trigger topbar__button"
            to={customer ? '/account' : '/account?mode=login#kirjautuminen'}
          >
            Käyttäjä
          </Link>
          <div className="topbar__dropdown" role="menu" aria-label="Käyttäjä">
            {customer ? (
              <>
                <p className="topbar__userline">Kirjautunut: {customer.name}</p>
                <p className="topbar__userline">{customer.email}</p>
                <Link className="topbar__dropdown-link" to="/account">
                  Tilitiedot
                </Link>
                <button
                  className="topbar__button topbar__dropdown-button"
                  type="button"
                  onClick={logoutCustomer}
                >
                  Kirjaudu ulos
                </button>
              </>
            ) : (
              <>
                <Link to="/account?mode=login#kirjautuminen">Kirjaudu</Link>
                <Link to="/account?mode=register#kirjautuminen">
                  Rekisteröidy
                </Link>
              </>
            )}
          </div>
        </div>
        <div className="topbar__group">
          <button className="topbar__trigger topbar__button topbar__lang-trigger" type="button">
            {language.toUpperCase()}
          </button>
          <div className="topbar__dropdown" role="menu" aria-label="Kieli">
            <button
              className={`topbar__button topbar__dropdown-button ${language === 'fi' ? 'topbar__lang-active' : ''}`}
              type="button"
              onClick={() => changeLanguage('fi')}
            >
              Suomi
            </button>
            <button
              className={`topbar__button topbar__dropdown-button ${language === 'en' ? 'topbar__lang-active' : ''}`}
              type="button"
              onClick={() => changeLanguage('en')}
            >
              English
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navigation;
