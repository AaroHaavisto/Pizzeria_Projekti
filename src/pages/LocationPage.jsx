import { useEffect } from 'react';
import Navigation from '../components/Navigation';
import { MapContainer, TileLayer, Marker, Popup, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import {useLanguage} from '../contexts/LanguageContext';

const RESTAURANT_COORDS = [60.16880, 24.93265];
const RESTAURANT_ADDRESS = 'Urho Kekkosen katu 1, 00100 Helsinki';
const HSL_ROUTE_URL = 'https://reittiopas.hsl.fi/reitti/Urho%20Kekkosen%20katu%201%2C%20Helsinki/';

const restaurantMarker = L.divIcon({
  className: 'location-map__marker',
  html: '<span class="location-map__marker-dot"></span>',
  iconSize: [22, 22],
  iconAnchor: [11, 22],
  popupAnchor: [0, -18],
});

function LocationPage() {
  const {language} = useLanguage();
  const isEnglish = language === 'en';

  useEffect(() => {
    document.title = isEnglish ? 'Location - Slice Hunt' : 'Sijainti - Slice Hunt';
  }, [isEnglish]);

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(RESTAURANT_ADDRESS)}`;

  return (
    <>
      <header className="hero hero--location">
        <Navigation />
        <section className="hero__content hero__content--location">
          <div className="location-hero">
            <h1>{isEnglish ? 'Location' : 'Sijainti'}</h1>
            <p>{RESTAURANT_ADDRESS}</p>
          </div>
        </section>
      </header>

      <main>
        <section className="section section--location">
          <div className="location-map">
            <MapContainer center={RESTAURANT_COORDS} zoom={17} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <Marker position={RESTAURANT_COORDS} icon={restaurantMarker}>
                <Tooltip permanent direction="top" offset={[0, -14]}>
                  {RESTAURANT_ADDRESS}
                </Tooltip>
                <Popup>Slice Hunt - {RESTAURANT_ADDRESS}</Popup>
              </Marker>
            </MapContainer>
          </div>

          <div className="location-map__actions">
            <a className="button button--primary" href={mapsUrl} target="_blank" rel="noopener noreferrer">
              {isEnglish ? 'Map' : 'Kartta'}
            </a>
            <a className="button button--secondary" href={HSL_ROUTE_URL} target="_blank" rel="noopener noreferrer">
              {isEnglish ? 'Transit route' : 'HSL Reitti'}
            </a>
          </div>
        </section>
      </main>
    </>
  );
}

export default LocationPage;
