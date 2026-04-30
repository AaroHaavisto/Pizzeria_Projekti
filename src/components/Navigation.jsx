import {Link} from 'react-router-dom';
import {useCustomerSession} from '../contexts/CustomerSessionContext';
import {useCart} from '../contexts/CartContext';

function Navigation() {
  const {customer, logoutCustomer} = useCustomerSession();
  const {itemCount} = useCart();

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
        <Link to="/cart">
          Ostoskori {itemCount > 0 ? `(${itemCount})` : ''}
        </Link>
        <div className="topbar__group">
          <button className="topbar__trigger topbar__button" type="button">
            Käyttäjä
          </button>
          <div className="topbar__dropdown" role="menu" aria-label="Käyttäjä">
            {customer ? (
              <>
                <p className="topbar__userline">Kirjautunut: {customer.name}</p>
                <button
                  className="topbar__button topbar__dropdown-button"
                  type="button"
                  onClick={logoutCustomer}
                >
                  Kirjaudu ulos
                </button>
              </>
            ) : (
              <Link to="/account">Kirjaudu</Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navigation;
