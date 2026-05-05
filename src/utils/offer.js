export const DEFAULT_LUNCH_OFFER = {
  label: 'Lounastarjous',
  title: 'Edullisempi ennen klo 13',
  discountPercent: 10,
  startTime: '11:00',
  endTime: '13:00',
  activeText: 'Ennen klo 13 tilatut pizzat ovat edullisempia.',
  inactiveText: 'Alennus on voimassa klo 11.00-13.00.',
};

function parseClockValue(value, fallbackHour, fallbackMinute = 0) {
  if (typeof value === 'string') {
    const match = value.trim().match(/^([01]\d|2[0-3]):([0-5]\d)$/);
    if (match) {
      return {
        hour: Number(match[1]),
        minute: Number(match[2]),
      };
    }
  }

  return {
    hour: fallbackHour,
    minute: fallbackMinute,
  };
}

function getOfferWindowMinutes(offer = DEFAULT_LUNCH_OFFER) {
  const start = parseClockValue(offer.startTime, 11);
  const end = parseClockValue(offer.endTime, 13);

  return {
    startMinutes: start.hour * 60 + start.minute,
    endMinutes: end.hour * 60 + end.minute,
    startHour: start.hour,
    endHour: end.hour,
  };
}

export function isLunchOfferActive(now = new Date(), offer = DEFAULT_LUNCH_OFFER) {
  const {startMinutes, endMinutes} = getOfferWindowMinutes(offer);
  const minutes = now.getHours() * 60 + now.getMinutes();
  const discountPercent = Number(offer?.discountPercent) || 0;

  return discountPercent > 0 && minutes >= startMinutes && minutes < endMinutes;
}

export function getLunchWindow(offer = DEFAULT_LUNCH_OFFER) {
  const window = getOfferWindowMinutes(offer);
  return {
    startHour: window.startHour,
    endHour: window.endHour,
    startTime: offer?.startTime || DEFAULT_LUNCH_OFFER.startTime,
    endTime: offer?.endTime || DEFAULT_LUNCH_OFFER.endTime,
  };
}

export function applyLunchDiscount(priceCents, now = new Date(), offer = DEFAULT_LUNCH_OFFER) {
  if (!isLunchOfferActive(now, offer)) return priceCents;

  const discountPercent = Number(offer?.discountPercent) || 0;
  return Math.round(priceCents * (1 - discountPercent / 100));
}

export function formatEuro(priceCents) {
  return new Intl.NumberFormat('fi-FI', {style: 'currency', currency: 'EUR'}).format(priceCents / 100);
}
