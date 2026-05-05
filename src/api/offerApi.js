import {getAdminRequestHeaders} from '../utils/adminAuth';
import {DEFAULT_LUNCH_OFFER} from '../utils/offer';

const API_BASE = import.meta.env.VITE_API_BASE || '';

function normalizeLunchOffer(value) {
  if (!value || typeof value !== 'object') {
    return {...DEFAULT_LUNCH_OFFER};
  }

  return {
    label: String(value.label || DEFAULT_LUNCH_OFFER.label),
    title: String(value.title || DEFAULT_LUNCH_OFFER.title),
    discountPercent: Number(
      value.discountPercent ?? value.discount_percent ?? DEFAULT_LUNCH_OFFER.discountPercent
    ),
    startTime: String(
      value.startTime || value.start_time || DEFAULT_LUNCH_OFFER.startTime
    ).slice(0, 5),
    endTime: String(value.endTime || value.end_time || DEFAULT_LUNCH_OFFER.endTime).slice(0, 5),
    activeText: String(value.activeText || value.active_text || DEFAULT_LUNCH_OFFER.activeText),
    inactiveText: String(
      value.inactiveText || value.inactive_text || DEFAULT_LUNCH_OFFER.inactiveText
    ),
  };
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...getAdminRequestHeaders(),
      ...(options.headers || {}),
    },
    ...options,
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message = payload?.error?.message || 'Request failed';
    throw new Error(message);
  }

  return payload;
}

export async function fetchLunchOffer() {
  try {
    const response = await fetch(`${API_BASE}/api/lunch-offer`);

    if (!response.ok) {
      throw new Error(`Failed to fetch lunch offer: ${response.status}`);
    }

    const data = await response.json();
    return normalizeLunchOffer(data.lunchOffer);
  } catch {
    return {...DEFAULT_LUNCH_OFFER};
  }
}

export async function updateLunchOffer(offer) {
  const payload = await requestJson(`${API_BASE}/api/lunch-offer`, {
    method: 'PUT',
    body: JSON.stringify(offer),
  });

  return normalizeLunchOffer(payload.lunchOffer);
}

export {normalizeLunchOffer};