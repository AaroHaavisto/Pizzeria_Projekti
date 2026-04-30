import {useEffect} from 'react';
import {Link} from 'react-router-dom';
import Navigation from '../components/Navigation';

function LocationPage() {
  useEffect(() => {
    document.title = 'Sijainti ja yhteystiedot - Pizzeria Pro';
  }, []);

  return (
    <>
      <header className="hero">
        <Navigation />
        <section className="hero__content">
          <div className="location-hero">
            <h1>Sijainti ja yhteystiedot</h1>
            <p>Tule paikan päälle tai ota yhteyttä tilauksia varten.</p>
          </div>
        </section>
      </header>

      <main>
        <section className="section location-grid">
          <article className="location-card">
            <div className="location-card__icon" aria-hidden="true"></div>
            <h2>Aukioloajat</h2>
            <div className="location-card__content">
              <div className="hours-item">
                <strong>Maanantai - Torstai</strong>
                <p>11:00 - 21:00</p>
              </div>
              <div className="hours-item">
                <strong>Perjantai - Lauantai</strong>
                <p>11:00 - 23:00</p>
              </div>
              <div className="hours-item">
                <strong>Sunnuntai</strong>
                <p>12:00 - 20:00</p>
              </div>
              <div className="note">
                <p>Verkkotilaukset 24/7</p>
              </div>
            </div>
          </article>

          <article className="location-card">
            <div className="location-card__icon" aria-hidden="true"></div>
            <h2>Osoite</h2>
            <div className="location-card__content">
              <p>
                <strong>Keskuskatu 12</strong>
                <br />
                00100 Helsinki
              </p>
              <p className="location-info">
                Hyvät joukkoliikenneyhteydet ja paikoitus.
              </p>
            </div>
          </article>

          <article className="location-card">
            <div className="location-card__icon" aria-hidden="true"></div>
            <h2>Puhelin</h2>
            <div className="location-card__content">
              <p>
                <a href="tel:+358101234567" className="contact-link">
                  +358 10 123 4567
                </a>
              </p>
              <p className="location-info">Saatavilla aukioloaikoina.</p>
            </div>
          </article>

          <article className="location-card">
            <div className="location-card__icon" aria-hidden="true"></div>
            <h2>Sähköposti</h2>
            <div className="location-card__content">
              <p>
                <a href="mailto:tilaukset@pizzeriapro.fi" className="contact-link">
                  tilaukset@pizzeriapro.fi
                </a>
              </p>
              <p className="location-info">Vastaamme sähköposteihin aukioloaikoina.</p>
            </div>
          </article>
        </section>

        <section className="section location-cta">
          <h2>Tervetuloa!</h2>
          <p>Haluatko tilata vai tulla syömään? Valitse alla:</p>
          <div className="location-actions">
            <Link className="button button--primary" to="/menu">
              Katso menu
            </Link>
            <Link className="button button--secondary" to="/cart">
              Avaa ostoskori
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}

export default LocationPage;
