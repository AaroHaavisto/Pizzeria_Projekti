import {getStoredMenuData} from '../utils/menuStore';

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

export function getWeeklyMenuData() {
  return getStoredMenuData();
}

export function getWeeklyMenuSections() {
  const payload = getWeeklyMenuData();
  const days = Array.isArray(payload.days) ? payload.days : [];

  return days.map(day => ({
    dayId: day.dayId,
    label: day.label || day.dayId,
    date: day.date,
    isToday: isToday(day.date),
    items: Array.isArray(day.items)
      ? day.items.map(item => toCardItem(item, day))
      : [],
  }));
}

export function getWeeklyMenuCards() {
  return getWeeklyMenuSections().flatMap(section => section.items);
}
