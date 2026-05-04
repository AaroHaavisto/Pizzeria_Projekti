import {useEffect, useState} from 'react';
import {Link} from 'react-router-dom';
import Navigation from '../components/Navigation';
import PizzaCard from '../components/PizzaCard';
import {
  getWeeklyMenuData,
  getWeeklyMenuSections,
  saveMenuItem,
} from '../api/menuApi';
import {fetchRatings, updateRating} from '../api/ratingsApi';
import {useCart} from '../contexts/CartContext';
import {useCustomerSession} from '../contexts/CustomerSessionContext';
import {isAdminCustomer} from '../utils/adminAuth';
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

function createPizzaForm(item) {
  return {
    itemId: String(item.itemId || ''),
    name: String(item.name || ''),
    description: String(item.description || ''),
    priceEuro: ((Number(item.priceCents || 0) || 0) / 100).toFixed(2),
    dietText: Array.isArray(item.diet) ? item.diet.join(', ') : '',
    mealType: item.mealType === 'lunch' ? 'lunch' : 'a_la_carte',
    image: String(item.image || ''),
  };
}

function createRatingForm(rating) {
  return {
    id: rating.id,
    score: String(rating.score || ''),
    description: String(rating.description || ''),
  };
}

function toSavePizzaPayload(form) {
  const priceNumber = Number.parseFloat(String(form.priceEuro).replace(',', '.'));

  return {
    itemId: String(form.itemId || '').trim(),
    name: String(form.name || '').trim(),
    description: String(form.description || '').trim(),
    priceCents: Number.isFinite(priceNumber) ? Math.max(0, Math.round(priceNumber * 100)) : 0,
    currency: 'EUR',
    diet: String(form.dietText || '')
      .split(',')
      .map(value => value.trim())
      .filter(Boolean),
    mealType: form.mealType === 'lunch' ? 'lunch' : 'a_la_carte',
    image: String(form.image || '').trim(),
  };
}

