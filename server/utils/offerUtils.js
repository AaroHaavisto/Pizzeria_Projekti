function parseClockMinutes(timeValue) {
  if (typeof timeValue !== 'string') {
    return null;
  }

  const match = timeValue.trim().match(/^([01]\d|2[0-3]):([0-5]\d)$/);

  if (!match) {
    return null;
  }

  return Number(match[1]) * 60 + Number(match[2]);
}

export function calculateOfferDiscountPercent(offer, now = new Date()) {
  const startMinutes = parseClockMinutes(offer?.startTime);
  const endMinutes = parseClockMinutes(offer?.endTime);
  const discountPercent = Number(offer?.discountPercent) || 0;

  if (startMinutes == null || endMinutes == null || discountPercent <= 0) {
    return 0;
  }

  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  return currentMinutes >= startMinutes && currentMinutes < endMinutes
    ? discountPercent
    : 0;
}