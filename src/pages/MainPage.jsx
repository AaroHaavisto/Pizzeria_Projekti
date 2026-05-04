import {useEffect, useState} from 'react';
import {Link} from 'react-router-dom';
import {getFeaturedMenuCards} from '../api/menuApi';
import {fetchRatings} from '../api/ratingsApi';
import Navigation from '../components/Navigation';
import {useCart} from '../contexts/CartContext';

function toPriceCents(value) {
  if (Number.isFinite(Number(value))) {
    return Math.max(0, Math.round(Number(value)));
  }

  return 0;
}

function MainPage() {
  const {addToCart} = useCart();
  const fallbackRatings = [
    {id: 1, score: '4.8/5', description: 'Asiakastyytyväisyys'},
  ];
  const fallbackMenuItems = [
    {
      id: 'kana-pizza',
      name: 'Kana-pizza',
      description: 'Kana, mozzarella, punasipuli ja talon tomaattikastike.',
      price: '12,50 €',
      priceCents: 1250,
      image: '/src/assets/images/pizza-chicken-bbq.jpg',
    },
    {
      id: 'diavola',
      name: 'Diavola',
      description: 'Salami piccante, chili ja mozzarella.',
      price: '13,20 €',
      priceCents: 1320,
      image: '/src/assets/images/pizza-diavola.jpg',
    },
    {
      id: 'tonno',
      name: 'Tonno',
      description: 'Tonnikala, kapris ja punasipuli.',
      price: '12,80 €',
      priceCents: 1280,
      image: '/src/assets/images/pizza-tonno.jpg',
    },
    {
      id: 'margherita',
      name: 'Margherita',
      description: 'Tomaatti, mozzarella, basilika ja oliiviöljy.',
      price: '9,90 €',
      priceCents: 990,
      image: '/src/assets/images/pizza-margherita.jpg',
    },
  ];
  const [menuItems, setMenuItems] = useState(fallbackMenuItems);
  const [ratings, setRatings] = useState(fallbackRatings);

  useEffect(() => {
    let mounted = true;

    async function loadRatings() {
      try {
        const base = `http://localhost:${import.meta.env.VITE_API_PORT || 3005}`;
        const response = await fetch(`${base}/api/ratings`);
        if (!response.ok) throw new Error('Failed to fetch ratings');
        const data = await response.json();
        if (mounted && Array.isArray(data.ratings)) {
          setRatings(data.ratings);
        }
      } catch {
        // Keep fallback ratings if API cannot be reached.
      }
    }

    loadRatings();

    return () => {
      mounted = false;
    };
  }, []);

  function handleFeaturedClick(item) {
    addToCart({
      id: item.id,
      name: item.name,
      description: item.description,
      image: item.image || '/src/assets/images/pizza-margherita.jpg',
      price: item.price,
      priceCents: toPriceCents(item.priceCents),
    });
  }

  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        // Page became visible, refresh ratings
        (async () => {
          try {
            const base = `http://localhost:${import.meta.env.VITE_API_PORT || 3005}`;
            const response = await fetch(`${base}/api/ratings`);
            if (response.ok) {
              const data = await response.json();
              if (Array.isArray(data.ratings)) {
                setRatings(data.ratings);
              }
            }
          } catch {
            // Keep current ratings if refresh fails
          }
        })();
      }
    }

    async function handleRatingsUpdate(_event) {
      try {
        const data = await fetchRatings();
        if (Array.isArray(data)) {
          setRatings(data);
        }
      } catch {
        // keep existing ratings on failure
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('ratingsUpdated', handleRatingsUpdate);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('ratingsUpdated', handleRatingsUpdate);
    };
  }, []);

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
          <div className="hero__utility-row">
            <div className="hero__control-stack">
              <div className="hero__actions">
                <Link className="button button--primary" to="/menu">
                  Katso menu
                </Link>
                <Link className="button button--secondary" to="/location">
                  Kartta
                </Link>
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
                {ratings.map(rating => (
                  <li key={rating.id}>
                    <strong>{rating.score}</strong>
                    <span>{rating.description}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="opening-hours-card">
              <p className="section__label">Aukioloajat</p>
              <h2>Pizzeria on auki</h2>
              <ul>
                <li>Ma - pe 6.00 - 18.00</li>
                <li>La - su 8.00 - 15.00</li>
              </ul>
              <p>Ennen klo 13 saat lounaspizzat 10 % edullisemmin.</p>
            </div>
          </div>
          
        </section>
      </header>

      <main>
        <section className="section section--feature" id="tarjoukset">
          <div>
            <p className="section__label">Lounastarjous</p>
            <h2>10 % edullisempi ennen klo 13</h2>
            <p>
              Ennen klo 13 tilatut pizzat ovat 10 % tavallista halvempia.
              Tarjous koskee nouto- ja verkkotilauksia.
            </p>
          </div>
          <div className="feature-card">
            <span className="feature-card__badge">-10%</span>
            <h3>Lounaskello</h3>
            <p>Valitse suosikkisi ja tilaa ennen yhtä.</p>
          </div>
        </section>

        <section className="section section--classics" id="menu">
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
              <Link
                className="menu-card menu-card--clickable"
                key={item.id || item.name}
                to={`/menu#pizza-${item.id}`}
                onClick={() => handleFeaturedClick(item)}
              >
                <h3>{item.name}</h3>
                <p>{item.description}</p>
                <span>{item.price}</span>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}

export default MainPage;
