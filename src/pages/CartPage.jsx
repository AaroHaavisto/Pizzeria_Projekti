import {useState} from 'react';
import {Link} from 'react-router-dom';
import Navigation from '../components/Navigation';
import OrderSuccessModal from '../components/OrderSuccessModal';
import {useCart} from '../contexts/CartContext';
import {useCustomerSession} from '../contexts/CustomerSessionContext';
import {submitOrder} from '../api/orderApi';
import '../css/cart_style.css';
import {isLunchOfferActive, applyLunchDiscount, formatEuro} from '../utils/offer';

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
  

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successOrder, setSuccessOrder] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const activeItems = items.filter(item => item.quantity > 0);
  const sortedItems = [...items].sort((left, right) => {
    const leftActive = left.quantity > 0 ? 0 : 1;
    const rightActive = right.quantity > 0 ? 0 : 1;

    if (leftActive !== rightActive) {
      return leftActive - rightActive;
    }

    return 0;
  });
  const offerActive = isLunchOfferActive();
  const normalTotalCents = activeItems.reduce((sum, it) => sum + (Number(it.priceCents) || 0) * it.quantity, 0);
  const discountedTotalCents = activeItems.reduce(
    (sum, it) => sum + applyLunchDiscount(Number(it.priceCents) || 0) * it.quantity,
    0
  );

  async function handleSubmitOrder() {
    try {
      setIsSubmitting(true);
      setErrorMessage('');

      if (activeItems.length === 0) {
        setErrorMessage('Kori on tyhjä. Lisää tuotteita ennen tilausta.');
        setIsSubmitting(false);
        return;
      }

      const orderItems = activeItems.map(item => ({
        menuItemId: Number(item.id),
        quantity: item.quantity,
        unitPrice: item.priceCents,
        notes: item.notes || '',
      }));

      const order = await submitOrder({
        customerId: customer?.id || null,
        totalCents,
        items: orderItems,
      });

      setSuccessOrder(order);

      clearCart();
    } catch (error) {
      setErrorMessage(
        error.message || 'Tilauksen lähettäminen epäonnistui. Yritä uudelleen.'
      );
    } finally {
      setIsSubmitting(false);
    }
  }

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

          {sortedItems.length > 0 ? (
            <div className="cart-list">
              {sortedItems.map(item => (
                <article
                  className={`cart-item${item.quantity === 0 ? ' cart-item--inactive' : ''}`}
                  key={item.id}
                >
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
                      <input
                        className="cart-item__quantity-input"
                        type="number"
                        min="0"
                        step="1"
                        inputMode="numeric"
                        value={item.quantity}
                        onChange={event =>
                          updateQuantity(
                            item.id,
                            event.target.value === ''
                              ? 0
                              : Number(event.target.value)
                          )
                        }
                        aria-label={`${item.name} määrä`}
                      />
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
          {offerActive ? (
            <>
              <h2 className="cart-summary__discount">{formatEuro(discountedTotalCents)}</h2>
              <p className="cart-summary__normal">Norm. {formatEuro(normalTotalCents)}</p>
            </>
          ) : (
            <>
              <h2>{formatEuro(normalTotalCents)}</h2>
              <p>Valmis tilaus näkyy tässä koko ajan.</p>
            </>
          )}

          {errorMessage && (
            <p className="cart-error-message" role="alert">
              {errorMessage}
            </p>
          )}

          <div className="cart-summary__actions">
            <button
              className="button button--primary"
              type="button"
              onClick={handleSubmitOrder}
              disabled={activeItems.length === 0 || isSubmitting}
            >
              {isSubmitting ? 'Lähetetään...' : 'Tilaa nyt'}
            </button>
            <Link className="button button--secondary" to="/menu">
              Jatka tilausta
            </Link>
          </div>

          <button
            className="chip-link chip-link--button"
            type="button"
            onClick={clearCart}
            disabled={items.length === 0}
          >
            Tyhjennä kori
          </button>
        </aside>

        <OrderSuccessModal
          order={successOrder}
          onClose={() => setSuccessOrder(null)}
        />
      </main>
    </div>
  );
}

export default CartPage;
