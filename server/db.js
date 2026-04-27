import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'pizzeria_app',
  waitForConnections: true,
  connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 10),
  queueLimit: 0,
});

function parseDiet(value) {
  try {
    const parsed = JSON.parse(value ?? '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function mapRowToItem(row) {
  return {
    itemId: row.item_id,
    name: row.name,
    description: row.description,
    priceCents: row.price_cents,
    currency: row.currency,
    diet: parseDiet(row.diet_json),
    mealType: row.meal_type,
    image: row.image,
  };
}

export async function initDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS menu_items (
      item_id VARCHAR(100) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT NULL,
      price_cents INT NOT NULL,
      currency VARCHAR(10) NOT NULL,
      diet_json LONGTEXT NOT NULL,
      meal_type ENUM('lunch', 'a_la_carte') NOT NULL,
      image VARCHAR(500) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
}

export async function pingDatabase() {
  await pool.query('SELECT 1');
}

export async function getAllMenuItems() {
  const [rows] = await pool.query(
    `SELECT item_id, name, description, price_cents, currency, diet_json, meal_type, image
     FROM menu_items
     ORDER BY item_id ASC`
  );
  return rows.map(mapRowToItem);
}

export async function getMenuItemById(itemId) {
  const [rows] = await pool.query(
    `SELECT item_id, name, description, price_cents, currency, diet_json, meal_type, image
     FROM menu_items
     WHERE item_id = ?
     LIMIT 1`,
    [itemId]
  );

  if (rows.length === 0) {
    return null;
  }

  return mapRowToItem(rows[0]);
}

export async function upsertMenuItem(item) {
  await pool.query(
    `INSERT INTO menu_items (
      item_id,
      name,
      description,
      price_cents,
      currency,
      diet_json,
      meal_type,
      image
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      name = VALUES(name),
      description = VALUES(description),
      price_cents = VALUES(price_cents),
      currency = VALUES(currency),
      diet_json = VALUES(diet_json),
      meal_type = VALUES(meal_type),
      image = VALUES(image)`,
    [
      item.itemId,
      item.name,
      item.description ?? null,
      item.priceCents,
      item.currency,
      JSON.stringify(item.diet || []),
      item.mealType,
      item.image ?? null,
    ]
  );
}

export async function deleteMenuItem(itemId) {
  const [result] = await pool.query('DELETE FROM menu_items WHERE item_id = ?', [
    itemId,
  ]);
  return result.affectedRows > 0;
}
