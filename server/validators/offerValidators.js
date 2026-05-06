export function validateLunchOfferPayload(payload) {
  const errors = [];

  if (!payload || typeof payload !== 'object') {
    return ['Body must be an object'];
  }

  if (!payload.label || typeof payload.label !== 'string' || !payload.label.trim()) {
    errors.push('label is required and must be string');
  }

  if (!payload.title || typeof payload.title !== 'string' || !payload.title.trim()) {
    errors.push('title is required and must be string');
  }

  const discountPercent = Number(payload.discountPercent);

  if (!Number.isFinite(discountPercent) || discountPercent < 0 || discountPercent > 100) {
    errors.push('discountPercent must be a number between 0 and 100');
  }

  if (
    !payload.startTime ||
    typeof payload.startTime !== 'string' ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(payload.startTime.trim())
  ) {
    errors.push('startTime must be in HH:MM format');
  }

  if (
    !payload.endTime ||
    typeof payload.endTime !== 'string' ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(payload.endTime.trim())
  ) {
    errors.push('endTime must be in HH:MM format');
  }

  if (!payload.activeText || typeof payload.activeText !== 'string' || !payload.activeText.trim()) {
    errors.push('activeText is required and must be string');
  }

  if (!payload.inactiveText || typeof payload.inactiveText !== 'string' || !payload.inactiveText.trim()) {
    errors.push('inactiveText is required and must be string');
  }

  return errors;
}