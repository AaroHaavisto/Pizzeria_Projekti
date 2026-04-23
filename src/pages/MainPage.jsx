import {useEffect, useState} from 'react';
import {Link} from 'react-router-dom';
import {getFeaturedMenuCards} from '../api/menuApi';
import Navigation from '../components/Navigation';

function MainPage() {
  const fallbackMenuItems = [
    {
      id: 'kana-pizza',
      name: 'Kana-pizza',
      description: 'Kana, mozzarella, punasipuli ja talon tomaattikastike.',
      price: '12,50 €',
    },
    {
      id: 'diavola',
      name: 'Diavola',
      description: 'Salami piccante, chili ja mozzarella.',
      price: '13,20 €',
    },
    {
      id: 'tonno',
      name: 'Tonno',
      description: 'Tonnikala, kapris ja punasipuli.',
      price: '12,80 €',
    },
    {
      id: 'margherita',
      name: 'Margherita',
      description: 'Tomaatti, mozzarella, basilika ja oliiviöljy.',
      price: '9,90 €',
    },
  ];
  const [menuItems, setMenuItems] = useState(fallbackMenuItems);

  useEffect(() => {
    let mounted = true;

    async function loadFeatured() {
      try {
        const featured = await getFeaturedMenuCards([
          'Kana-pizza',
          'Diavola',
          'Tonno',
          'Margherita',
        ]);

        if (mounted && featured.length === 4) {
          setMenuItems(featured);
        }
      } catch {
        // Keep fallback menu items if API cannot be reached.
      }
    }

    loadFeatured();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <>
      <header className="hero hero--home">
        <Navigation />

        <section className="hero__content" id="etusivu">
          <div
            className="hero__title-banner"
            role="img"
            aria-label="Tuore pizza puupöydällä"
          >
            <h1>Pizzaa, joka maistuu oikeasti italialaiselta.</h1>
          </div>
          <p className="hero__text">
            Rapea pohja, täyteläinen tomaattikastike ja parhaat raaka-aineet.
            Tilaa nouto, kotiinkuljetus tai tule syömään paikan päälle.
          </p>
          <div className="hero__actions">
            <Link className="button button--primary" to="/menu">
              Katso menu
            </Link>
            <a className="button button--secondary" href="#sijainti">
              Aukioloajat
            </a>
          </div>
          <div className="hero__subactions">
            <Link className="chip-link" to="/cart">
              Ostoskori
            </Link>
            <a className="chip-link" href="#menu">
              Suosikit
            </a>
          </div>
          <ul
            className="hero__stats"
            aria-label="Pizzeria Pro - nopea yhteenveto"
          >
            <li>
              <strong>30 min</strong>
              <span>Keskimääräinen toimitus</span>
            </li>
            <li>
              <strong>24/7</strong>
              <span>Verkkotilaus auki</span>
            </li>
            <li>
              <strong>4.8/5</strong>
              <span>Asiakastyytyväisyys</span>
            </li>
          </ul>
        </section>
      </header>

      <main>
        <section className="section section--feature" id="tarjoukset">
          <div>
            <p className="section__label">Tämän viikon tarjous</p>
            <h2>Kaksi suosikkia yhdellä hinnalla</h2>
            <p>
              Tilaa Margherita ja Pepperoni yhdessä, niin saat toisen juoman
              veloituksetta. Tarjous koskee nouto- ja verkkotilauksia.
            </p>
          </div>
          <div className="feature-card">
            <span className="feature-card__badge">-15%</span>
            <h3>Pizzeria Pro Duo</h3>
            <p>Kaksi pizzaa, kaksi juomaa ja valkosipulidippi.</p>
          </div>
        </section>

        <section className="section" id="menu">
          <div className="section__heading">
            <p className="section__label">Suosituimmat</p>
            <h2>Valmiit klassikot</h2>
            <p>
              <Link className="inline-link" to="/menu">
                Avaa koko menu -&gt;
              </Link>
            </p>
          </div>

          <div className="menu-grid">
            {menuItems.map(item => (
              <article className="menu-card" key={item.id || item.name}>
                <h3>{item.name}</h3>
                <p>{item.description}</p>
                <span>{item.price}</span>
              </article>
            ))}
          </div>
        </section>

        <section className="section info-grid" id="sijainti">
          <article className="info-card">
            <p className="section__label">Aukioloajat</p>
            <h2>Olemme auki joka päivä</h2>
            <p>Ma-To 11:00-21:00</p>
            <p>Pe-La 11:00-23:00</p>
            <p>Su 12:00-20:00</p>
          </article>

          <article className="info-card info-card--dark">
            <p className="section__label">Sijainti</p>
            <h2>Keskustassa, lähellä kaikkea</h2>
            <p>Keskuskatu 12, 00100 Helsinki</p>
            <p>Puh. 010 123 4567</p>
            <p>Sähköposti: tilaukset@pizzeriapro.fi</p>
          </article>
        </section>
      </main>
    </>
  );
}

export default MainPage;
