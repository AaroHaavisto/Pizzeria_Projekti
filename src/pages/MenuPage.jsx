import {useEffect, useState} from 'react';
import {Link} from 'react-router-dom';
import Navigation from '../components/Navigation';
import PizzaCard from '../components/PizzaCard';
import {getWeeklyMenuSections} from '../api/menuApi';
import {useCart} from '../contexts/CartContext';
import '../css/menu_style.css';

function MenuPage() {
  const {addToCart, items, itemCount, totalCents} = useCart();
  const [sections, setSections] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let mounted = true;

    async function loadMenu() {
      try {
        const nextSections = await getWeeklyMenuSections();
        if (mounted) {
          setSections(nextSections);
        }
      } catch {
        if (mounted) {
          setLoadError('Menua ei voitu ladata API:sta. Naytetaan varadata.');
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    loadMenu();

    return () => {
      mounted = false;
    };
  }, []);

  const todaySection = sections.find(section => section.isToday) || sections[0];

  return (
    <div className="menu-page">
      <header className="hero">
        <Navigation />

        <section className="hero__content">
          <p className="eyebrow">Koko valikoima</p>
          <h1 id="menu">Löydä suosikkipizza jokaiseen nälkätasoon.</h1>
          <p className="hero__text menu-hero-text">
            Näet päivän tarjonnan yhdellä silmäyksellä. Lisää tuotteet koriin
            suoraan tästä näkymästä.
          </p>
          <div className="hero__actions">
            <a
              className="button button--primary"
              href={`#${todaySection?.dayId || 'menu'}`}
            >
              Avaa tämän päivän lista
            </a>
            <Link className="button button--secondary" to="/cart">
              Ostoskori {itemCount > 0 ? `(${itemCount})` : ''}
            </Link>
          </div>
          <div className="hero__subactions">
            <Link className="chip-link" to="/">
              Etusivu
            </Link>
            <a className="chip-link" href="#menu-lista">
              Kaikki päivät
            </a>
          </div>
        </section>
      </header>

      <main className="pizza-showcase" aria-label="Pizzeria Pro menu listaus">
        {isLoading ? <p>Ladataan menua...</p> : null}
        {loadError ? <p>{loadError}</p> : null}
        <section className="menu-summary-card">
          <p className="section__label">Tilaus</p>
          <h2>Helppo nouto ja selkeä hinnoittelu</h2>
          <p>
            Ostoskorin summa päivittyy heti, ja erityisruokavaliot näkyvät
            jokaisen tuotteen kortissa.
          </p>
          <div className="menu-summary-card__stats">
            <span>{sections.length} paivan lista</span>
            <span>{itemCount} tuotetta korissa</span>
            <span>
              {(totalCents / 100).toFixed(2).replace('.', ',')} € yhteensä
            </span>
          </div>
          {items.length > 0 ? (
            <div className="menu-summary-card__cart-preview">
              <p className="section__label">Omat ostokset</p>
              <ul>
                {items.slice(0, 3).map(item => (
                  <li key={item.id}>
                    {item.name} x{item.quantity}
                  </li>
                ))}
              </ul>
              {items.length > 3 ? <p>...ja lisää ostoskorissa.</p> : null}
            </div>
          ) : null}
        </section>

        <div className="menu-days" id="menu-lista">
          {sections.map(section => (
            <section
              key={section.dayId}
              className={`day-section${section.isToday ? ' day-section--today' : ''}`}
              id={section.dayId}
            >
              <div className="section__heading">
                <p className="section__label">{section.label}</p>
                <h2>
                  {section.isToday ? 'Tämän päivän lista' : 'Päivän tarjonta'}
                </h2>
              </div>

              <div className="pizza-grid">
                {section.items.map(pizza => (
                  <PizzaCard key={pizza.id} pizza={pizza} onAdd={addToCart} />
                ))}
              </div>
              {section.items.length === 0 ? (
                <p>Talle paivalle ei ole viela annoksia.</p>
              ) : null}
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}

export default MenuPage;
