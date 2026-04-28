import {useEffect, useMemo, useState} from 'react';
import {Link, useLocation} from 'react-router-dom';
import Navigation from '../components/Navigation';
import {useMenuData} from '../contexts/MenuDataContext';
import {isValidMenuJson} from '../utils/menuStore';
import '../css/admin_style.css';

function AdminPage() {
  const location = useLocation();
  const {menuData, replaceMenuData, restoreDefaultMenu} = useMenuData();
  const [jsonText, setJsonText] = useState(() =>
    JSON.stringify(menuData, null, 2)
  );
  const [message, setMessage] = useState({type: '', text: ''});

  useEffect(() => {
    setJsonText(JSON.stringify(menuData, null, 2));
  }, [menuData]);

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

  const menuStats = useMemo(() => {
    const itemCount = Array.isArray(menuData.items)
      ? menuData.items.length
      : Array.isArray(menuData.days)
        ? menuData.days.reduce(
            (sum, day) =>
              sum + (Array.isArray(day.items) ? day.items.length : 0),
            0
          )
        : 0;

    return {itemCount};
  }, [menuData]);

  async function handleSave() {
    try {
      const parsed = JSON.parse(jsonText);

      if (!isValidMenuJson(parsed)) {
        throw new Error(
          'JSON-muodossa pitää olla items-taulukko tai vanha days-rakenne.'
        );
      }

      await replaceMenuData(parsed);
      setMessage({
        type: 'success',
        text: 'Menu tallennettu tietokantaan.',
      });
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.message || 'JSON ei ollut kelvollinen.',
      });
    }
  }

  async function handleReset() {
    await restoreDefaultMenu();
    setMessage({type: 'success', text: 'Menu ladattu uudelleen tietokannasta.'});
  }

  function handleExport() {
    const blob = new Blob([jsonText], {type: 'application/json'});
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'pizzeria-menu.json';
    link.click();
    URL.revokeObjectURL(link.href);
  }

  if (!isDevMode) {
    return (
      <div className="admin-page">
        <header className="hero hero--admin">
          <Navigation />

          <section className="hero__content admin-hero">
            <p className="eyebrow">Hallinta</p>
            <h1>Hallintasivu on vain kehityskäyttöön.</h1>
            <p className="hero__text admin-hero__text">
              Tämä näkymä ei ole osa normaalia asiakaskokemusta.
            </p>
            <div className="hero__actions">
              <Link className="button button--primary" to="/menu">
                Siirry menuun
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
          <h1>Muokkaa ruokalistaa JSON-editorilla.</h1>
          <p className="hero__text admin-hero__text">
            Tämä sivu toimii yhtenä hallintanäkymänä, jossa sisältöä voi
            muokata, tallentaa ja palauttaa tietokannan kautta.
          </p>
          <div className="hero__actions">
            <button
              className="button button--primary"
              type="button"
              onClick={handleSave}
            >
              Tallenna JSON
            </button>
            <Link className="button button--secondary" to="/menu">
              Näytä menu
            </Link>
          </div>
          <div className="hero__subactions">
            <Link className="chip-link" to="/cart">
              Ostoskori
            </Link>
            <button
              className="chip-link chip-link--button"
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
            <h2>Muokkaa koko JSON-dataa</h2>
          </div>

          <textarea
            className="json-editor"
            value={jsonText}
            onChange={event => setJsonText(event.target.value)}
            spellCheck="false"
            aria-label="Ruokalistan JSON-editori"
          />

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
              Vie JSON
            </button>
          </div>
        </section>

        <aside className="admin-panel admin-panel--summary">
          <p className="section__label">Yhteenveto</p>
          <h2>{menuStats.itemCount} tuotetta</h2>
          <p>
            Tallennus tapahtuu tietokantaan, joten sisältö säilyy sivun välillä
            backendin kautta.
          </p>

          <div className="admin-preview">
            <article className="admin-preview__day">
              <div className="admin-preview__head">
                <strong>Kaikki tuotteet</strong>
              </div>
              <ul>
                {(Array.isArray(menuData.items)
                  ? menuData.items
                  : Array.isArray(menuData.days)
                    ? menuData.days.flatMap(day =>
                        Array.isArray(day.items) ? day.items : []
                      )
                    : []
                ).map(item => (
                  <li key={item.itemId}>
                    {item.name} -{' '}
                    {(item.priceCents / 100).toFixed(2).replace('.', ',')} €
                  </li>
                ))}
              </ul>
            </article>
          </div>
        </aside>
      </main>
    </div>
  );
}

export default AdminPage;
