import {useEffect, useRef, useState} from 'react';
import {useCart} from '../contexts/CartContext';
import {useLanguage} from '../contexts/LanguageContext';
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
  const {cartLimitReached, cartLimitMessage} = useCart();
  const {offer} = useOffer();
  const isInCart = cartQuantity > 0;
  const previousQuantityRef = useRef(cartQuantity);
  const [quantityAnimation, setQuantityAnimation] = useState('');
  const [addAnimation, setAddAnimation] = useState('');
  const addAnimationTimeoutRef = useRef(null);
  const cardRef = useRef(null);
  const priceCents = Number.isFinite(Number(pizza.priceCents)) ? Number(pizza.priceCents) : Math.round((parseFloat(String(pizza.price || '0').replace(',', '.')) || 0) * 100);
  const offerActive = isLunchOfferActive(new Date(), offer);
  const discountedCents = applyLunchDiscount(priceCents, new Date(), offer);
  const {language} = useLanguage();

  function handleAdd() {
    if (addAnimationTimeoutRef.current) {
      window.clearTimeout(addAnimationTimeoutRef.current);
    }

    setAddAnimation('pizza-card__image-button--bounce');

    addAnimationTimeoutRef.current = window.setTimeout(() => {
      setAddAnimation('');
    }, 320);

    const result = onAdd?.(pizza);

    if (result && result.ok === false) {
      setAddAnimation('');
      // show temporary warning inside the card
      setAddAnimation('pizza-card__image-button--shake');
      window.setTimeout(() => setAddAnimation(''), 600);
    }

    // spawn decorative stars if add succeeded
    if (!result || result.ok) {
      spawnStars();
    }
  }

  function spawnStars() {
    const container = cardRef.current;
    if (!container) return;

    const count = 7 + Math.floor(Math.random() * 4);
    const rect = container.getBoundingClientRect();
    const colors = ['#FFD54F', '#FFB300', '#FF8A65', '#FF7043', '#E53935'];

    for (let i = 0; i < count; i++) {
      const star = document.createElement('span');
      star.className = 'pizza-star-anim';
      const angle = (Math.random() * 2 - 1) * Math.PI;
      const distance = 45 + Math.random() * 110;
      const dx = Math.round(Math.cos(angle) * distance);
      const dy = Math.round(Math.sin(angle) * distance) - 24;
      const rot = Math.round((Math.random() * 540) * (Math.random() < 0.5 ? -1 : 1));
      const dur = 650 + Math.floor(Math.random() * 650);
      const sizeRoll = Math.random();
      const size = sizeRoll < 0.5 ? 7 + Math.floor(Math.random() * 4) : sizeRoll < 0.85 ? 11 + Math.floor(Math.random() * 4) : 16 + Math.floor(Math.random() * 6);
      const color = colors[Math.floor(Math.random() * colors.length)];
      const isContentOrigin = i % 2 === 0;
      const startX = Math.round(rect.width * (0.18 + Math.random() * 0.64));
      const startY = Math.round(rect.height * (isContentOrigin ? (0.44 + Math.random() * 0.22) : (0.12 + Math.random() * 0.2)));

      star.style.left = `${startX}px`;
      star.style.top = `${startY}px`;
      star.style.width = `${size}px`;
      star.style.height = `${size}px`;
      star.style.color = color;
      star.style.background = '';
      star.style.boxShadow = `0 0 ${Math.max(6, Math.round(size * 0.8))}px ${color}`;
      star.style.setProperty('--tx', `${dx}px`);
      star.style.setProperty('--ty', `${dy}px`);
      star.style.setProperty('--rot', `${rot}deg`);
      star.style.animation = `star-fly ${dur}ms cubic-bezier(.18,.76,.18,1) forwards`;

      container.appendChild(star);

      // cleanup
      window.setTimeout(() => {
        star.remove();
      }, dur + 80);
    }
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
    <article ref={cardRef} className={`pizza-card${highlighted ? ' pizza-card--highlighted' : ''}`} id={anchorId}>
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
        {cartLimitReached ? (
          <div className="pizza-card__limit" aria-hidden="true">{cartLimitMessage}</div>
        ) : null}
        <div className="pizza-card__topline">
          <span className="pizza-card__tag">{Array.isArray(pizza.diet) && pizza.diet.includes('VEG') ? (language === 'en' ? 'Veg' : 'Vege') : (language === 'en' ? 'Meat' : 'Liha')}</span>
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
                {cartQuantity >= 2 ? (
                  <div className="pizza-card__line-total">
                    {offerActive && priceCents > discountedCents ? (
                      <div className="pizza-card__save">{language === 'en' ? `You save ${formatEuro((priceCents - discountedCents) * cartQuantity)}` : `Säästät ${formatEuro((priceCents - discountedCents) * cartQuantity)}`}</div>
                    ) : null}
                    <div className="pizza-card__total">{language === 'en' ? 'Total' : 'Yhteensä'} {formatEuro((offerActive ? discountedCents : priceCents) * cartQuantity)}</div>
                  </div>
                ) : null}
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
                onClick={handleAdd}
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
