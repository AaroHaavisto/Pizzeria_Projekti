import {useEffect, useMemo, useState} from 'react';
import {Link, useLocation, useNavigate} from 'react-router-dom';
import Navigation from '../components/Navigation';
import PizzaCard from '../components/PizzaCard';
import {getWeeklyMenuData, getWeeklyMenuSections} from '../api/menuApi';
import {useCart} from '../contexts/CartContext';
import {useLanguage} from '../contexts/LanguageContext';
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
  const {
    addToCart,
    items,
    updateQuantity,
    itemCount,
    totalCents,
    cartLimitReached,
    cartLimitMessage,
    removeFromCart,
  } = useCart();
  const {language} = useLanguage();
  const isEnglish = language === 'en';
  const location = useLocation();
  const navigate = useNavigate();

  const [sections, setSections] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [menuFilter, setMenuFilter] = useState(() => {
    if (typeof window === 'undefined') {
      return 'all';
    }

    const params = new URLSearchParams(window.location.search);
    const initialFilter = params.get('filter');

    if (initialFilter === 'veg' || initialFilter === 'meat' || initialFilter === 'all') {
      return initialFilter;
    }

    return 'all';
  });
  const [highlightedPizzaId, setHighlightedPizzaId] = useState('');
  const [highlightAllPizzas, setHighlightAllPizzas] = useState(false);

  const filterFromUrl = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const nextFilter = params.get('filter');

    if (nextFilter === 'veg' || nextFilter === 'meat' || nextFilter === 'all') {
      return nextFilter;
    }

    return '';
  }, [location.search]);

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
          setLoadError(
            isEnglish ? 'Failed to load the menu.' : 'Menun lataaminen epäonnistui.'
          );
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
  }, [isEnglish]);

  useEffect(() => {
    if (filterFromUrl && filterFromUrl !== menuFilter) {
      setMenuFilter(filterFromUrl);
    }
  }, [filterFromUrl, menuFilter]);

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

  const selectedFocus = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get('focus') || location.hash.replace('#pizza-', '');
  }, [location.hash, location.search]);

  const cartQuantityById = items.reduce((accumulator, item) => {
    accumulator[item.id] = item.quantity;
    return accumulator;
  }, {});

  const previewCartItems = items.filter(item => item.quantity > 0).slice(0, 3);

  const filterHeading =
    menuFilter === 'veg'
      ? isEnglish ? 'Vegetarian pizzas' : 'Vege pizzat'
      : menuFilter === 'meat'
        ? isEnglish ? 'Meat pizzas' : 'Lihapizzat'
        : isEnglish ? 'All pizzas' : 'Kaikki pizzat';

  function handleQuantityChange(pizza, nextQuantity) {
    updateQuantity(pizza.id, nextQuantity);
  }

  useEffect(() => {
    const nextFocus = selectedFocus || '';
    const isFocusAll = nextFocus === 'all';

    setHighlightedPizzaId(isFocusAll ? '' : nextFocus);
    setHighlightAllPizzas(isFocusAll);

    const target = isFocusAll
      ? document.getElementById('menu-pizzat')
      : nextFocus
        ? document.getElementById(`pizza-${nextFocus}`)
        : null;

    if (!target) {
      return undefined;
    }

    target.scrollIntoView({behavior: 'smooth', block: 'start'});
    target.classList.add('section--focus');

    const timeoutId = window.setTimeout(() => {
      target.classList.remove('section--focus');
    }, 1600);

    return () => {
      window.clearTimeout(timeoutId);
      target.classList.remove('section--focus');
    };
  }, [selectedFocus]);

  function handleFilterChange(nextFilter) {
    setMenuFilter(nextFilter);
    navigate(`/menu?filter=${nextFilter}#menu-pizzat`, {replace: true});
  }

  return (
    <div className="menu-page">
      <header className="hero">
        <Navigation />

        <section className="hero__content">
          <p className="eyebrow">{isEnglish ? 'Full selection' : 'Koko valikoima'}</p>
          <h1 id="menu">
            {isEnglish
              ? 'Find a favorite pizza for every hunger level.'
              : 'Löydä suosikkipizza'}
          </h1>
          <p className="hero__text menu-hero-text">
            {isEnglish ? 'Filter pizzas by ingredients.' : 'Suodata pizzat aineiden mukaan.'}
          </p>


        </section>
      </header>

      <main className="pizza-showcase" aria-label="Slice Hunt menu listaus">
        {isLoading ? <p>{isEnglish ? 'Loading menu...' : 'Ladataan menua...'}</p> : null}
        {loadError ? <p>{loadError}</p> : null}

        <div className="menu-filter-inline">
          <div className="menu-filter-inline__center">
            <h2>{filterHeading}</h2>

            <div className="menu-filter-inline__buttons">
              <button
                className={`chip-link chip-link--button${
                  menuFilter === 'veg' ? ' chip-link--button--active' : ''
                }`}
                type="button"
                onClick={() => handleFilterChange('veg')}
              >
                {isEnglish ? 'Veg' : 'Vege'}
              </button>

              <button
                className={`chip-link chip-link--button${
                  menuFilter === 'meat' ? ' chip-link--button--active' : ''
                }`}
                type="button"
                onClick={() => handleFilterChange('meat')}
              >
                {isEnglish ? 'Meat' : 'Liha'}
              </button>

              <button
                className={`chip-link chip-link--button${
                  menuFilter === 'all' ? ' chip-link--button--active' : ''
                }`}
                type="button"
                onClick={() => handleFilterChange('all')}
              >
                {isEnglish ? 'All' : 'Kaikki'}
              </button>
            </div>
          </div>

          <Link className="chip-link chip-link--button menu-filter-inline__buy" to="/cart">
            {isEnglish ? 'Buy' : 'Osta'} {itemCount > 0 ? `(${itemCount})` : ''}
          </Link>
        </div>

        <section className="menu-summary-card">
          <p className="section__label">{isEnglish ? 'Order' : 'Tilaus'}</p>
          <h2>
            {isEnglish ? 'Easy pickup and clear pricing' : 'Helppo nouto ja selkeä hinnoittelu'}
          </h2>

          <div className="menu-summary-card__stats">
            <span>
              {allMenuItems.length} {isEnglish ? 'pizzas on the list' : 'pizzaa listalla'}
            </span>
            <span>
              {itemCount} {isEnglish ? 'items in the cart' : 'tuotetta korissa'}
            </span>
            <span>
              {(totalCents / 100).toFixed(2).replace('.', ',')} €{' '}
              {isEnglish ? 'total' : 'yhteensä'}
            </span>
          </div>

          {cartLimitReached ? (
            <p className="cart-limit" role="status">
              {cartLimitMessage}
            </p>
          ) : null}

          {items.length > 0 ? (
            <div className="menu-summary-card__cart-preview">
              <p className="section__label">{isEnglish ? 'My purchases' : 'Omat ostokset'}</p>
              <ul className="menu-preview-list">
                {previewCartItems.map(item => (
                  <li key={item.id} className="menu-preview-item">
                    <div className="menu-preview-item__info">
                      <strong>{item.name}</strong>
                      <span>x{item.quantity}</span>
                    </div>

                    <div className="menu-preview-item__controls">
                      <button
                        type="button"
                        className="quantity-button menu-preview-item__quantity-button"
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        aria-label={isEnglish ? `Decrease ${item.name}` : `Vähennä tuotetta ${item.name}`}
                      >
                        -
                      </button>
                      <button
                        type="button"
                        className="quantity-button menu-preview-item__quantity-button"
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        aria-label={isEnglish ? `Increase ${item.name}` : `Lisää tuotetta ${item.name}`}
                      >
                        +
                      </button>
                      <button
                        type="button"
                        className="menu-preview-item__remove"
                        onClick={() => removeFromCart(item.id)}
                        aria-label={isEnglish ? `Remove ${item.name} from cart` : `Poista ${item.name} korista`}
                      >
                        ×
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>

        <div className="menu-days" id="menu-lista">
          <section className="day-section day-section--today day-section--menu" id="menu-pizzat">
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
                  highlighted={highlightAllPizzas || highlightedPizzaId === String(pizza.id)}
                />
              ))}
            </div>

            {visibleMenuItems.length === 0 ? (
              <p>
                {isEnglish
                  ? 'No pizzas matched the selected filter.'
                  : 'Pizzoja ei löytynyt valitulla suodatuksella.'}
              </p>
            ) : null}
          </section>
        </div>
      </main>
    </div>
  );
}

export default MenuPage;