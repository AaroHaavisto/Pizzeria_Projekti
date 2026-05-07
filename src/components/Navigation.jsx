import {Link} from 'react-router-dom';
import {useCustomerSession} from '../contexts/CustomerSessionContext';
import {useCart} from '../contexts/CartContext';
import {useLanguage} from '../contexts/LanguageContext';
import {isAdminCustomer} from '../utils/adminAuth';

/**
 * Main navigation bar component.
 * Displays branding, links, user menu, and language switcher.
 * @returns {React.ReactElement} Navigation bar JSX
 */
function Navigation() {
  const {customer, logoutCustomer} = useCustomerSession();
  const {itemCount} = useCart();
  const {language, changeLanguage} = useLanguage();
  const isEnglish = language === 'en';

  const isAdmin = isAdminCustomer(customer);

  return (
    <nav className="topbar" aria-label={isEnglish ? 'Main navigation' : 'Päävalikko'}>
      <Link className="brand" to="/">
        Slice Hunt
      </Link>

      <div className="topbar__links">
        <div className="topbar__group">
          <Link to="/" className="topbar__trigger">
            {isEnglish ? 'Home' : 'Etusivu'}
          </Link>

          <div className="topbar__dropdown" role="menu" aria-label={isEnglish ? 'Home' : 'Etusivu'}>
            <Link to="/">{isEnglish ? 'Overview' : 'Yleiskatsaus'}</Link>
            <Link to="/menu?focus=all#menu-pizzat">{isEnglish ? 'Menu' : 'Menu'}</Link>
          </div>
        </div>

        <Link to="/menu">Menu</Link>
        <Link to="/location">{isEnglish ? 'Location' : 'Sijainti'}</Link>

        <Link to="/cart">
          {isEnglish ? 'Cart' : 'Ostoskori'} {itemCount > 0 ? `(${itemCount})` : ''}
        </Link>

        {isAdmin ? <Link to="/admin">Admin</Link> : null}

        <div className="topbar__group">
          <Link
            className="topbar__trigger topbar__button"
            to={customer ? '/account' : '/account?mode=login#kirjautuminen'}
          >
            {isEnglish ? 'Account' : 'Käyttäjä'}
          </Link>

          <div className="topbar__dropdown" role="menu" aria-label={isEnglish ? 'Account' : 'Käyttäjä'}>
            {customer ? (
              <>
                <p className="topbar__userline">{isEnglish ? 'Signed in:' : 'Kirjautunut:'} {customer.name}</p>
                <p className="topbar__userline">{customer.email}</p>

                <Link className="topbar__dropdown-link" to="/account">
                  {isEnglish ? 'Account details' : 'Tilitiedot'}
                </Link>

                <Link className="topbar__dropdown-link" to="/account#tilaukset">
                  {isEnglish ? 'Orders' : 'Tilaukset'}
                </Link>

                <Link className="topbar__dropdown-link" to="/feedback">
                  {isEnglish ? 'Give feedback' : 'Anna palautetta'}
                </Link>

                {isAdmin ? (
                  <Link className="topbar__dropdown-link" to="/admin">
                    Admin
                  </Link>
                ) : null}

                <button
                  className="topbar__button topbar__dropdown-button"
                  type="button"
                  onClick={logoutCustomer}
                >
                  {isEnglish ? 'Log out' : 'Kirjaudu ulos'}
                </button>
              </>
            ) : (
              <>
                <Link to="/account?mode=login#kirjautuminen">{isEnglish ? 'Log in' : 'Kirjaudu'}</Link>
                <Link to="/account?mode=register#kirjautuminen">
                  {isEnglish ? 'Register' : 'Rekisteröidy'}
                </Link>
              </>
            )}
          </div>
        </div>

        <div className="topbar__group">
          <button
            className="topbar__trigger topbar__button topbar__lang-trigger"
            type="button"
          >
            {language.toUpperCase()}
          </button>

          <div className="topbar__dropdown" role="menu" aria-label={isEnglish ? 'Language' : 'Kieli'}>
            <button
              className={`topbar__button topbar__dropdown-button ${
                language === 'fi' ? 'topbar__lang-active' : ''
              }`}
              type="button"
              onClick={() => changeLanguage('fi')}
            >
              Suomi
            </button>

            <button
              className={`topbar__button topbar__dropdown-button ${
                language === 'en' ? 'topbar__lang-active' : ''
              }`}
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