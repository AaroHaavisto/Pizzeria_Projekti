import {useEffect, useState} from 'react';
import {Link} from 'react-router-dom';
import {getFeaturedMenuItems} from '../api/menuApi';
import {fetchOpeningHours} from '../api/openingHoursApi';
import Navigation from '../components/Navigation';
import {useCart} from '../contexts/CartContext';
import {useLanguage} from '../contexts/LanguageContext';
import {useOffer} from '../contexts/OfferContext';
import {applyLunchDiscount, formatEuro, isLunchOfferActive} from '../utils/offer';

function MainPage() {
  const {language} = useLanguage();
  const isEnglish = language === 'en';
  const {addToCart} = useCart();
  const {offer} = useOffer();
  const offerActive = isLunchOfferActive(new Date(), offer);

  const fallbackRatings = [
    {id: 1, score: '4.8/5', description: isEnglish ? 'Customer satisfaction' : 'Asiakastyytyväisyys'},
  ];
  const fallbackOpeningHours = {
    label: isEnglish ? 'Opening hours' : 'Aukioloajat',
    title: isEnglish ? 'Pizzeria is open' : 'Pizzeria on auki',
    weekdaysLabel: isEnglish ? 'Mon - Fri' : 'Ma - pe',
    weekdaysHours: '6.00 - 18.00',
    weekendsLabel: isEnglish ? 'Sat - Sun' : 'La - su',
    weekendsHours: '8.00 - 15.00',
  };
  const fallbackMenuItems = isEnglish
    ? [
        {
          id: 'kana-pizza',
          name: 'Chicken pizza',
          description: 'Chicken, mozzarella, red onion, and house tomato sauce.',
          price: '12,50 €',
          priceCents: 1250,
          image: '/src/assets/images/pizza-chicken-bbq.jpg',
        },
        {
          id: 'diavola',
          name: 'Diavola',
          description: 'Spicy salami, chili, and mozzarella.',
          price: '13,20 €',
          priceCents: 1320,
          image: '/src/assets/images/pizza-diavola.jpg',
        },
        {
          id: 'tonno',
          name: 'Tuna pizza',
          description: 'Tuna, capers, and red onion.',
          price: '12,80 €',
          priceCents: 1280,
          image: '/src/assets/images/pizza-tonno.jpg',
        },
        {
          id: 'margherita',
          name: 'Margherita',
          description: 'Tomato, mozzarella, basil, and olive oil.',
          price: '9,90 €',
          priceCents: 990,
          image: '/src/assets/images/pizza-margherita.jpg',
        },
      ]
    : [
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

  useEffect(() => {
    let mounted = true;

    async function loadOpeningHours() {
      const hours = await fetchOpeningHours();
      if (mounted && hours) {
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
        const base = import.meta.env.VITE_API_BASE_URL || '';
        const response = await fetch(`${base}/api/ratings`);
        if (!response.ok) throw new Error('Failed to fetch ratings');
        const data = await response.json();
        if (mounted && Array.isArray(data.ratings)) {
          setRatings(data.ratings);
        }
      } catch {
        // keep fallback ratings
      }
    }

    loadRatings();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadFeatured() {
      try {
        const featured = await getFeaturedMenuItems();
        if (mounted && Array.isArray(featured) && featured.length > 0) {
          setMenuItems(featured);
        }
      } catch {
        // keep fallback menu items
      }
    }

    loadFeatured();

    return () => {
      mounted = false;
    };
  }, []);

  const ratingSummary = ratings.length > 0 ? ratings[0] : fallbackRatings[0];
  const displayOpeningHours = isEnglish
    ? {
        ...openingHours,
        label: 'Opening hours',
        title: 'Pizzeria is open',
        weekdaysLabel: 'Mon - Fri',
        weekendsLabel: 'Sat - Sun',
      }
    : openingHours;

  return (
    <>
      <header className="hero hero--home">
        <Navigation />

        <section className="hero__content" id="etusivu">
          <div className="hero__title-banner" role="img" aria-label="Tuore pizza puupöydällä">
            <h1>{isEnglish ? 'Pizza that actually tastes Italian.' : 'Pizzaa, joka maistuu oikeasti italialaiselta.'}</h1>
          </div>
          <p className="hero__text">
            {isEnglish
              ? 'Crispy base, rich tomato sauce, and the best ingredients. Order pickup, delivery, or eat in.'
              : 'Rapea pohja, täyteläinen tomaattikastike ja parhaat raaka-aineet. Tilaa nouto, kotiinkuljetus tai tule syömään paikan päälle.'}
          </p>
          <div className="hero__utility-row">
            <div className="hero__control-stack">
              <div className="hero__actions">
                <Link className="button button--primary" to="/menu">
                  {isEnglish ? 'View menu' : 'Katso menu'}
                </Link>
                <Link className="button button--secondary" to="/location">
                  {isEnglish ? 'Map' : 'Kartta'}
                </Link>
              </div>
              <div className="hero__subactions">
                <Link className="chip-link" to="/cart">
                  {isEnglish ? 'Cart' : 'Ostoskori'}
                </Link>
                <a className="chip-link" href="#menu">
                  {isEnglish ? 'Favorites' : 'Suosikit'}
                </a>
              </div>
            </div>
            <div className="opening-hours-card">
              <p className="section__label">{displayOpeningHours.label}</p>
              <h2>{displayOpeningHours.title}</h2>
              <ul>
                <li>{displayOpeningHours.weekdaysLabel} {displayOpeningHours.weekdaysHours}</li>
                <li>{displayOpeningHours.weekendsLabel} {displayOpeningHours.weekendsHours}</li>
              </ul>
              <p>
                <Link className="inline-link" to="/menu?focus=all#menu-pizzat">
                  {isEnglish ? 'Open the menu' : 'Avaa menu'}
                </Link>
              </p>
            </div>
            <div className="rating-summary-card rating-summary-card--featured">
              <p className="section__label">{isEnglish ? 'Customer satisfaction' : 'Asiakastyytyväisyys'}</p>
              <div className="rating-summary-card__score-row">
                <h3>{ratingSummary.score}</h3>
                <span>{isEnglish ? 'Today’s average' : 'Tämän päivän keskiarvo'}</span>
              </div>
              <p className="rating-summary-card__text">
                {isEnglish
                  ? 'Customers appreciate fast service and fresh flavors.'
                  : 'Asiakkaat arvostavat nopeaa palvelua ja tuoreita makuja.'}
              </p>
            </div>
          </div>
        </section>
      </header>

      <main>
        <section className="section section--classics" id="menu">
          <div className="section__heading">
            <p className="section__label">{isEnglish ? 'Featured' : 'Suosituimmat'}</p>
            <h2>{isEnglish ? 'Ready-made classics' : 'Valmiit klassikot'}</h2>
            <p>
              <Link className="inline-link" to="/menu">
                {isEnglish ? 'Open full menu ->' : 'Avaa koko menu ->'}
              </Link>
            </p>
          </div>

          <div className="menu-grid">
            {menuItems.map(item => {
              const priceCents = Number(item.priceCents || 0);
              const discountedCents = applyLunchDiscount(priceCents, new Date(), offer);
              const hasDiscount = offerActive && discountedCents < priceCents;

              return (
                <Link
                  className="menu-card menu-card--clickable"
                  key={item.id || item.name}
                  to={`/menu?focus=${encodeURIComponent(item.id)}#pizza-${encodeURIComponent(item.id)}`}
                  onClick={() => {
                    addToCart({
                      id: item.id,
                      name: item.name,
                      description: item.description,
                      image: item.image,
                      price: item.price,
                      priceCents: Number(item.priceCents || 0),
                    });
                  }}
                >
                  <h3>{item.name}</h3>
                  <p>{item.description}</p>
                  <div className="price-row">
                    {hasDiscount ? (
                      <>
                        <span className="menu-card__price-old">{formatEuro(priceCents)}</span>
                        <span className="menu-card__price-discount">{formatEuro(discountedCents)}</span>
                        <span className="menu-card__price-save">
                          {isEnglish ? 'Save' : 'Säästät'} {formatEuro(priceCents - discountedCents)}
                        </span>
                      </>
                    ) : (
                      <span className="menu-card__price-normal">{formatEuro(priceCents)}</span>
                    )}
                  </div>
                  <img
                    src={item.image}
                    alt={item.name}
                    draggable={false}
                    onDragStart={event => event.preventDefault()}
                  />
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
