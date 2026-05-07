import {useEffect, useMemo, useRef, useState} from 'react';
import {Link} from 'react-router-dom';
import Navigation from '../components/Navigation';
import OrderSuccessModal from '../components/OrderSuccessModal';
import {useCart} from '../contexts/CartContext';
import {useCustomerSession} from '../contexts/CustomerSessionContext';
import {useLanguage} from '../contexts/LanguageContext';
import {useOffer} from '../contexts/OfferContext';
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
  const {language} = useLanguage();
  const isEnglish = language === 'en';
  const {offer} = useOffer();
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
  const [hoveredItems, setHoveredItems] = useState({});
  const [settledZeroItems, setSettledZeroItems] = useState({});
  const zeroTimersRef = useRef(new Map());
  const activeItems = items.filter(item => item.quantity > 0);
  const offerActive = isLunchOfferActive(new Date(), offer);
  const normalTotalCents = activeItems.reduce((sum, it) => sum + (Number(it.priceCents) || 0) * it.quantity, 0);
  const discountedTotalCents = activeItems.reduce(
    (sum, it) => sum + applyLunchDiscount(Number(it.priceCents) || 0, new Date(), offer) * it.quantity,
    0
  );

  const displayItems = useMemo(() => {
    return items
      .map((item, index) => {
        const isSettled = item.quantity === 0 && settledZeroItems[item.id] && !hoveredItems[item.id];

        return {
          ...item,
          order: item.quantity > 0 || !isSettled ? index : index + 1000,
          isSettled,
        };
      })
      .sort((left, right) => left.order - right.order);
  }, [hoveredItems, items, settledZeroItems]);

  useEffect(() => {
    const timers = zeroTimersRef.current;

    for (const [itemId, timerId] of timers.entries()) {
      const currentItem = items.find(entry => entry.id === itemId);
      const isHovered = Boolean(hoveredItems[itemId]);

      if (!currentItem || currentItem.quantity > 0 || isHovered) {
        window.clearTimeout(timerId);
        timers.delete(itemId);
      }
    }

    for (const item of items) {
      const isZero = item.quantity === 0;
      const isHovered = Boolean(hoveredItems[item.id]);

      if (!isZero) {
        if (settledZeroItems[item.id]) {
          setSettledZeroItems(current => {
            const next = {...current};
            delete next[item.id];
            return next;
          });
        }

        continue;
      }

      if (isHovered || settledZeroItems[item.id] || timers.has(item.id)) {
        continue;
      }

      const timeoutId = window.setTimeout(() => {
        setSettledZeroItems(current => ({...current, [item.id]: true}));
        timers.delete(item.id);
      }, 3000);

      timers.set(item.id, timeoutId);
    }
  }, [hoveredItems, items, settledZeroItems]);

  function handleItemHover(itemId, isHovered) {
    setHoveredItems(current => ({
      ...current,
      [itemId]: isHovered,
    }));

    if (!isHovered) {
      return;
    }

    const timerId = zeroTimersRef.current.get(itemId);

    if (timerId) {
      window.clearTimeout(timerId);
      zeroTimersRef.current.delete(itemId);
    }

    setSettledZeroItems(current => {
      if (!current[itemId]) {
        return current;
      }

      const next = {...current};
      delete next[itemId];
      return next;
    });
  }

  async function handleSubmitOrder() {
    try {
      setIsSubmitting(true);
      setErrorMessage('');

      if (activeItems.length === 0) {
        setErrorMessage(isEnglish ? 'The cart is empty. Add items before ordering.' : 'Kori on tyhjä. Lisää tuotteita ennen tilausta.');
        setIsSubmitting(false);
        return;
      }

      const orderItems = activeItems.map(item => ({
        menuItemId: Number(item.id),
        quantity: item.quantity,
        unitPrice: Number.isFinite(Number(item.priceCents)) ? Number(item.priceCents) : 0,
        notes: item.notes || '',
      }));

      const order = await submitOrder({
        customerId: customer?.id || null,
        totalCents: offerActive ? discountedTotalCents : totalCents,
        items: orderItems,
      });

      setSuccessOrder(order);

      clearCart();
    } catch (error) {
      setErrorMessage(
        error.message || (isEnglish ? 'Submitting the order failed. Try again.' : 'Tilauksen lähettäminen epäonnistui. Yritä uudelleen.')
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
          <p className="eyebrow">{isEnglish ? 'Cart' : 'Ostoskori'}</p>
          <h1>{isEnglish ? 'Check your order before pickup.' : 'Tarkista tilaus ennen noutoa.'}</h1>
          <p className="hero__text cart-hero__text">
            {isEnglish
              ? 'See items, quantities, and the total instantly. Edit the order quickly without extra browsing.'
              : 'Näet tuotteet, määrät ja kokonaissumman heti. Muokkaa tilausta nopeasti ilman turhaa selailua.'}
          </p>
          <div className="hero__actions">
            <Link className="button button--primary" to="/menu">
              {isEnglish ? 'Add more items' : 'Lisää tuotteita'}
            </Link>
            <Link className="button button--secondary" to="/account">
              {customer ? (isEnglish ? 'My account' : 'Oma tili') : (isEnglish ? 'Log in' : 'Kirjaudu')}
            </Link>
          </div>
          <div className="hero__subactions">
            <Link className="chip-link" to="/account">
              {customer ? (isEnglish ? 'Account details' : 'Tilitiedot') : (isEnglish ? 'Log in' : 'Kirjaudu sisään')}
            </Link>
            <Link className="chip-link" to="/">
              {isEnglish ? 'Home' : 'Etusivulle'}
            </Link>
          </div>
        </section>
      </header>

      <main className="cart-layout">
        <section className="cart-panel">
          <div className="section__heading">
            <p className="section__label">{isEnglish ? 'In cart' : 'Korissa'}</p>
            <h2>{itemCount} {isEnglish ? 'items ready' : 'tuotetta valmiina'}</h2>
          </div>

          {displayItems.length > 0 ? (
            <div className="cart-list">
              {displayItems.map(item => (
                <article
                  className={`cart-item${item.quantity === 0 ? ' cart-item--inactive' : ''}${item.isSettled ? ' cart-item--settled' : ''}`}
                  key={item.id}
                  onMouseEnter={() => handleItemHover(item.id, true)}
                  onMouseLeave={() => handleItemHover(item.id, false)}
                  style={{order: item.order}}
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
                        {isEnglish ? 'Remove' : 'Poista'}
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
                      <strong className="cart-item__price-line">
                        <span>{isEnglish ? 'Unit' : 'Kpl'} {formatEuros(item.priceCents)}</span>
                        <span>{isEnglish ? 'Line' : 'Rivi'} {offerActive
                          ? formatEuros(applyLunchDiscount(Number(item.priceCents) || 0, new Date(), offer) * item.quantity)
                          : formatEuros(Number(item.priceCents) * item.quantity)}</span>
                      </strong>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <h3>{isEnglish ? 'The cart is empty.' : 'Kori on tyhjä.'}</h3>
              <p>{isEnglish ? 'Add a pizza from the menu to see the cart in action.' : 'Lisää pizzaa menusta, niin näet ostoskorin toiminnassa.'}</p>
            </div>
          )}
        </section>

        <aside className="cart-summary">
          <p className="section__label">{isEnglish ? 'Summary' : 'Yhteenveto'}</p>
          {offerActive ? (
            <>
              <h2 className="cart-summary__discount">{formatEuro(discountedTotalCents)}</h2>
              <p className="cart-summary__normal">{isEnglish ? 'Reg.' : 'Norm.'} {formatEuro(normalTotalCents)}</p>
            </>
          ) : (
            <>
              <h2>{formatEuro(normalTotalCents)}</h2>
              <p>{isEnglish ? 'Your finished order will stay visible here.' : 'Valmis tilaus näkyy tässä koko ajan.'}</p>
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
              {isSubmitting ? (isEnglish ? 'Sending...' : 'Lähetetään...') : (isEnglish ? 'Order now' : 'Tilaa nyt')}
            </button>
            <Link className="button button--secondary" to="/menu">
              {isEnglish ? 'Continue ordering' : 'Jatka tilausta'}
            </Link>
          </div>

          <button
            className="chip-link chip-link--button"
            type="button"
            onClick={clearCart}
            disabled={items.length === 0}
          >
            {isEnglish ? 'Empty cart' : 'Tyhjennä kori'}
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
