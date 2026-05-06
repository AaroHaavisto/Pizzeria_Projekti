import {useEffect, useRef, useState} from 'react';
import {useOffer} from '../contexts/OfferContext';
import {isLunchOfferActive, applyLunchDiscount, formatEuro} from '../utils/offer';
import {resolveImageUrl} from '../utils/imageUrls';
import '../css/menu_style.css';

/**
 * Pizza menu card component.
 * Displays pizza item with image, description, price, and cart controls.
 * Supports lunch discount application and edit functionality.
 * 
 * @param {Object} props - Component props
 * @param {Object} props.pizza - Pizza item data
 * @param {Function} props.onAdd - Callback to add pizza to cart
 * @param {boolean} props.canEdit - Whether edit button should be shown
 * @param {Function} props.onEdit - Callback for edit action
 * @param {number} props.cartQuantity - Current quantity in cart
 * @param {Function} props.onQuantityChange - Callback for quantity change
 * @param {string} props.anchorId - HTML id for scroll anchor
 * @param {boolean} props.highlighted - Whether the card is highlighted by routing
 * @returns {React.ReactElement} Pizza card JSX
 */
function PizzaCard({
  pizza,
  onAdd,
  canEdit = false,
  onEdit,
  cartQuantity = 0,
  onQuantityChange,
  anchorId,
  highlighted = false,
}) {
  const {offer} = useOffer();
  const isInCart = cartQuantity > 0;
  const previousQuantityRef = useRef(cartQuantity);
  const [quantityAnimation, setQuantityAnimation] = useState('');
  const [addAnimation, setAddAnimation] = useState('');
  const addAnimationTimeoutRef = useRef(null);
  const priceCents = Number.isFinite(Number(pizza.priceCents)) ? Number(pizza.priceCents) : Math.round((parseFloat(String(pizza.price || '0').replace(',', '.')) || 0) * 100);
  const offerActive = isLunchOfferActive(new Date(), offer);
  const discountedCents = applyLunchDiscount(priceCents, new Date(), offer);

  function handleAdd() {
    if (addAnimationTimeoutRef.current) {
      window.clearTimeout(addAnimationTimeoutRef.current);
    }

    setAddAnimation('pizza-card__image-button--bounce');

    addAnimationTimeoutRef.current = window.setTimeout(() => {
      setAddAnimation('');
    }, 320);

    onAdd?.(pizza);
  }

  useEffect(() => {
    return () => {
      if (addAnimationTimeoutRef.current) {
        window.clearTimeout(addAnimationTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const previousQuantity = previousQuantityRef.current;

    if (previousQuantity !== cartQuantity && cartQuantity > 0) {
      setQuantityAnimation(
        cartQuantity > previousQuantity
          ? 'pizza-card__quantity-badge--grow'
          : 'pizza-card__quantity-badge--shrink'
      );

      const timeoutId = window.setTimeout(() => {
        setQuantityAnimation('');
      }, 220);

      previousQuantityRef.current = cartQuantity;

      return () => window.clearTimeout(timeoutId);
    }

    previousQuantityRef.current = cartQuantity;
  }, [cartQuantity]);

  return (
    <article className={`pizza-card${highlighted ? ' pizza-card--highlighted' : ''}`} id={anchorId}>
      <button
        type="button"
        className={`pizza-card__image-button ${addAnimation}`.trim()}
        onClick={handleAdd}
        aria-label={`Lisää ${pizza.name} koriin`}
      >
        <span className="pizza-card__stars" aria-hidden="true">
          <span className="pizza-card__star pizza-card__star--1" />
          <span className="pizza-card__star pizza-card__star--2" />
          <span className="pizza-card__star pizza-card__star--3" />
          <span className="pizza-card__star pizza-card__star--4" />
        </span>
        {cartQuantity > 0 ? (
          <span
            className={`pizza-card__quantity-badge ${quantityAnimation}`.trim()}
            aria-hidden="true"
          >
            {cartQuantity}
          </span>
        ) : null}
        <img src={resolveImageUrl(pizza.image)} alt={pizza.name + ' pizza'} loading="lazy" />
      </button>
      <div className="pizza-card__content">
        <div className="pizza-card__topline">
          <span className="pizza-card__tag">{pizza.tag}</span>
        </div>
        <h2>{pizza.name}</h2>
        <p>{pizza.description}</p>
        <div className="pizza-card__meta">
          <div className="pizza-card__price-wrap">
            {offerActive ? (
              <>
                <span className="pizza-card__price-old">{formatEuro(priceCents)}</span>
                <span className="pizza-card__price-discount">{formatEuro(discountedCents)}</span>
              </>
            ) : (
              <span className="pizza-card__price-current">{formatEuro(priceCents)}</span>
            )}
          </div>
          <div className="pizza-card__actions">
            {canEdit ? (
              <button
                type="button"
                className="button button--secondary pizza-card__edit"
                onClick={() => onEdit?.(pizza)}
              >
                Muokkaa
              </button>
            ) : null}
            {isInCart ? (
              <div
                className="pizza-card__controls"
                aria-label={`${pizza.name} määrän säätö`}
              >
                <button
                  type="button"
                  className="pizza-card__step-button"
                  onClick={() => onQuantityChange?.(pizza, cartQuantity - 1)}
                  aria-label={`Vähennä tuotetta ${pizza.name}`}
                >
                  -
                </button>
                <input
                  className="pizza-card__quantity-input"
                  type="number"
                  min="0"
                  step="1"
                  inputMode="numeric"
                  value={cartQuantity}
                  onChange={event => {
                    const nextValue =
                      event.target.value === '' ? 0 : Number(event.target.value);
                    onQuantityChange?.(
                      pizza,
                      Number.isFinite(nextValue) ? nextValue : 0
                    );
                  }}
                  aria-label={`${pizza.name} määrä`}
                />
                <button
                  type="button"
                  className="pizza-card__step-button"
                  onClick={() => onQuantityChange?.(pizza, cartQuantity + 1)}
                  aria-label={`Lisää tuotetta ${pizza.name}`}
                >
                  +
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="button button--secondary pizza-card__button"
                onClick={() => onAdd?.(pizza)}
              >
                Lisää koriin
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

export default PizzaCard;
