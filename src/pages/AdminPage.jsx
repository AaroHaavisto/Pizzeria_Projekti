import {useEffect, useMemo, useState} from 'react';
import {Link, useLocation} from 'react-router-dom';
import Navigation from '../components/Navigation';
import {useCustomerSession} from '../contexts/CustomerSessionContext';
import {useLanguage} from '../contexts/LanguageContext';
import {useMenuData} from '../contexts/MenuDataContext';
import {useOffer} from '../contexts/OfferContext';
import {isAdminCustomer} from '../utils/adminAuth';
import {isValidMenuJson} from '../utils/menuStore';
import {resolveImageUrl} from '../utils/imageUrls';
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
  {value: 'lunch'},
  {value: 'a_la_carte'},
];

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

function createEditableItem(item) {
  return {
    ...item,
    nameEn: String(item?.nameEn || item?.name_en || ''),
    descriptionEn: String(item?.descriptionEn || item?.description_en || ''),
    dietText: Array.isArray(item.diet) ? item.diet.join(', ') : '',
    image: item.image || IMAGE_OPTIONS[0].value,
    featured: Boolean(item.featured),
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
    nameEn: String(item.nameEn || '').trim(),
    description: String(item.description || '').trim(),
    descriptionEn: String(item.descriptionEn || '').trim(),
    priceCents: Number.isFinite(Number(item.priceCents))
      ? Math.max(0, Math.round(Number(item.priceCents)))
      : 0,
    currency: item.currency || 'EUR',
    diet,
    mealType: item.mealType === 'lunch' ? 'lunch' : 'a_la_carte',
    image: String(item.image || '').trim(),
    featured: Boolean(item.featured),
  };
}

function createNewPizza() {
  const timestamp = Date.now();

  return {
    itemId: `pizza-${timestamp}`,
    name: 'Uusi pizza',
    nameEn: 'New pizza',
    description: 'Kirjoita pizzan kuvaus tähän.',
    descriptionEn: 'Write the pizza description here.',
    priceCents: 1200,
    currency: 'EUR',
    diet: [],
    dietText: '',
    mealType: 'a_la_carte',
    image: IMAGE_OPTIONS[0].value,
    featured: false,
  };
}

function formatEuro(priceCents) {
  return `${(Number(priceCents || 0) / 100).toFixed(2).replace('.', ',')} €`;
}

function createOfferForm(offer) {
  return {
    label: String(offer?.label || ''),
    title: String(offer?.title || ''),
    discountPercent: String(Number(offer?.discountPercent) || 0),
    startTime: String(offer?.startTime || '11:00'),
    endTime: String(offer?.endTime || '13:00'),
    activeText: String(offer?.activeText || ''),
    inactiveText: String(offer?.inactiveText || ''),
  };
}

function toOfferPayload(form) {
  return {
    label: String(form.label || '').trim(),
    title: String(form.title || '').trim(),
    discountPercent: Number.parseFloat(
      String(form.discountPercent).replace(',', '.')
    ),
    startTime: String(form.startTime || '').trim(),
    endTime: String(form.endTime || '').trim(),
    activeText: String(form.activeText || '').trim(),
    inactiveText: String(form.inactiveText || '').trim(),
  };
}

