import {getAdminRequestHeaders} from '../utils/adminAuth';

const MENU_API_ENDPOINT = '/api/menu';

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
    priceCents: menuItem.priceCents,
    currency: menuItem.currency,
    image: menuItem.image || '/src/assets/images/pizza-margherita.jpg',
  };
}

function extractMenuItems(menuData) {
  if (Array.isArray(menuData?.items)) {
    return menuData.items;
  }

  if (Array.isArray(menuData?.days)) {
    return menuData.days.flatMap(day =>
      Array.isArray(day.items) ? day.items : []
    );
  }

  return [];
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

export async function getWeeklyMenuData() {
  return requestJson(MENU_API_ENDPOINT);
}

export async function saveMenuItem(menuItem) {
  const method = menuItem?.itemId ? 'PUT' : 'POST';
  const url = menuItem?.itemId
    ? `${MENU_API_ENDPOINT}/${encodeURIComponent(menuItem.itemId)}`
    : MENU_API_ENDPOINT;

  return requestJson(url, {
    method,
    body: JSON.stringify(menuItem),
  });
}

export async function deleteMenuItem(menuItemId) {
  return requestJson(`${MENU_API_ENDPOINT}/${encodeURIComponent(menuItemId)}`, {
    method: 'DELETE',
  });
}

export async function syncMenuData(menuData) {
  const nextItems = extractMenuItems(menuData);
  const currentPayload = await getWeeklyMenuData();
  const currentItems = extractMenuItems(currentPayload);

  const currentById = new Map(
    currentItems.map(item => [String(item.itemId), item])
  );
  const nextById = new Set(nextItems.map(item => String(item.itemId)));

  for (const item of nextItems) {
    const itemId = String(item.itemId || '').trim();

    if (itemId && currentById.has(itemId)) {
      await requestJson(`${MENU_API_ENDPOINT}/${encodeURIComponent(itemId)}`, {
        method: 'PUT',
        body: JSON.stringify(item),
      });
      continue;
    }

    await requestJson(MENU_API_ENDPOINT, {
      method: 'POST',
      body: JSON.stringify(item),
    });
  }

  for (const item of currentItems) {
    const itemId = String(item.itemId);
    if (!nextById.has(itemId)) {
      await deleteMenuItem(itemId);
    }
  }

  return getWeeklyMenuData();
}

export async function getWeeklyMenuSections() {
  const payload = await getWeeklyMenuData();
  const items = Array.isArray(payload.items)
    ? payload.items
    : Array.isArray(payload.days)
      ? payload.days.flatMap(day => (Array.isArray(day.items) ? day.items : []))
      : [];

  return [
    {
      dayId: 'all-items',
      label: 'Kaikki pizzat',
      items: items.map(item => toCardItem(item)),
    },
  ];
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
