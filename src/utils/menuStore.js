import defaultMenuData from '../data/menu.json';

const MENU_STORAGE_KEY = 'pizzeria_pro_menu_data';

function cloneMenuData(menuData) {
  return JSON.parse(JSON.stringify(menuData));
}

function isValidMenuData(menuData) {
  const hasItemsShape =
    menuData &&
    Array.isArray(menuData.items) &&
    menuData.items.every(
      item =>
        item &&
        typeof item === 'object' &&
        typeof item.itemId === 'string' &&
        typeof item.name === 'string'
    );

  if (hasItemsShape) {
    return true;
  }

  return Boolean(
    menuData &&
    Array.isArray(menuData.days) &&
    menuData.days.every(
      day =>
        day &&
        typeof day === 'object' &&
        typeof day.dayId === 'string' &&
        typeof day.date === 'string' &&
        Array.isArray(day.items)
    )
  );
}

export function getDefaultMenuData() {
  return cloneMenuData(defaultMenuData);
}

export function getStoredMenuData() {
  if (typeof window === 'undefined') {
    return getDefaultMenuData();
  }

  const rawValue = window.localStorage.getItem(MENU_STORAGE_KEY);

  if (!rawValue) {
    return getDefaultMenuData();
  }

  try {
    const parsed = JSON.parse(rawValue);
    return isValidMenuData(parsed) ? parsed : getDefaultMenuData();
  } catch {
    return getDefaultMenuData();
  }
}

export function saveMenuData(menuData) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(MENU_STORAGE_KEY, JSON.stringify(menuData));
}

export function resetMenuData() {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(MENU_STORAGE_KEY);
}

export function isValidMenuJson(menuData) {
  return isValidMenuData(menuData);
}
