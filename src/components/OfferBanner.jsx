import {isLunchOfferActive, getLunchWindow, formatEuro} from '../utils/offer';
import '../css/main_style.css';

function OfferBanner() {
  const now = new Date();
  const active = isLunchOfferActive(now);
  const {startHour, endHour} = getLunchWindow();

  function timeLabel() {
    if (active) {
      // compute minutes left until endHour
      const end = new Date(now);
      end.setHours(endHour, 0, 0, 0);
      const mins = Math.max(0, Math.round((end - now) / 60000));
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      if (h > 0) return `Loppuu ${h} h ${m} min päästä`;
      return `Loppuu ${m} min päästä`;
    }

    return `Alkaa klo ${String(startHour).padStart(2, '0')}:00`;
  }

  return (
    <div className={`offer-banner ${active ? 'offer-banner--active' : ''}`} role="status">
      <div className="offer-banner__label">Lounastarjous</div>
      <div className="offer-banner__body">
        <strong className="offer-banner__percent">-10%</strong>
        <div className="offer-banner__text">
          <div>Kaikki pizzat {active ? '10 % alennuksella' : '10 % alennus klo 11–13'}</div>
          <div className="offer-banner__time">{timeLabel()}</div>
        </div>
      </div>
    </div>
  );
}

export default OfferBanner;