function AdminPage() {
  const location = useLocation();
  const {customer} = useCustomerSession();
  const {language} = useLanguage();
  const isEnglish = language === 'en';
  const {menuData, replaceMenuData, restoreDefaultMenu} = useMenuData();
  const {offer, saveOffer} = useOffer();

  const t = (fi, en) => (isEnglish ? en : fi);

  const [menuItems, setMenuItems] = useState(() =>
    flattenMenuItems(menuData).map(createEditableItem)
  );

  const [message, setMessage] = useState({type: '', text: ''});

  const [editingItem, setEditingItem] = useState(null);
  const [originalEditingItemId, setOriginalEditingItemId] = useState('');
  const [isCreateMode, setIsCreateMode] = useState(false);

  const [offerForm, setOfferForm] = useState(() => createOfferForm(offer));
  const [isSavingOffer, setIsSavingOffer] = useState(false);

  useEffect(() => {
    setMenuItems(flattenMenuItems(menuData).map(createEditableItem));
  }, [menuData]);

  useEffect(() => {
    setOfferForm(createOfferForm(offer));
  }, [offer]);

  function displayName(item) {
    if (!item) return '';
    return isEnglish ? (item.nameEn || item.name || '') : (item.name || '');
  }

  function displayDescription(item) {
    if (!item) return '';
    return isEnglish ? (item.descriptionEn || item.description || '') : (item.description || '');
  }

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

  const menuStats = useMemo(
    () => ({
      itemCount: menuItems.length,
    }),
    [menuItems]
  );

  function openEditPizza(item) {
    setIsCreateMode(false);
    setOriginalEditingItemId(item.itemId);
    setEditingItem({...item});
  }

  function openCreatePizza() {
    const newPizza = createNewPizza();

    setIsCreateMode(true);
    setOriginalEditingItemId(newPizza.itemId);
    setEditingItem(newPizza);
  }

  function closePizzaModal() {
    setEditingItem(null);
    setOriginalEditingItemId('');
    setIsCreateMode(false);
  }

  function updateEditingItem(field, value) {
    setEditingItem(previousItem => ({
      ...previousItem,
      [field]: value,
    }));
  }

  function handleSavePizzaFromModal() {
    if (!editingItem) {
      return;
    }

    const savedItem = createEditableItem(toSavedItem(editingItem));

    if (!savedItem.itemId || !savedItem.name) {
      setMessage({
        type: 'error',
        text: t('Pizzalla pitää olla tunnus ja nimi.', 'Pizza must have an id and a name.'),
      });
      return;
    }

    const duplicateExists = menuItems.some(item => {
      if (isCreateMode) {
        return item.itemId === savedItem.itemId;
      }

      return (
        item.itemId === savedItem.itemId &&
        item.itemId !== originalEditingItemId
      );
    });

    if (duplicateExists) {
      setMessage({
        type: 'error',
        text: t('Tällä tunnuksella on jo pizza. Valitse toinen tunnus.', 'An item with this id already exists. Choose another id.'),
      });
      return;
    }

    if (isCreateMode) {
      setMenuItems(previousItems => [savedItem, ...previousItems]);

      setMessage({
        type: 'success',
        text: t('Uusi pizza lisätty. Muista tallentaa pizzamuutokset.', 'New pizza added. Remember to save menu changes.'),
      });
    } else {
      setMenuItems(previousItems =>
        previousItems.map(item =>
          item.itemId === originalEditingItemId ? savedItem : item
        )
      );

      setMessage({
        type: 'success',
        text: t('Pizza päivitetty. Muista tallentaa pizzamuutokset.', 'Pizza updated. Remember to save menu changes.'),
      });
    }

    closePizzaModal();
  }

  function handleDeletePizza(itemId) {
    const itemToDelete = menuItems.find(item => item.itemId === itemId);
    const itemName = itemToDelete?.name || 'pizza';

    const confirmed = window.confirm(
      t(
        `Haluatko varmasti poistaa pizzan "${itemName}"?`,
        `Are you sure you want to delete the pizza "${itemName}"?`
      )
    );

    if (!confirmed) {
      return;
    }

    setMenuItems(previousItems =>
      previousItems.filter(item => item.itemId !== itemId)
    );

    setMessage({
      type: 'success',
      text: t('Pizza poistettu listalta. Muista tallentaa pizzamuutokset.', 'Pizza removed from list. Remember to save menu changes.'),
    });
  }

  async function handleSaveMenu() {
    try {
      const savedItems = menuItems.map(toSavedItem);

      if (
        !isValidMenuJson({items: savedItems}) ||
        savedItems.some(item => !item.itemId || !item.name)
      ) {
        throw new Error(t('Jokaisella pizzalla pitää olla tunnus ja nimi.', 'Each pizza must have an id and a name.'));
      }

      const itemIds = savedItems.map(item => item.itemId);
      const uniqueItemIds = new Set(itemIds);

      if (itemIds.length !== uniqueItemIds.size) {
        throw new Error(t('Jokaisella pizzalla pitää olla yksilöllinen tunnus.', 'Each pizza must have a unique id.'));
      }

      await replaceMenuData({items: savedItems});

      setMessage({
        type: 'success',
        text: t('Pizzamenu tallennettu tietokantaan.', 'Menu saved to database.'),
      });
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.message || t('Tallennus epäonnistui.', 'Save failed.'),
      });
    }
  }

  async function handleResetMenu() {
    try {
      await restoreDefaultMenu();

      setMessage({
        type: 'success',
        text: t('Oletusmenu ladattu uudelleen tietokannasta.', 'Default menu reloaded from database.'),
      });
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.message || t('Oletusmenun palautus epäonnistui.', 'Failed to restore default menu.'),
      });
    }
  }

  function handleExport() {
    const blob = new Blob(
      [JSON.stringify({items: menuItems.map(toSavedItem)}, null, 2)],
      {
        type: 'application/json',
      }
    );

    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'pizzeria-menu.json';
    link.click();
    URL.revokeObjectURL(link.href);
  }

  async function handleSaveOffer() {
    try {
      const payload = toOfferPayload(offerForm);

      if (!payload.label || !payload.title) {
        throw new Error(t('Tarjouksella pitää olla nimi ja otsikko.', 'Offer must have a name and a title.'));
      }

      if (
        !Number.isFinite(payload.discountPercent) ||
        payload.discountPercent < 0 ||
        payload.discountPercent > 100
      ) {
        throw new Error(t('Alennusprosentin pitää olla välillä 0–100.', 'Discount percent must be between 0 and 100.'));
      }

      setIsSavingOffer(true);

      const updatedOffer = await saveOffer(payload);
      setOfferForm(createOfferForm(updatedOffer));

      setMessage({
        type: 'success',
        text: t('Lounastarjous tallennettu.', 'Lunch offer saved.'),
      });
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.message || t('Lounastarjouksen tallennus epäonnistui.', 'Failed to save lunch offer.'),
      });
    } finally {
      setIsSavingOffer(false);
    }
  }

  if (!isAdmin) {
    return (
      <div className="admin-page">
        <header className="hero hero--admin">
          <Navigation />

          <section className="hero__content admin-hero">
            <p className="eyebrow">{t('Hallinta', 'Admin')}</p>
            <h1>{t('Hallintasivu on vain admin-käyttäjille.', 'Admin area is for admin users only.')}</h1>
            <p className="hero__text admin-hero__text">
              {t('Kirjaudu sisään admin-käyttäjällä nähdäksesi hallintasivun.', 'Sign in with an admin account to view the admin dashboard.')}
            </p>

            <div className="hero__actions">
              <Link className="button button--primary" to="/account">
                {t('Kirjaudu sisään', 'Sign in')}
              </Link>
              <Link className="button button--secondary" to="/">
                {t('Etusivulle', 'Back to home')}
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
          <p className="eyebrow">{t('Hallinta', 'Admin')}</p>
          <h1>{t('Slice Huntin hallinta', 'Slice Hunt administration')}</h1>
          <p className="hero__text admin-hero__text">
            {t(
              'Hallitse pizzoja, lounastarjousta ja etusivun arvosanoja yhdestä näkymästä.',
              'Manage pizzas, the lunch offer and front page ratings from a single view.'
            )}
          </p>

          {isAdminCustomer(customer) ? (
            <p className="hero__text admin-hero__text">
              {t('Admin-käyttäjä', 'Admin user')}: {customer?.email || 'admin'}
            </p>
          ) : null}

          <div className="hero__actions">
            <button
              className="button button--primary"
              type="button"
              onClick={handleSaveMenu}
            >
              {t('Tallenna pizzamuutokset', 'Save menu changes')}
            </button>

            <button
              className="button button--secondary"
              type="button"
              onClick={handleResetMenu}
            >
              {t('Palauta oletusmenu', 'Restore default menu')}
            </button>
          </div>
        </section>
      </header>

      <main className="admin-layout">
        <section className="admin-panel">
          <div className="section__heading">
            <p className="section__label">{t('Pizzat', 'Pizzas')}</p>
            <h2>{t('Kaikki pizzat', 'All pizzas')}</h2>
          </div>

          <div className="admin-preview">
            <article className="admin-preview__day">
              <div className="admin-preview__head">
                <strong>
                  {menuStats.itemCount}{' '}
                  {menuStats.itemCount === 1
                    ? t('pizza', 'pizza')
                    : t('pizzaa', 'pizzas')}
                </strong>
              </div>

              <ul>
                {menuItems.map(item => (
                  <li
                    key={item.itemId}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr auto auto auto',
                      gap: '12px',
                      alignItems: 'center',
                      padding: '10px 0',
                      borderBottom: '1px solid rgba(255,255,255,0.12)',
                    }}
                  >
                    <span>
                      <strong>{displayName(item)}</strong>
                      <br />
                      <small>
                        {item.itemId} · {formatEuro(item.priceCents)} ·{' '}
                        {item.mealType === 'lunch' ? t('Lounas', 'Lunch') : t('À la carte', 'A la carte')}
                      </small>
                    </span>

                    {item.featured ? <span>{t('Etusivulla', 'Featured')}</span> : <span />}

                    <button
                      className="button button--secondary"
                      type="button"
                      onClick={() => openEditPizza(item)}
                    >
                      {t('Muokkaa', 'Edit')}
                    </button>

                    <button
                      className="button button--secondary"
                      type="button"
                      onClick={() => handleDeletePizza(item.itemId)}
                    >
                      {t('Poista', 'Delete')}
                    </button>
                  </li>
                ))}
              </ul>
            </article>
          </div>

          <div className="admin-actions">
            <button
              className="button button--primary"
              type="button"
              onClick={openCreatePizza}
            >
              {t('Luo uusi pizza', 'Create new pizza')}
            </button>

            <button
              className="button button--secondary"
              type="button"
              onClick={handleExport}
            >
              {t('Vie nykyinen data', 'Export current data')}
            </button>

            <button
              className="button button--primary"
              type="button"
              onClick={handleSaveMenu}
            >
              {t('Tallenna pizzamuutokset', 'Save menu changes')}
            </button>
          </div>
        </section>

        <section className="admin-panel">
          <div className="section__heading">
            <p className="section__label">{t('Lounastarjous', 'Lunch offer')}</p>
            <h2>{t('Muokkaa lounastarjousta', 'Edit lunch offer')}</h2>
          </div>

          <div className="menu-editor__fields">
            <div className="menu-editor__grid">
              <label className="menu-editor__field">
                <span>{t('Nimi', 'Name')}</span>
                <input
                  type="text"
                  value={offerForm.label}
                  onChange={event =>
                    setOfferForm(current => ({
                      ...current,
                      label: event.target.value,
                    }))
                  }
                />
              </label>

              <label className="menu-editor__field">
                <span>{t('Otsikko', 'Title')}</span>
                <input
                  type="text"
                  value={offerForm.title}
                  onChange={event =>
                    setOfferForm(current => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                />
              </label>

              <label className="menu-editor__field">
                <span>{t('Alennusprosentti', 'Discount percent')}</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={offerForm.discountPercent}
                  onChange={event =>
                    setOfferForm(current => ({
                      ...current,
                      discountPercent: event.target.value,
                    }))
                  }
                />
              </label>

              <label className="menu-editor__field">
                <span>{t('Alkaa', 'Starts')}</span>
                <input
                  type="time"
                  value={offerForm.startTime}
                  onChange={event =>
                    setOfferForm(current => ({
                      ...current,
                      startTime: event.target.value,
                    }))
                  }
                />
              </label>

              <label className="menu-editor__field">
                <span>{t('Päättyy', 'Ends')}</span>
                <input
                  type="time"
                  value={offerForm.endTime}
                  onChange={event =>
                    setOfferForm(current => ({
                      ...current,
                      endTime: event.target.value,
                    }))
                  }
                />
              </label>
            </div>

            <label className="menu-editor__field">
              <span>{t('Teksti, kun tarjous on voimassa', 'Text when offer is active')}</span>
              <textarea
                rows="3"
                value={offerForm.activeText}
                onChange={event =>
                  setOfferForm(current => ({
                    ...current,
                    activeText: event.target.value,
                  }))
                }
              />
            </label>

            <label className="menu-editor__field">
              <span>{t('Teksti, kun tarjous ei ole voimassa', 'Text when offer is inactive')}</span>
              <textarea
                rows="3"
                value={offerForm.inactiveText}
                onChange={event =>
                  setOfferForm(current => ({
                    ...current,
                    inactiveText: event.target.value,
                  }))
                }
              />
            </label>
          </div>

          <div className="admin-actions">
            <button
              className="button button--primary"
              type="button"
              onClick={handleSaveOffer}
              disabled={isSavingOffer}
            >
              {isSavingOffer ? t('Tallennetaan...', 'Saving...') : t('Tallenna lounastarjous', 'Save lunch offer')}
            </button>
          </div>
        </section>

        <aside className="admin-panel admin-panel--summary">
          <p className="section__label">{t('Yhteenveto', 'Summary')}</p>
          <h2>{menuStats.itemCount} tuotetta</h2>
          <p>
            {t(
              'Pizzamuutokset tallennetaan tietokantaan erillisellä tallennusnapilla. Lounastarjous tallennetaan omasta napistaan.',
              'Menu changes are saved to the database using a separate save button. The lunch offer has its own save button.'
            )}
          </p>
        </aside>

        {message.text ? (
          <section className="admin-panel">
            <p
              className={`admin-message admin-message--${message.type}`}
              role="status"
            >
              {message.text}
            </p>
          </section>
        ) : null}
      </main>

      {editingItem ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={isCreateMode
                    ? t('Uusi pizza', 'New pizza')
                    : t('Muokkaa pizzaa', 'Edit pizza')}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            background: 'rgba(0, 0, 0, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
          }}
        >
          <div
            className="admin-panel"
            style={{
              width: 'min(920px, 100%)',
              maxHeight: '90vh',
              overflow: 'auto',
            }}
          >
            <div className="section__heading">
              <p className="section__label">
                {isCreateMode ? t('Uusi pizza', 'New pizza') : t('Muokkaa pizzaa', 'Edit pizza')}
              </p>
              <h2>{displayName(editingItem) || (isEnglish ? 'Pizza' : 'Pizza')}</h2>
            </div>

            <div className="menu-editor__item">
              <div className="menu-editor__media">
                <img
                  className="menu-editor__preview"
                  src={resolveImageUrl(
                    editingItem.image ||
                      '/src/assets/images/pizza-margherita.jpg'
                  )}
                  alt={displayName(editingItem) || (isEnglish ? 'Pizza' : 'Pizza')}
                />

                <label className="menu-editor__field">
                  <span>{t('Kuvan valinta', 'Image selection')}</span>
                  <select
                    value={editingItem.image}
                    onChange={event =>
                      updateEditingItem('image', event.target.value)
                    }
                  >
                    {IMAGE_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label
                  className="menu-editor__field"
                  style={{display: 'flex', alignItems: 'center', gap: '8px'}}
                >
                  <input
                    type="checkbox"
                    checked={editingItem.featured}
                    onChange={event =>
                      updateEditingItem('featured', event.target.checked)
                    }
                    style={{
                      width: '20px',
                      height: '20px',
                      margin: 0,
                      marginTop: '20px',
                    }}
                  />
                  <span>{t('Näytä etusivulla', 'Show on front page')}</span>
                </label>
              </div>

              <div className="menu-editor__fields">
                <div className="menu-editor__grid">
                  <label className="menu-editor__field">
                    <span>{t('Tunnus', 'ID')}</span>
                    <input
                      type="text"
                      value={editingItem.itemId}
                      onChange={event =>
                        updateEditingItem('itemId', event.target.value)
                      }
                    />
                  </label>

                  <label className="menu-editor__field">
                    <span>{t('Hinta (€)', 'Price (€)')}</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={(Number(editingItem.priceCents) / 100).toFixed(2)}
                      onChange={event =>
                        updateEditingItem(
                          'priceCents',
                          Math.max(
                            0,
                            Math.round(Number(event.target.value || 0) * 100)
                          )
                        )
                      }
                    />
                  </label>

                  <label className="menu-editor__field">
                    <span>{t('Ryhmä', 'Group')}</span>
                    <select
                      value={editingItem.mealType}
                      onChange={event =>
                        updateEditingItem('mealType', event.target.value)
                      }
                    >
                      {MEAL_TYPE_OPTIONS.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.value === 'lunch'
                            ? (isEnglish ? 'Lunch' : 'Lounas')
                            : (isEnglish ? 'A la carte' : 'À la carte')}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="menu-editor__grid">
                  <label className="menu-editor__field">
                    <span>{isEnglish ? 'Name (EN)' : 'Nimi'}</span>
                    <input
                      type="text"
                      value={isEnglish ? (editingItem.nameEn || editingItem.name || '') : (editingItem.name || '')}
                      onChange={event =>
                        updateEditingItem(isEnglish ? 'nameEn' : 'name', event.target.value)
                      }
                    />
                  </label>

                  <label className="menu-editor__field">
                    <span>{isEnglish ? 'Name (FI)' : 'Name (EN)'}</span>
                    <input
                      type="text"
                      value={isEnglish ? (editingItem.name || '') : (editingItem.nameEn || '')}
                      onChange={event =>
                        updateEditingItem(isEnglish ? 'name' : 'nameEn', event.target.value)
                      }
                    />
                  </label>
                </div>

                <div className="menu-editor__grid">
                  <label className="menu-editor__field">
                    <span>{isEnglish ? 'Description (EN)' : 'Kuvaus'}</span>
                    <textarea
                      rows="3"
                      value={isEnglish ? (editingItem.descriptionEn || editingItem.description || '') : (editingItem.description || '')}
                      onChange={event =>
                        updateEditingItem(isEnglish ? 'descriptionEn' : 'description', event.target.value)
                      }
                    />
                  </label>

                  <label className="menu-editor__field">
                    <span>{isEnglish ? 'Description (FI)' : 'Description (EN)'}</span>
                    <textarea
                      rows="3"
                      value={isEnglish ? (editingItem.description || '') : (editingItem.descriptionEn || '')}
                      onChange={event =>
                        updateEditingItem(isEnglish ? 'description' : 'descriptionEn', event.target.value)
                      }
                    />
                  </label>
                </div>

                <div className="menu-editor__grid menu-editor__grid--compact">
                  <label className="menu-editor__field">
                    <span>{t('Allergeenit / diet', 'Allergens / diet')}</span>
                    <input
                      type="text"
                      value={editingItem.dietText}
                      onChange={event =>
                        updateEditingItem('dietText', event.target.value)
                      }
                      placeholder="VEG, G"
                    />
                  </label>

                  <label className="menu-editor__field">
                    <span>{t('Valuutta', 'Currency')}</span>
                    <input
                      type="text"
                      value={editingItem.currency}
                      onChange={event =>
                        updateEditingItem('currency', event.target.value)
                      }
                    />
                  </label>

                  <label className="menu-editor__field">
                    <span>{t('Kuvan polku', 'Image path')}</span>
                    <input
                      type="text"
                      value={editingItem.image}
                      onChange={event =>
                        updateEditingItem('image', event.target.value)
                      }
                      placeholder="/src/assets/images/..."
                    />
                  </label>
                </div>

                <div className="admin-actions">
                  <button
                    className="button button--primary"
                    type="button"
                    onClick={handleSavePizzaFromModal}
                  >
                    {isCreateMode ? t('Luo pizza', 'Create pizza') : t('Tallenna pizza', 'Save pizza')}
                  </button>

                  <button
                    className="button button--secondary"
                    type="button"
                    onClick={closePizzaModal}
                  >
                    {t('Peruuta', 'Cancel')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default AdminPage;