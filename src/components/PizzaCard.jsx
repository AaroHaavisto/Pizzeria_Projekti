import '../css/menu_style.css';

function PizzaCard({pizza, onAdd}) {
  return (
    <article className="pizza-card">
      <div className="pizza-card__image-wrap">
        <img src={pizza.image} alt={pizza.name + ' pizza'} loading="lazy" />
        {pizza.isToday ? (
          <span className="pizza-card__today">Tänään</span>
        ) : null}
      </div>
      <div className="pizza-card__content">
        <div className="pizza-card__topline">
          <span className="pizza-card__day">{pizza.dayLabel}</span>
          <span className="pizza-card__tag">{pizza.tag}</span>
        </div>
        <h2>{pizza.name}</h2>
        <p>{pizza.description}</p>
        <div className="pizza-card__meta">
          <span className="pizza-card__price">{pizza.price}</span>
          <button
            type="button"
            className="button button--secondary pizza-card__button"
            onClick={() => onAdd?.(pizza)}
          >
            Lisää koriin
          </button>
        </div>
      </div>
    </article>
  );
}

export default PizzaCard;
