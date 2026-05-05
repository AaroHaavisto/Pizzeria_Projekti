import {pool} from '../db/pool.js';

function getDefaultMenuImage(item) {
  const customImage = String(item?.image || '').trim();

  if (customImage) return customImage;

  const numericId = Number(item?.itemId);

  if (Number.isInteger(numericId) && MENU_IMAGE_BY_ID[numericId]) {
    return MENU_IMAGE_BY_ID[numericId];
  }

  return item?.image || null;
}

function formatDietaryInfo(value) {
  if (Array.isArray(value)) {
    return value.filter(Boolean).join(',');
  }

  if (typeof value === 'string') {
    return value.trim();
  }

  return '';
}

function mapRowToItem(row) {
  const priceValue = Number(row.price ?? row.price_cents ?? 0);
  const priceCents = Number.isFinite(priceValue)
    ? Math.round(priceValue < 100 ? priceValue * 100 : priceValue)
    : 0;

  return {
    itemId: String(row.menu_item_id ?? row.item_id),
    name: row.name,
    description: row.description,
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

export async function getAllMenuItems() {
  const [rows] = await pool.query(
    `SELECT menu_item_id, name, description, price, category, dietary_info, is_lunch_item, available_weekday, image, featured
     FROM menu_items
     ORDER BY menu_item_id ASC`
  );

  return rows.map(mapRowToItem);
}

export async function getFeaturedMenuItems() {
  const [rows] = await pool.query(
    `SELECT menu_item_id, name, description, price, category, dietary_info, is_lunch_item, available_weekday, image, featured
     FROM menu_items
     WHERE featured = 1
     ORDER BY menu_item_id ASC`
  );

  return rows.map(mapRowToItem);
}

export async function getMenuItemById(itemId) {
  const [rows] = await pool.query(
    `SELECT menu_item_id, name, description, price, category, dietary_info, is_lunch_item, available_weekday, image, featured
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
             description = ?,
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
          item.description ?? null,
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
      description,
      price,
      category,
      dietary_info,
      is_lunch_item,
      available_weekday,
      image,
      featured
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      item.name,
      item.description ?? null,
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

export async function deleteMenuItem(itemId) {
  const [result] = await pool.query(
    `DELETE FROM menu_items WHERE menu_item_id = ?`,
    [itemId]
  );

  return result.affectedRows > 0;
}