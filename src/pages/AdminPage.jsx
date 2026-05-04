import {useEffect, useMemo, useState} from 'react';
import {Link, useLocation} from 'react-router-dom';
import Navigation from '../components/Navigation';
import {useCustomerSession} from '../contexts/CustomerSessionContext';
import {useMenuData} from '../contexts/MenuDataContext';
import {fetchRatings, updateRating} from '../api/ratingsApi';
import {isAdminCustomer} from '../utils/adminAuth';
import {isValidMenuJson} from '../utils/menuStore';
import '../css/admin_style.css';

const IMAGE_OPTIONS = [
  {label: 'Kana-pizza', value: '/src/assets/images/pizza-chicken-bbq.jpg'},
  {label: 'Kasvispizza', value: '/src/assets/images/pizza-vegetariana.jpg'},
  {label: 'Diavola', value: '/src/assets/images/pizza-diavola.jpg'},
  {label: 'Margherita', value: '/src/assets/images/pizza-margherita.jpg'},
  {label: 'Tonno', value: '/src/assets/images/pizza-tonno.jpg'},
  {label: 'Pepperoni', value: '/src/assets/images/pizza-pepperoni.jpg'},
  {label: 'Quattro Formaggi', value: '/src/assets/images/pizza-quattro-formaggi.jpg'},
  {label: 'Prosciutto', value: '/src/assets/images/pizza-prosciutto.jpg'},
  {label: 'Capricciosa', value: '/src/assets/images/pizza-capricciosa.jpg'},
  {label: 'Hawaii', value: '/src/assets/images/pizza-hawaii.jpg'},
];

const MEAL_TYPE_OPTIONS = [
  {label: 'Lounas', value: 'lunch'},
  {label: 'A la carte', value: 'a_la_carte'},
];

function flattenMenuItems(menuData) {
  if (Array.isArray(menuData.items)) {
    return menuData.items;
  }

  if (Array.isArray(menuData.days)) {
    return menuData.days.flatMap(day =>
      Array.isArray(day.items) ? day.items : []
    );
  }

  return [];
}

function createEditableItem(item) {
  return {
    ...item,
    dietText: Array.isArray(item.diet) ? item.diet.join(', ') : '',
    image: item.image || IMAGE_OPTIONS[0].value,
  };
}

function toSavedItem(item) {
  const diet = String(item.dietText || '')
    .split(',')
    .map(entry => entry.trim())
    .filter(Boolean);

  return {
    itemId: String(item.itemId).trim(),
    name: String(item.name || '').trim(),
    description: String(item.description || '').trim(),
    priceCents: Number.isFinite(Number(item.priceCents))
      ? Math.max(0, Math.round(Number(item.priceCents)))
      : 0,
    currency: item.currency || 'EUR',
    diet,
    mealType: item.mealType === 'lunch' ? 'lunch' : 'a_la_carte',
    image: String(item.image || '').trim(),
  };
}

