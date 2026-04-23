import '../css/menu_style.css';

function PizzaCard({pizza}) {
  return (
    <article className="pizza-card">
      <img src={pizza.image} alt={pizza.name + ' pizza'} loading="lazy" />
      <div className="pizza-card__content">
        <h2>{pizza.name}</h2>
        <p>{pizza.description}</p>
        <div className="pizza-card__meta">
          <span>{pizza.tag}</span>
          <span className="pizza-card__price">{pizza.price}</span>
        </div>
      </div>
    </article>
  );
}

export default PizzaCard;
