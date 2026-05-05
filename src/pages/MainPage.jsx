import {useEffect, useState} from 'react';
import {Link} from 'react-router-dom';
import {getFeaturedMenuItems} from '../api/menuApi';
import {fetchOpeningHours} from '../api/openingHoursApi';
import {fetchRatings} from '../api/ratingsApi';
import Navigation from '../components/Navigation';
import {useCart} from '../contexts/CartContext';
import {useOffer} from '../contexts/OfferContext';
import {applyLunchDiscount, isLunchOfferActive} from '../utils/offer';

function toPriceCents(value) {
  if (Number.isFinite(Number(value))) {
    return Math.max(0, Math.round(Number(value)));
  }

  return 0;
}

function formatPriceCents(cents, currency = 'EUR') {
  return new Intl.NumberFormat('fi-FI', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(Number(cents) / 100);
}
function MainPage() {
  const {addToCart} = useCart();
  const {offer} = useOffer();
  const fallbackRatings = [
    {id: 1, score: '4.8/5', description: 'Asiakastyytyväisyys'},
  ];
  const fallbackOpeningHours = {
    label: 'Aukioloajat',
    title: 'Pizzeria on auki',
    weekdaysLabel: 'Ma - pe',
    weekdaysHours: '6.00 - 18.00',
    weekendsLabel: 'La - su',
    weekendsHours: '8.00 - 15.00',
    lunchNote: 'Ennen klo 13 saat lounaspizzat edullisemmin.',
  };
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
  const [openingHours, setOpeningHours] = useState(fallbackOpeningHours);
  const offerActive = isLunchOfferActive(new Date(), offer);
  const discountPercent = Number(offer.discountPercent) || 0;
  const ratingSummary = (ratings && ratings.length > 0) ? ratings[0] : fallbackRatings[0];

  useEffect(() => {
    let mounted = true;

    async function loadOpeningHours() {
      const hours = await fetchOpeningHours();
      if (mounted) {
        setOpeningHours(hours);
      }
    }

    loadOpeningHours();

    return () => {
      mounted = false;
    };
  }, []);

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

    async function handleRatingsUpdate() {
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
        const featured = await getFeaturedMenuItems();

        if (mounted && featured.length > 0) {
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
            </div>
            <div className="opening-hours-card">
              <p className="section__label">{openingHours.label}</p>
              <h2>{openingHours.title}</h2>
              <ul>
                <li>{openingHours.weekdaysLabel} {openingHours.weekdaysHours}</li>
                <li>{openingHours.weekendsLabel} {openingHours.weekendsHours}</li>
              </ul>
              <p>{openingHours.lunchNote}</p>
            </div>
            <div className="rating-summary-card rating-summary-card--featured">
              <p className="section__label">Asiakastyytyväisyys</p>
              <div className="rating-summary-card__score-row">
                <h3>{ratingSummary.score}</h3>
                <span>Tämän päivän keskiarvo</span>
              </div>
              <p className="rating-summary-card__text">
                Asiakkaat arvostavat nopeaa palvelua ja tuoreita makuja.
              </p>
            </div>
          </div>
          
        </section>
      </header>

      <main>
        <section className="section section--feature" id="tarjoukset">
          <div>
            <p className="section__label">{offer.label}</p>
            <h2>{offer.title}</h2>
            <p>{offerActive ? offer.activeText : offer.inactiveText}</p>
          </div>
          <div className="feature-card">
            <span className="feature-card__badge">-{discountPercent}%</span>
            <h3>Lounaskello</h3>
            <p>Voimassa {offer.startTime}–{offer.endTime}.</p>
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
            {menuItems.map(item => {
              const priceCents = Number(item.priceCents || 0);
              const discountedCents = applyLunchDiscount(priceCents, new Date(), offer);
              const showDiscount = offerActive && priceCents > 0;

              return (
                <Link
                  className="menu-card menu-card--clickable"
                  key={item.id || item.name}
                  to={`/menu#pizza-${item.id}`}
                  onClick={() => handleFeaturedClick(item)}
                >
                  {showDiscount && <span className="menu-card__badge">-{discountPercent}%</span>}
                  <h3>{item.name}</h3>
                  <p>{item.description}</p>
                  <div className="price-row">
                    {showDiscount ? (
                      <>
                        <span className="menu-card__price-old">{formatPriceCents(priceCents)}</span>
                        <span className="menu-card__price-discount">{formatPriceCents(discountedCents)}</span>
                      </>
                    ) : (
                      <span className="menu-card__price-normal">{formatPriceCents(priceCents)}</span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      </main>
    </>
  );
}

export default MainPage;
