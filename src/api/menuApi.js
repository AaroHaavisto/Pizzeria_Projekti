import {getStoredMenuData} from '../utils/menuStore';

const MENU_API_ENDPOINT = '/api/menu';

function formatPrice(priceCents, currency = 'EUR') {
  return new Intl.NumberFormat('fi-FI', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(priceCents / 100);
}

function isToday(date) {
  return date === new Date().toLocaleDateString('sv-SE');
}

function formatDayLabel(date, fallback) {
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return fallback;
  }

  return parsed.toLocaleDateString('fi-FI', {
    weekday: 'long',
    day: 'numeric',
    month: 'numeric',
  });
}

function toCardItem(menuItem, day) {
  const diets =
    Array.isArray(menuItem.diet) && menuItem.diet.length > 0
      ? menuItem.diet.join(', ')
      : menuItem.mealType === 'lunch'
        ? 'Lounas'
        : 'A la carte';

  return {
    id: menuItem.itemId,
    dayId: day.dayId,
    dayLabel: day.label,
    date: day.date,
    isToday: isToday(day.date),
    name: menuItem.name,
    description: menuItem.description || '',
    tag: diets,
    price: formatPrice(menuItem.priceCents, menuItem.currency),
    priceCents: menuItem.priceCents,
    currency: menuItem.currency,
    image: menuItem.image || '/src/assets/images/pizza-margherita.jpg',
  };
}

export async function getWeeklyMenuData() {
  try {
    const response = await fetch(MENU_API_ENDPOINT);
    if (!response.ok) {
      throw new Error(`Menu fetch failed: ${response.status}`);
    }

    return await response.json();
  } catch {
    return getStoredMenuData();
  }
}

export async function getWeeklyMenuSections() {
  const payload = await getWeeklyMenuData();
  const days = Array.isArray(payload.days) ? payload.days : [];

  return days.map(day => ({
    dayId: day.dayId,
    label: day.label || formatDayLabel(day.date, day.dayId),
    date: day.date,
    isToday: isToday(day.date),
    items: Array.isArray(day.items)
      ? day.items.map(item => toCardItem(item, day))
      : [],
  }));
}

export async function getWeeklyMenuCards() {
  const sections = await getWeeklyMenuSections();
  return sections.flatMap(section => section.items);
}

export async function getFeaturedMenuCards(featuredNames = []) {
  const cards = await getWeeklyMenuCards();

  if (!Array.isArray(featuredNames) || featuredNames.length === 0) {
    return cards.slice(0, 4);
  }

  const normalized = new Map(
    cards.map(card => [card.name.trim().toLowerCase(), card])
  );

  return featuredNames
    .map(name => normalized.get(String(name).trim().toLowerCase()))
    .filter(Boolean);
}
