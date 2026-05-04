import '../css/menu_style.css';

function PizzaCard({pizza, onAdd, canEdit = false, onEdit}) {
  return (
    <article className="pizza-card">
      <div className="pizza-card__image-wrap">
        <img src={pizza.image} alt={pizza.name + ' pizza'} loading="lazy" />
      </div>
      <div className="pizza-card__content">
        <div className="pizza-card__topline">
          <span className="pizza-card__tag">{pizza.tag}</span>
        </div>
        <h2>{pizza.name}</h2>
        <p>{pizza.description}</p>
        <div className="pizza-card__meta">
          <span className="pizza-card__price">{pizza.price}</span>
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
            <button
              type="button"
              className="button button--secondary pizza-card__button"
              onClick={() => onAdd?.(pizza)}
            >
              Lisää koriin
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

export default PizzaCard;
