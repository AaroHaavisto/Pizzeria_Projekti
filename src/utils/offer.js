export function isLunchOfferActive(now = new Date()) {
  // Lunch window: 11:00 - 13:00 local time
  const startHour = 11;
  const endHour = 13;
  const h = now.getHours();
  const m = now.getMinutes();
  const minutes = h * 60 + m;
  return minutes >= startHour * 60 && minutes < endHour * 60;
}

export function getLunchWindow() {
  return {startHour: 11, endHour: 13};
}

export function applyLunchDiscount(priceCents, now = new Date()) {
  if (!isLunchOfferActive(now)) return priceCents;
  return Math.round(priceCents * 0.9);
}

export function formatEuro(priceCents) {
  return new Intl.NumberFormat('fi-FI', {style: 'currency', currency: 'EUR'}).format(priceCents / 100);
}
