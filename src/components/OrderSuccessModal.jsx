import {useEffect} from 'react';
import {Link} from 'react-router-dom';

function OrderSuccessModal({order, onClose}) {
  useEffect(() => {
    // Voidaan lisätä automaattinen sulkeistuminen esim. 5 sekunnin jälkeen
    // const timeout = setTimeout(onClose, 5000);
    // return () => clearTimeout(timeout);
  }, [onClose]);

  if (!order) {
    return null;
  }

  const formattedTotal = new Intl.NumberFormat('fi-FI', {
    style: 'currency',
    currency: 'EUR',
  }).format(order.totalAmount);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>✓ Kiitos tilauksestasi!</h2>
          <button
            className="modal-close"
            type="button"
            onClick={onClose}
            aria-label="Sulje dialogi"
          >
            ✕
          </button>
        </div>

        <div className="modal-body">
          <p className="modal-success-message">
            Tilauksesi on vastaanotettu ja tallennettu järjestelmään.
          </p>

          <div className="order-summary">
            <div className="order-info">
              <p>
                <strong>Tilauksen ID:</strong> #{order.id}
              </p>
              <p>
                <strong>Kokonaissumma:</strong> {formattedTotal}
              </p>
              <p>
                <strong>Tuotteita:</strong> {order.items?.length || 0} kpl
              </p>
              <p>
                <strong>Status:</strong> {order.status || 'Käsitteillä'}
              </p>
            </div>

            {order.items && order.items.length > 0 && (
              <div className="order-items">
                <h3>Tilauksen sisältö:</h3>
                <ul>
                  {order.items.map(item => (
                    <li key={item.id}>
                      {item.quantity}x tuote (ID: {item.menuItemId}) –{' '}
                      {new Intl.NumberFormat('fi-FI', {
                        style: 'currency',
                        currency: 'EUR',
                      }).format(item.unitPrice * item.quantity)}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <p className="modal-info-text">
            Tulee pian ilmoituksia tilauksen päivityksistä. Voit myös tarkistaa
            tilauksesi tili-sivuiltasi.
          </p>
        </div>

        <div className="modal-actions">
          <Link className="button button--primary" to="/">
            Takaisin etusivulle
          </Link>
          <button
            className="button button--secondary"
            type="button"
            onClick={onClose}
          >
            Sulje
          </button>
        </div>
      </div>
    </div>
  );
}

export default OrderSuccessModal;
