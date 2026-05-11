import {useEffect, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {useOffer} from '../contexts/OfferContext';
import {useLanguage} from '../contexts/LanguageContext';
import {isLunchOfferActive, getLunchWindow} from '../utils/offer';
import '../css/main_style.css';

const BANNER_STORAGE_KEY = 'pizzeria-offer-banner-dismissed';

function getOfferSignature(offer) {
  return [
    offer?.label || '',
    offer?.title || '',
    offer?.discountPercent || 0,
    offer?.startTime || '',
    offer?.endTime || '',
  ].join('|');
}

function getDismissalExpiry() {
  const expiry = new Date();
  expiry.setHours(23, 59, 59, 999);
  return expiry.getTime();
}

function readDismissalState(offer) {
  if (typeof window === 'undefined') {
    return false;
  }

  const signature = getOfferSignature(offer);
  const rawValue = window.localStorage.getItem(BANNER_STORAGE_KEY);

  if (!rawValue) {
    return false;
  }

  try {
    const parsed = JSON.parse(rawValue);

    if (parsed.signature !== signature || Number(parsed.expiresAt) <= Date.now()) {
      window.localStorage.removeItem(BANNER_STORAGE_KEY);
      return false;
    }

    return true;
  } catch {
    window.localStorage.removeItem(BANNER_STORAGE_KEY);
    return false;
  }
}

function OfferBanner() {
  const {offer} = useOffer();
  const {language} = useLanguage();
  const navigate = useNavigate();
  const offerSignature = getOfferSignature(offer);
  const [dismissed, setDismissed] = useState(() => readDismissalState(offer));
  const isEnglish = language === 'en';
  const now = new Date();
  const active = isLunchOfferActive(now, offer);
  const {startTime, endTime} = getLunchWindow(offer);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (dismissed) {
        window.localStorage.setItem(
          BANNER_STORAGE_KEY,
          JSON.stringify({
            signature: offerSignature,
            expiresAt: getDismissalExpiry(),
          })
        );
      } else {
        window.localStorage.removeItem(BANNER_STORAGE_KEY);
      }
    }
  }, [dismissed, offerSignature]);

  function timeLabel() {
    if (active) {
      const end = new Date(now);
      const [endHour, endMinute] = endTime.split(':').map(Number);
      end.setHours(endHour, endMinute, 0, 0);
      const mins = Math.max(0, Math.round((end - now) / 60000));
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      if (isEnglish) {
        if (h > 0) return `Ends in ${h} h ${m} min`;
        return `Ends in ${m} min`;
      }
      if (h > 0) return `Loppuu ${h} h ${m} min päästä`;
      return `Loppuu ${m} min päästä`;
    }

    return isEnglish ? `Starts at ${startTime}` : `Alkaa klo ${startTime}`;
  }

  function titleLabel() {
    if (!isEnglish) {
      return offer.title;
    }

    const [endHourText] = String(endTime).split(':');
    const endHour = Number(endHourText);
    const normalizedHour = ((endHour % 12) || 12);
    const period = endHour >= 12 ? 'pm' : 'am';

    return `Cheaper before ${normalizedHour} ${period}`;
  }

  if (dismissed) {
    return null;
  }

  function handleNavigate() {
    navigate('/menu?focus=all#menu-pizzat');
  }

  function handleDismiss(event) {
    event.stopPropagation();
    setDismissed(true);
  }

  return (
    <div
      className={`offer-banner ${active ? 'offer-banner--active' : ''}`}
      role="button"
      tabIndex={0}
      onClick={handleNavigate}
      onKeyDown={event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          handleNavigate();
        }
      }}
    >
      <span className="offer-banner__glow" aria-hidden="true" />
      <div className="offer-banner__label">{isEnglish ? 'Lunch offer' : offer.label}</div>
      <div className="offer-banner__body">
        <strong className="offer-banner__percent">-{Number(offer.discountPercent) || 0}%</strong>
        <div className="offer-banner__text">
          <div>{titleLabel()}</div>
          <div>{active ? (isEnglish ? 'Now available' : offer.activeText) : (isEnglish ? 'Coming soon' : offer.inactiveText)}</div>
          <div className="offer-banner__time">{timeLabel()}</div>
        </div>
      </div>
      <button className="offer-banner__close" type="button" onClick={handleDismiss} aria-label={isEnglish ? 'Dismiss offer banner' : 'Sulje tarjousbanneri'}>
        ×
      </button>
    </div>
  );
}

export default OfferBanner;
