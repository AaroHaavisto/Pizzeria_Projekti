import {useEffect, useState} from 'react';
import {Link} from 'react-router-dom';
import Navigation from '../components/Navigation';
import PizzaCard from '../components/PizzaCard';
import {
  getWeeklyMenuData,
  getWeeklyMenuSections,
} from '../api/menuApi';
import {useCart} from '../contexts/CartContext';
import '../css/menu_style.css';

function flattenMenuItems(menuData) {
  if (Array.isArray(menuData?.items)) {
    return menuData.items;
  }

  if (Array.isArray(menuData?.days)) {
    return menuData.days.flatMap(day =>
      Array.isArray(day.items) ? day.items : []
    );
  }

  return [];
}

function MenuPage() {
  const {addToCart, items, updateQuantity, itemCount, totalCents} = useCart();

  const [sections, setSections] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [menuFilter, setMenuFilter] = useState('all');

  async function loadMenuData() {
    const [nextSections, nextMenuData] = await Promise.all([
      getWeeklyMenuSections(),
      getWeeklyMenuData(),
    ]);

    flattenMenuItems(nextMenuData);
    setSections(nextSections);
  }

  useEffect(() => {
    let mounted = true;

    async function loadMenu() {
      try {
        setLoadError('');
        await loadMenuData();
      } catch {
        if (mounted) {
          setLoadError('Menun lataaminen epäonnistui.');
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

  const allMenuItems = sections.flatMap(section => section.items);

  const visibleMenuItems = allMenuItems.filter(item => {
    if (menuFilter === 'veg') {
      return Array.isArray(item.diet) && item.diet.includes('VEG');
    }

    if (menuFilter === 'meat') {
      return !(Array.isArray(item.diet) && item.diet.includes('VEG'));
    }

    return true;
  });

  const cartQuantityById = items.reduce((accumulator, item) => {
    accumulator[item.id] = item.quantity;
    return accumulator;
  }, {});

  const previewCartItems = items.filter(item => item.quantity > 0).slice(0, 3);

  const filterHeading =
    menuFilter === 'veg'
      ? 'Vege pizzat'
      : menuFilter === 'meat'
        ? 'Lihapizzat'
        : 'Kaikki pizzat';

  function handleQuantityChange(pizza, nextQuantity) {
    updateQuantity(pizza.id, nextQuantity);
  }

  return (
    <div className="menu-page">
      <header className="hero">
        <Navigation />

        <section className="hero__content">
          <p className="eyebrow">Koko valikoima</p>
          <h1 id="menu">Löydä suosikkipizza jokaiseen nälkätasoon.</h1>
          <p className="hero__text menu-hero-text">
            Suodata pizzat aineiden mukaan.
          </p>

          <div className="hero__actions">
            <Link className="button button--secondary" to="/cart">
              Ostoskori {itemCount > 0 ? `(${itemCount})` : ''}
            </Link>
          </div>

          <div className="hero__subactions">
            <Link className="chip-link" to="/">
              Etusivu
            </Link>
            <Link className="chip-link" to="/location">
              Kartta
            </Link>
          </div>
        </section>
      </header>

      <main className="pizza-showcase" aria-label="Pizzeria Pro menu listaus">
        {isLoading ? <p>Ladataan menua...</p> : null}
        {loadError ? <p>{loadError}</p> : null}

        <section className="menu-summary-card">
          <p className="section__label">Tilaus</p>
          <h2>Helppo nouto ja selkeä hinnoittelu</h2>

          <div className="menu-summary-card__stats">
            <span>{allMenuItems.length} pizzaa listalla</span>
            <span>{itemCount} tuotetta korissa</span>
            <span>
              {(totalCents / 100).toFixed(2).replace('.', ',')} € yhteensä
            </span>
          </div>

          {items.length > 0 ? (
            <div className="menu-summary-card__cart-preview">
              <p className="section__label">Omat ostokset</p>
              <ul>
                {previewCartItems.map(item => (
                  <li key={item.id}>
                    {item.name} x{item.quantity}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>

        <div className="menu-days" id="menu-lista">
          <section className="day-section day-section--today" id="menu-pizzat">
            <div className="section__heading">
              <div className="menu-filter-inline">
                <div className="menu-filter-inline__buttons">
                  <button
                    className={`chip-link chip-link--button${
                      menuFilter === 'veg' ? ' chip-link--button--active' : ''
                    }`}
                    type="button"
                    onClick={() => setMenuFilter('veg')}
                  >
                    Vege
                  </button>

                  <button
                    className={`chip-link chip-link--button${
                      menuFilter === 'meat' ? ' chip-link--button--active' : ''
                    }`}
                    type="button"
                    onClick={() => setMenuFilter('meat')}
                  >
                    Liha
                  </button>

                  <button
                    className={`chip-link chip-link--button${
                      menuFilter === 'all' ? ' chip-link--button--active' : ''
                    }`}
                    type="button"
                    onClick={() => setMenuFilter('all')}
                  >
                    Kaikki
                  </button>
                </div>

                <h2>{filterHeading}</h2>
              </div>
            </div>

            <div className="pizza-grid">
              {visibleMenuItems.map(pizza => (
                <PizzaCard
                  key={pizza.id}
                  pizza={pizza}
                  onAdd={addToCart}
                  canEdit={false}
                  cartQuantity={cartQuantityById[pizza.id] || 0}
                  onQuantityChange={handleQuantityChange}
                  anchorId={`pizza-${pizza.id}`}
                />
              ))}
            </div>

            {visibleMenuItems.length === 0 ? (
              <p>Pizzoja ei löytynyt valitulla suodatuksella.</p>
            ) : null}
          </section>
        </div>
      </main>
    </div>
  );
}

export default MenuPage;