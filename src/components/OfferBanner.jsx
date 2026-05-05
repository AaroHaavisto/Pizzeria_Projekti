import {useOffer} from '../contexts/OfferContext';
import {isLunchOfferActive, getLunchWindow} from '../utils/offer';
import '../css/main_style.css';

function OfferBanner() {
  const {offer} = useOffer();
  const now = new Date();
  const active = isLunchOfferActive(now, offer);
  const {startTime, endTime} = getLunchWindow(offer);

  function timeLabel() {
    if (active) {
      const end = new Date(now);
      const [endHour, endMinute] = endTime.split(':').map(Number);
      end.setHours(endHour, endMinute, 0, 0);
      const mins = Math.max(0, Math.round((end - now) / 60000));
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      if (h > 0) return `Loppuu ${h} h ${m} min päästä`;
      return `Loppuu ${m} min päästä`;
    }

    return `Alkaa klo ${startTime}`;
  }

  return (
    <div className={`offer-banner ${active ? 'offer-banner--active' : ''}`} role="status">
      <div className="offer-banner__label">{offer.label}</div>
      <div className="offer-banner__body">
        <strong className="offer-banner__percent">-{Number(offer.discountPercent) || 0}%</strong>
        <div className="offer-banner__text">
          <div>{offer.title}</div>
          <div>{active ? offer.activeText : offer.inactiveText}</div>
          <div className="offer-banner__time">{timeLabel()}</div>
        </div>
      </div>
    </div>
  );
}

export default OfferBanner;
