function formatPrice(priceCents, currency = 'EUR') {
  return new Intl.NumberFormat('fi-FI', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(priceCents / 100);
}

function toCardItem(menuItem) {
  const diets =
    Array.isArray(menuItem.diet) && menuItem.diet.length > 0
      ? menuItem.diet.join(', ')
      : menuItem.mealType === 'lunch'
        ? 'Lounas'
        : 'A la carte';

  return {
    id: menuItem.itemId,
    name: menuItem.name,
    description: menuItem.description || '',
    tag: diets,
    price: formatPrice(menuItem.priceCents, menuItem.currency),
    image: menuItem.image || '/src/assets/images/pizza-margherita.jpg',
  };
}

export async function getWeeklyMenuCards() {
  const response = await fetch('/api/menu');
  if (!response.ok) {
    throw new Error(`Menu fetch failed: ${response.status}`);
  }

  const payload = await response.json();
  const days = Array.isArray(payload.days) ? payload.days : [];

  const items = days.flatMap(day =>
    Array.isArray(day.items) ? day.items : []
  );
  return items.map(toCardItem);
}