function MenuPage() {
  const {customer} = useCustomerSession();
  const {addToCart, items, updateQuantity, itemCount, totalCents} = useCart();
  const [sections, setSections] = useState([]);
  const [menuItemsById, setMenuItemsById] = useState({});
  const [ratings, setRatings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [menuFilter, setMenuFilter] = useState('all');
  const [editingPizza, setEditingPizza] = useState(null);
  const [pizzaForm, setPizzaForm] = useState(null);
  const [editingRating, setEditingRating] = useState(null);
  const [ratingForm, setRatingForm] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const canEditMenu = isAdminCustomer(customer);

  async function loadMenuData() {
    const [nextSections, nextMenuData] = await Promise.all([
      getWeeklyMenuSections(),
      getWeeklyMenuData(),
    ]);

    const nextItems = flattenMenuItems(nextMenuData);
    const nextById = nextItems.reduce((accumulator, item) => {
      accumulator[String(item.itemId)] = item;
      return accumulator;
    }, {});

    setSections(nextSections);
    setMenuItemsById(nextById);
  }

  async function loadRatingsData() {
    const nextRatings = await fetchRatings();
    setRatings(Array.isArray(nextRatings) ? nextRatings : []);
  }

  useEffect(() => {
    let mounted = true;

    async function loadMenu() {
      try {
        setLoadError('');
        await loadMenuData();
        await loadRatingsData();
        if (mounted) {
          setActionMessage('');
        }
      } catch {
        if (mounted) {
          setLoadError('');
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

  function openPizzaEditor(pizzaCard) {
    const sourceItem = menuItemsById[String(pizzaCard.id)];
    if (!sourceItem) {
      setActionMessage('Valittua pizzaa ei loydy muokkausta varten.');
      return;
    }

    setEditingPizza(pizzaCard);
    setPizzaForm(createPizzaForm(sourceItem));
  }

  function closePizzaEditor() {
    setEditingPizza(null);
    setPizzaForm(null);
  }

  function openRatingEditor(rating) {
    setEditingRating(rating);
    setRatingForm(createRatingForm(rating));
  }

  function closeRatingEditor() {
    setEditingRating(null);
    setRatingForm(null);
  }

  async function handleSavePizza() {
    if (!pizzaForm) {
      return;
    }

    const payload = toSavePizzaPayload(pizzaForm);

    if (!payload.itemId || !payload.name) {
      setActionMessage('Pizzalla tulee olla tunnus ja nimi.');
      return;
    }

    try {
      setIsSaving(true);
      await saveMenuItem(payload);
      await loadMenuData();
      setActionMessage(`Pizza ${payload.name} paivitetty.`);
      closePizzaEditor();
    } catch (error) {
      setActionMessage(error.message || 'Pizzan paivitys epaonnistui.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSaveRating() {
    if (!ratingForm) {
      return;
    }

    try {
      setIsSaving(true);
      const updatedRatings = await updateRating(ratingForm.id, {
        score: ratingForm.score,
        description: ratingForm.description,
      });
      setRatings(updatedRatings);
      setActionMessage('Arvosana paivitetty.');
      try {
        window.dispatchEvent(new CustomEvent('ratingsUpdated', {detail: updatedRatings}));
        window.localStorage.setItem('ratingsUpdatedAt', String(Date.now()));
      } catch {
        // ignore browser quirks
      }
      closeRatingEditor();
    } catch (error) {
      setActionMessage(error.message || 'Arvosanan paivitys epaonnistui.');
    } finally {
      setIsSaving(false);
    }
  }

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
          <div className="menu-summary-card__ratings">
            <p className="section__label">Arvosanat</p>
            <ul>
              {ratings.map(rating => (
                <li key={rating.id}>
                  <span>
                    <strong>{rating.score}</strong> {rating.description}
                  </span>
                  {canEditMenu ? (
                    <button
                      type="button"
                      className="button button--secondary menu-summary-card__edit-button"
                      onClick={() => openRatingEditor(rating)}
                    >
                      Muokkaa
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
          {actionMessage ? (
            <p className="menu-summary-card__message" role="status">
              {actionMessage}
            </p>
          ) : null}
        </section>

        <div className="menu-days" id="menu-lista">
          <section className="day-section day-section--today" id="menu-pizzat">
            <div className="section__heading">
              <div className="menu-filter-inline">
                <div className="menu-filter-inline__buttons">
                  <button
                    className={`chip-link chip-link--button${menuFilter === 'veg' ? ' chip-link--button--active' : ''}`}
                    type="button"
                    onClick={() => setMenuFilter('veg')}
                  >
                    Vege
                  </button>
                  <button
                    className={`chip-link chip-link--button${menuFilter === 'meat' ? ' chip-link--button--active' : ''}`}
                    type="button"
                    onClick={() => setMenuFilter('meat')}
                  >
                    Liha
                  </button>
                  <button
                    className={`chip-link chip-link--button${menuFilter === 'all' ? ' chip-link--button--active' : ''}`}
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
                  canEdit={canEditMenu}
                  onEdit={openPizzaEditor}
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

      {editingPizza && pizzaForm ? (
        <div className="menu-modal-overlay" onClick={closePizzaEditor}>
          <div className="menu-modal" onClick={event => event.stopPropagation()}>
            <div className="menu-modal__header">
              <h2>Muokkaa pizzaa</h2>
              <button type="button" className="menu-modal__close" onClick={closePizzaEditor}>
                x
              </button>
            </div>
            <div className="menu-modal__body">
              <label>
                Nimi
                <input
                  type="text"
                  value={pizzaForm.name}
                  onChange={event =>
                    setPizzaForm(current => ({...current, name: event.target.value}))
                  }
                />
              </label>
              <label>
                Kuvaus
                <textarea
                  rows="3"
                  value={pizzaForm.description}
                  onChange={event =>
                    setPizzaForm(current => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                />
              </label>
              <div className="menu-modal__grid">
                <label>
                  Hinta (EUR)
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={pizzaForm.priceEuro}
                    onChange={event =>
                      setPizzaForm(current => ({
                        ...current,
                        priceEuro: event.target.value,
                      }))
                    }
                  />
                </label>
                <label>
                  Tyyppi
                  <select
                    value={pizzaForm.mealType}
                    onChange={event =>
                      setPizzaForm(current => ({
                        ...current,
                        mealType: event.target.value,
                      }))
                    }
                  >
                    <option value="lunch">Lounas</option>
                    <option value="a_la_carte">A la carte</option>
                  </select>
                </label>
              </div>
              <label>
                Diet/allergeenit (pilkulla eroteltuna)
                <input
                  type="text"
                  value={pizzaForm.dietText}
                  onChange={event =>
                    setPizzaForm(current => ({...current, dietText: event.target.value}))
                  }
                />
              </label>
              <label>
                Kuvan polku
                <input
                  type="text"
                  value={pizzaForm.image}
                  onChange={event =>
                    setPizzaForm(current => ({...current, image: event.target.value}))
                  }
                />
              </label>
              <img
                className="menu-modal__preview"
                src={pizzaForm.image || '/src/assets/images/pizza-margherita.jpg'}
                alt={`${pizzaForm.name || 'Pizza'} esikatselu`}
              />
            </div>
            <div className="menu-modal__actions">
              <button
                type="button"
                className="button button--secondary"
                onClick={closePizzaEditor}
                disabled={isSaving}
              >
                Peruuta
              </button>
              <button
                type="button"
                className="button button--primary"
                onClick={handleSavePizza}
                disabled={isSaving}
              >
                {isSaving ? 'Tallennetaan...' : 'Tallenna'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {editingRating && ratingForm ? (
        <div className="menu-modal-overlay" onClick={closeRatingEditor}>
          <div className="menu-modal menu-modal--small" onClick={event => event.stopPropagation()}>
            <div className="menu-modal__header">
              <h2>Muokkaa arvosanaa</h2>
              <button type="button" className="menu-modal__close" onClick={closeRatingEditor}>
                x
              </button>
            </div>
            <div className="menu-modal__body">
              <label>
                Pisteet
                <input
                  type="text"
                  value={ratingForm.score}
                  onChange={event =>
                    setRatingForm(current => ({...current, score: event.target.value}))
                  }
                />
              </label>
              <label>
                Kuvaus
                <input
                  type="text"
                  value={ratingForm.description}
                  onChange={event =>
                    setRatingForm(current => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                />
              </label>
            </div>
            <div className="menu-modal__actions">
              <button
                type="button"
                className="button button--secondary"
                onClick={closeRatingEditor}
                disabled={isSaving}
              >
                Peruuta
              </button>
              <button
                type="button"
                className="button button--primary"
                onClick={handleSaveRating}
                disabled={isSaving}
              >
                {isSaving ? 'Tallennetaan...' : 'Tallenna'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default MenuPage;
