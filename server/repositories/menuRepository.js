import {pool} from '../db/pool.js';

/**
 * @typedef {Object} MenuItem
 * @property {string} itemId
 * @property {string} name
 * @property {string|null} nameEn
 * @property {string|null} description
 * @property {string|null} descriptionEn
 * @property {number} priceCents
 * @property {string} currency
 * @property {string[]} diet
 * @property {'lunch'|'a_la_carte'} mealType
 * @property {string|null} image
 * @property {boolean} featured
 */

const MENU_ITEM_SELECT_COLUMNS = `
  menu_item_id,
  name,
  name_en,
  description,
  description_en,
  price,
  category,
  dietary_info,
  is_lunch_item,
  available_weekday,
  image,
  featured
`;

/**
 * Internal: choose a default image for a menu item when none provided.
 * @param {object} item
 * @returns {string|null}
 */
function getDefaultMenuImage(item) {
  const customImage = String(item?.image || '').trim();

  if (customImage) {
    return customImage;
  }

  return item?.image || null;
}

/**
 * Convert various dietary info representations into a CSV string.
 * @param {string|string[]|undefined} value
 * @returns {string}
 */
function formatDietaryInfo(value) {
  if (Array.isArray(value)) {
    return value.filter(Boolean).join(',');
  }

  if (typeof value === 'string') {
    return value.trim();
  }

  return '';
}

/**
 * Map a database row into the public `MenuItem` shape.
 * @param {object} row
 * @returns {MenuItem}
 */
function mapRowToItem(row) {
  const priceValue = Number(row.price ?? row.price_cents ?? 0);
  const priceCents = Number.isFinite(priceValue)
    ? Math.round(priceValue < 100 ? priceValue * 100 : priceValue)
    : 0;

return {
  itemId: String(row.menu_item_id ?? row.item_id),
  name: row.name,
  nameEn: row.name_en || null,
  description: row.description,
  descriptionEn: row.description_en || null,
  priceCents,
  currency: row.currency || 'EUR',
  diet: String(row.dietary_info || '')
    .split(',')
    .map(entry => entry.trim())
    .filter(Boolean),
  mealType: Number(row.is_lunch_item) === 1 ? 'lunch' : 'a_la_carte',
  image: row.image || null,
  featured: Number(row.featured) === 1,
};
}

/**
 * Fetch all menu items from the database.
 * @async
 * @returns {Promise<MenuItem[]>}
 */
export async function getAllMenuItems() {
  const [rows] = await pool.query(
    `SELECT ${MENU_ITEM_SELECT_COLUMNS}
     FROM menu_items
     ORDER BY menu_item_id ASC`
  );

  return rows.map(mapRowToItem);
}

/**
 * Fetch featured menu items where `featured = 1`.
 * @async
 * @returns {Promise<MenuItem[]>}
 */
export async function getFeaturedMenuItems() {
  const [rows] = await pool.query(
    `SELECT ${MENU_ITEM_SELECT_COLUMNS}
     FROM menu_items
     WHERE featured = 1
     ORDER BY menu_item_id ASC`
  );

  return rows.map(mapRowToItem);
}

/**
 * Fetch a single menu item by id.
 * @async
 * @param {string|number} itemId
 * @returns {Promise<MenuItem|null>}
 */
export async function getMenuItemById(itemId) {
  const [rows] = await pool.query(
    `SELECT ${MENU_ITEM_SELECT_COLUMNS}
     FROM menu_items
     WHERE menu_item_id = ?
     LIMIT 1`,
    [itemId]
  );

  if (rows.length === 0) {
    return null;
  }

  return mapRowToItem(rows[0]);
}

/**
 * Insert or update a menu item. If `item.itemId` is provided and exists,
 * the row is updated; otherwise a new row is inserted.
 * @async
 * @param {Partial<MenuItem> & {itemId?: string|number}} item
 * @returns {Promise<void>}
 */
export async function upsertMenuItem(item) {
  const priceValue = Number(item.priceCents || 0) / 100;
  const dietaryInfo = formatDietaryInfo(item.diet);
  const isLunchItem = item.mealType === 'lunch' ? 1 : 0;
  const imageValue = getDefaultMenuImage(item);
  const featured = item.featured ? 1 : 0;

  if (item.itemId != null && String(item.itemId).trim() !== '') {
    const [existingRows] = await pool.query(
      `SELECT menu_item_id FROM menu_items WHERE menu_item_id = ? LIMIT 1`,
      [item.itemId]
    );

    if (existingRows.length > 0) {
      await pool.query(
        `UPDATE menu_items
         SET name = ?,
             name_en = ?,
             description = ?,
             description_en = ?,
             price = ?,
             category = ?,
             dietary_info = ?,
             is_lunch_item = ?,
             available_weekday = ?,
             image = ?,
             featured = ?
         WHERE menu_item_id = ?`,
        [
          item.name,
          item.nameEn ?? item.name_en ?? null,
          item.description ?? null,
          item.descriptionEn ?? item.description_en ?? null,
          priceValue,
          item.category || 'pizza',
          dietaryInfo || null,
          isLunchItem,
          item.availableWeekday ?? null,
          imageValue,
          featured,
          item.itemId,
        ]
      );

      return;
    }
  }

  await pool.query(
    `INSERT INTO menu_items (
      name,
      name_en,
      description,
      description_en,
      price,
      category,
      dietary_info,
      is_lunch_item,
      available_weekday,
      image,
      featured
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      item.name,
      item.nameEn ?? item.name_en ?? null,
      item.description ?? null,
      item.descriptionEn ?? item.description_en ?? null,
      priceValue,
      item.category || 'pizza',
      dietaryInfo || null,
      isLunchItem,
      item.availableWeekday ?? null,
      imageValue,
      featured,
    ]
  );
}

/**
 * Delete a menu item by id.
 * @async
 * @param {string|number} itemId
 * @returns {Promise<boolean>} true when a row was deleted
 */
export async function deleteMenuItem(itemId) {
  const [result] = await pool.query(
    `DELETE FROM menu_items WHERE menu_item_id = ?`,
    [itemId]
  );

  return result.affectedRows > 0;
}