import '../css/menu_style.css';
import {isLunchOfferActive, applyLunchDiscount, formatEuro} from '../utils/offer';

function PizzaCard({
  pizza,
  onAdd,
  canEdit = false,
  onEdit,
  cartQuantity = 0,
  onQuantityChange,
  anchorId,
}) {
  const isInCart = cartQuantity > 0;
  const priceCents = Number.isFinite(Number(pizza.priceCents)) ? Number(pizza.priceCents) : Math.round((parseFloat(String(pizza.price || '0').replace(',', '.')) || 0) * 100);
  const offerActive = isLunchOfferActive();
  const discountedCents = applyLunchDiscount(priceCents);

  return (
    <article className="pizza-card" id={anchorId}>
      <button
        type="button"
        className="pizza-card__image-button"
        onClick={() => onAdd?.(pizza)}
        aria-label={`Lisää ${pizza.name} koriin`}
      >
        {cartQuantity > 0 ? (
          <span className="pizza-card__quantity-badge" aria-hidden="true">
            {cartQuantity}
          </span>
        ) : null}
        <img src={pizza.image} alt={pizza.name + ' pizza'} loading="lazy" />
      </button>
      <div className="pizza-card__content">
        <div className="pizza-card__topline">
          <span className="pizza-card__tag">{pizza.tag}</span>
        </div>
        <h2>{pizza.name}</h2>
        <p>{pizza.description}</p>
        <div className="pizza-card__meta">
          <div className="pizza-card__price-wrap">
            <span className="pizza-card__price-normal">{formatEuro(priceCents)}</span>
            {offerActive ? (
              <span className="pizza-card__price-discount">{formatEuro(discountedCents)}</span>
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
