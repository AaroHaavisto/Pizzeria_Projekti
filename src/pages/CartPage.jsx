import {Link} from 'react-router-dom';
import Navigation from '../components/Navigation';
import {useCart} from '../contexts/CartContext';
import {useCustomerSession} from '../contexts/CustomerSessionContext';
import '../css/cart_style.css';

function formatEuros(priceCents) {
  return new Intl.NumberFormat('fi-FI', {
    style: 'currency',
    currency: 'EUR',
  }).format(priceCents / 100);
}

function CartPage() {
  const {customer} = useCustomerSession();
  const {
    items,
    itemCount,
    totalCents,
    updateQuantity,
    removeFromCart,
    clearCart,
  } = useCart();

  return (
    <div className="cart-page">
      <header className="hero hero--cart">
        <Navigation />

        <section className="hero__content cart-hero">
          <p className="eyebrow">Ostoskori</p>
          <h1>Tarkista tilaus ennen noutoa.</h1>
          <p className="hero__text cart-hero__text">
            Näet tuotteet, määrät ja kokonaissumman heti. Muokkaa tilausta
            nopeasti ilman turhaa selailua.
          </p>
          <div className="hero__actions">
            <Link className="button button--primary" to="/menu">
              Lisää tuotteita
            </Link>
            <Link className="button button--secondary" to="/account">
              {customer ? 'Oma tili' : 'Kirjaudu'}
            </Link>
          </div>
          <div className="hero__subactions">
            <Link className="chip-link" to="/account">
              {customer ? 'Tilitiedot' : 'Kirjaudu sisään'}
            </Link>
            <Link className="chip-link" to="/">
              Etusivulle
            </Link>
          </div>
        </section>
      </header>

      <main className="cart-layout">
        <section className="cart-panel">
          <div className="section__heading">
            <p className="section__label">Korissa</p>
            <h2>{itemCount} tuotetta valmiina</h2>
          </div>

          {items.length > 0 ? (
            <div className="cart-list">
              {items.map(item => (
                <article className="cart-item" key={item.id}>
                  <img src={item.image} alt={item.name} />
                  <div className="cart-item__content">
                    <div className="cart-item__topline">
                      <h3>{item.name}</h3>
                      <button
                        type="button"
                        className="cart-item__remove"
                        onClick={() => removeFromCart(item.id)}
                      >
                        Poista
                      </button>
                    </div>
                    <p>{item.description}</p>
                    <div className="cart-item__controls">
                      <button
                        type="button"
                        className="quantity-button"
                        onClick={() =>
                          updateQuantity(item.id, item.quantity - 1)
                        }
                      >
                        -
                      </button>
                      <span>{item.quantity}</span>
                      <button
                        type="button"
                        className="quantity-button"
                        onClick={() =>
                          updateQuantity(item.id, item.quantity + 1)
                        }
                      >
                        +
                      </button>
                      <strong>
                        {formatEuros(item.priceCents * item.quantity)}
                      </strong>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <h3>Kori on tyhjä.</h3>
              <p>Lisää pizzaa menusta, niin näet ostoskorin toiminnassa.</p>
            </div>
          )}
        </section>

        <aside className="cart-summary">
          <p className="section__label">Yhteenveto</p>
          <h2>{formatEuros(totalCents)}</h2>
          <p>Valmis tilaus näkyy tässä koko ajan.</p>

          <div className="cart-summary__actions">
            <Link className="button button--primary" to="/menu">
              Jatka tilausta
            </Link>
            <button
              className="button button--secondary"
              type="button"
              onClick={clearCart}
            >
              Tyhjennä kori
            </button>
          </div>
        </aside>
      </main>
    </div>
  );
}

export default CartPage;
