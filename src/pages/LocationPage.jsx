import { useEffect } from 'react';
import Navigation from '../components/Navigation';
import { MapContainer, TileLayer, Marker, Popup, Tooltip } from 'react-leaflet';
import L from 'leaflet';

const RESTAURANT_COORDS = [60.16955, 24.93225];
const RESTAURANT_ADDRESS = 'Urho Kekkosen katu 1, 00100 Helsinki';

const restaurantMarker = L.divIcon({
  className: 'location-map__marker',
  html: '<span class="location-map__marker-dot"></span>',
  iconSize: [22, 22],
  iconAnchor: [11, 22],
  popupAnchor: [0, -18],
});

function LocationPage() {
  useEffect(() => {
    document.title = 'Sijainti - Pizzeria Pro';
  }, []);

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(RESTAURANT_ADDRESS)}`;

  return (
    <>
      <header className="hero hero--location">
        <Navigation />
        <section className="hero__content hero__content--location">
          <div className="location-hero">
            <h1>Sijainti</h1>
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
                <Popup>Pizzeria Pro - {RESTAURANT_ADDRESS}</Popup>
              </Marker>
            </MapContainer>
          </div>

          <div className="location-map__actions">
            <a className="button button--primary" href={mapsUrl} target="_blank" rel="noopener noreferrer">
              Open in Google Maps
            </a>
          </div>
        </section>
      </main>
    </>
  );
}

export default LocationPage;
