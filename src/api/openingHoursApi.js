const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

const FALLBACK_OPENING_HOURS = {
  label: 'Aukioloajat',
  title: 'Pizzeria on auki',
  weekdaysLabel: 'Ma - pe',
  weekdaysHours: '6.00 - 18.00',
  weekendsLabel: 'La - su',
  weekendsHours: '8.00 - 15.00',
  lunchNote: 'Ennen klo 13 saat lounaspizzat edullisemmin.',
};

function normalizeOpeningHours(value) {
  if (!value || typeof value !== 'object') {
    return {...FALLBACK_OPENING_HOURS};
  }

  return {
    label: String(value.label || FALLBACK_OPENING_HOURS.label),
    title: String(value.title || FALLBACK_OPENING_HOURS.title),
    weekdaysLabel: String(value.weekdaysLabel || value.weekdayLabel || FALLBACK_OPENING_HOURS.weekdaysLabel),
    weekdaysHours: String(value.weekdaysHours || value.weekdayHours || FALLBACK_OPENING_HOURS.weekdaysHours),
    weekendsLabel: String(value.weekendsLabel || value.weekendLabel || FALLBACK_OPENING_HOURS.weekendsLabel),
    weekendsHours: String(value.weekendsHours || value.weekendHours || FALLBACK_OPENING_HOURS.weekendsHours),
    lunchNote: String(value.lunchNote || FALLBACK_OPENING_HOURS.lunchNote),
  };
}

export async function fetchOpeningHours() {
  try {
    const response = await fetch(`${API_BASE}/api/opening-hours`);
    if (!response.ok) {
      throw new Error(`Failed to fetch opening hours: ${response.status}`);
    }

    const data = await response.json();
    return normalizeOpeningHours(data.openingHours);
  } catch {
    return {...FALLBACK_OPENING_HOURS};
  }
}