function AdminPage() {
  const location = useLocation();
  const {customer} = useCustomerSession();
  const {menuData, replaceMenuData, restoreDefaultMenu} = useMenuData();
  const [menuItems, setMenuItems] = useState(() =>
    flattenMenuItems(menuData).map(createEditableItem)
  );
  const [message, setMessage] = useState({type: '', text: ''});
  const [ratings, setRatings] = useState([]);
  const [ratingsLoading, setRatingsLoading] = useState(false);

  useEffect(() => {
    setMenuItems(flattenMenuItems(menuData).map(createEditableItem));
  }, [menuData]);

  useEffect(() => {
    async function loadRatings() {
      try {
        setRatingsLoading(true);
        const data = await fetchRatings();
        setRatings(data);
      } catch (error) {
        console.error('Failed to load ratings:', error);
      } finally {
        setRatingsLoading(false);
      }
    }

    loadRatings();
  }, []);

  const isDevMode = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const hasParam = params.get('dev') === '1';
    const stored = window.localStorage.getItem('pizzeria-dev-mode') === '1';

    if (hasParam) {
      window.localStorage.setItem('pizzeria-dev-mode', '1');
      return true;
    }

    return stored;
  }, [location.search]);

  const isAdmin = isDevMode || isAdminCustomer(customer);

  const menuStats = useMemo(() => {
    const itemCount = menuItems.length;

    return {itemCount};
  }, [menuItems]);

  function updateMenuItem(itemId, field, value) {
    setMenuItems(previousItems =>
      previousItems.map(item =>
        item.itemId === itemId ? {...item, [field]: value} : item
      )
    );
  }

  async function handleSave() {
    try {
      const savedItems = menuItems.map(toSavedItem);

      if (
        !isValidMenuJson({items: savedItems}) ||
        savedItems.some(item => !item.itemId || !item.name)
      ) {
        throw new Error('Jokaisella pizzalla pitää olla tunnus ja nimi.');
      }

      await replaceMenuData({items: savedItems});
      setMessage({
        type: 'success',
        text: 'Menu tallennettu tietokantaan.',
      });
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.message || 'Tallennus epäonnistui.',
      });
    }
  }

  async function handleReset() {
    try {
      await restoreDefaultMenu();
      setMessage({
        type: 'success',
        text: 'Oletusmenu ladattu uudelleen tietokannasta.',
      });
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.message || 'Oletusmenun palautus epäonnistui.',
      });
    }
  }

  async function handleUpdateRating(ratingId, score, description) {
    try {
      const updated = await updateRating(ratingId, {score, description});
      setRatings(updated);
      setMessage({type: 'success', text: 'Arvostelu päivitetty.'});
      try {
        window.dispatchEvent(new CustomEvent('ratingsUpdated', {detail: updated}));
        window.localStorage.setItem('ratingsUpdatedAt', String(Date.now()));
      } catch {
        // ignore browser quirks
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.message || 'Arvostelun päivitys epäonnistui.',
      });
    }
  }

  function handleExport() {
    const blob = new Blob([JSON.stringify({items: menuItems.map(toSavedItem)}, null, 2)], {
      type: 'application/json',
    });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'pizzeria-menu.json';
    link.click();
    URL.revokeObjectURL(link.href);
  }

  if (!isAdmin) {
    return (
      <div className="admin-page">
        <header className="hero hero--admin">
          <Navigation />

          <section className="hero__content admin-hero">
            <p className="eyebrow">Hallinta</p>
            <h1>Hallintasivu on vain kehityskäyttöön.</h1>
            <p className="hero__text admin-hero__text">
              Tämä näkymä on vain admin-käyttäjille.
            </p>
            <div className="hero__actions">
              <Link className="button button--primary" to="/account">
                Kirjaudu sisään
              </Link>
              <Link className="button button--secondary" to="/">
                Etusivulle
              </Link>
            </div>
          </section>
        </header>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <header className="hero hero--admin">
        <Navigation />

        <section className="hero__content admin-hero">
          <p className="eyebrow">Hallinta</p>
          <h1>Muokkaa ruokalistaa lomakkeella.</h1>
          <p className="hero__text admin-hero__text">
            Päivitä pizzan nimi, hinta, kuva ja muut tiedot suoraan kenttiin ilman JSON-editoria.
          </p>
          {isAdminCustomer(customer) ? (
            <p className="hero__text admin-hero__text">
              Admin-käyttäjä: {customer?.email || 'admin'}
            </p>
          ) : null}
          <div className="hero__actions">
            <button
              className="button button--primary"
              type="button"
              onClick={handleSave}
            >
              Tallenna muutokset
            </button>
            <button
              className="button button--secondary"
              type="button"
              onClick={handleReset}
            >
              Palauta oletus
            </button>
          </div>
        </section>
      </header>

      <main className="admin-layout">
        <section className="admin-panel">
          <div className="section__heading">
            <p className="section__label">Sisältö</p>
            <h2>Muokkaa jokaista pizzaa erikseen</h2>
          </div>

          <div className="menu-editor">
            {menuItems.map(item => (
              <article className="menu-editor__item" key={item.itemId}>
                <div className="menu-editor__media">
                  <img
                    className="menu-editor__preview"
                    src={item.image || '/src/assets/images/pizza-margherita.jpg'}
                    alt={item.name || 'Pizza'}
                  />
                  <label className="menu-editor__field">
                    <span>Kuvan valinta</span>
                    <select
                      value={item.image}
                      onChange={event =>
                        updateMenuItem(item.itemId, 'image', event.target.value)
                      }
                    >
                      {IMAGE_OPTIONS.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="menu-editor__field">
                    <span>Kuvan polku</span>
                    <input
                      type="text"
                      value={item.image}
                      onChange={event =>
                        updateMenuItem(item.itemId, 'image', event.target.value)
                      }
                      placeholder="/src/assets/images/..."
                    />
                  </label>
                </div>

                <div className="menu-editor__fields">
                  <div className="menu-editor__grid">
                    <label className="menu-editor__field">
                      <span>Tunnus</span>
                      <input type="text" value={item.itemId} readOnly />
                    </label>
                    <label className="menu-editor__field">
                      <span>Nimi</span>
                      <input
                        type="text"
                        value={item.name}
                        onChange={event =>
                          updateMenuItem(item.itemId, 'name', event.target.value)
                        }
                      />
                    </label>
                    <label className="menu-editor__field">
                      <span>Hinta (€)</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={(Number(item.priceCents) / 100).toFixed(2)}
                        onChange={event =>
                          updateMenuItem(
                            item.itemId,
                            'priceCents',
                            Math.max(0, Math.round(Number(event.target.value || 0) * 100))
                          )
                        }
                      />
                    </label>
                    <label className="menu-editor__field">
                      <span>Ryhmä</span>
                      <select
                        value={item.mealType}
                        onChange={event =>
                          updateMenuItem(item.itemId, 'mealType', event.target.value)
                        }
                      >
                        {MEAL_TYPE_OPTIONS.map(option => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <label className="menu-editor__field">
                    <span>Kuvaus</span>
                    <textarea
                      rows="3"
                      value={item.description}
                      onChange={event =>
                        updateMenuItem(
                          item.itemId,
                          'description',
                          event.target.value
                        )
                      }
                    />
                  </label>

                  <div className="menu-editor__grid menu-editor__grid--compact">
                    <label className="menu-editor__field">
                      <span>Allergeenit / diet</span>
                      <input
                        type="text"
                        value={item.dietText}
                        onChange={event =>
                          updateMenuItem(item.itemId, 'dietText', event.target.value)
                        }
                        placeholder="VEG, G"
                      />
                    </label>
                    <label className="menu-editor__field">
                      <span>Valuutta</span>
                      <input type="text" value={item.currency} readOnly />
                    </label>
                  </div>
                </div>
              </article>
            ))}
          </div>

          {message.text ? (
            <p
              className={`admin-message admin-message--${message.type}`}
              role="status"
            >
              {message.text}
            </p>
          ) : null}

          <div className="admin-actions">
            <button
              className="button button--primary"
              type="button"
              onClick={handleSave}
            >
              Tallenna muutokset
            </button>
            <button
              className="button button--secondary"
              type="button"
              onClick={handleExport}
            >
              Vie nykyinen data
            </button>
          </div>
        </section>

        <aside className="admin-panel admin-panel--summary">
          <p className="section__label">Yhteenveto</p>
          <h2>{menuStats.itemCount} tuotetta</h2>
          <p>
            Muokatut tiedot tallennetaan tietokantaan, joten muutokset näkyvät
            heti myös asiakkaan puolella.
          </p>

          <div className="admin-preview">
            <article className="admin-preview__day">
              <div className="admin-preview__head">
                <strong>Kaikki tuotteet</strong>
              </div>
              <ul>
                {menuItems.map(item => (
                  <li key={item.itemId}>
                    {item.name} - {(Number(item.priceCents) / 100).toFixed(2).replace('.', ',')} €
                  </li>
                ))}
              </ul>
            </article>
          </div>
        </aside>

        <section className="admin-panel">
          <div className="section__heading">
            <p className="section__label">Arvostelut</p>
            <h2>Muokkaa etusivun arvosteluja</h2>
          </div>

          {ratingsLoading ? (
            <p>Ladataan arvosteluja...</p>
          ) : (
            <div className="ratings-editor">
              {ratings.map(rating => (
                <div key={rating.id} className="rating-item">
                  <label>
                    Pisteet (ID: {rating.id}):
                    <input
                      type="text"
                      defaultValue={rating.score}
                      onBlur={e => {
                        const newScore = e.target.value;
                        if (newScore !== rating.score) {
                          handleUpdateRating(
                            rating.id,
                            newScore,
                            rating.description
                          );
                        }
                      }}
                    />
                  </label>
                  <label>
                    Kuvaus:
                    <input
                      type="text"
                      defaultValue={rating.description}
                      onBlur={e => {
                        const newDesc = e.target.value;
                        if (newDesc !== rating.description) {
                          handleUpdateRating(
                            rating.id,
                            rating.score,
                            newDesc
                          );
                        }
                      }}
                    />
                  </label>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default AdminPage;
