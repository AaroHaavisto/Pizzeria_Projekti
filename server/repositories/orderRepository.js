import {pool} from '../db/pool.js';

export async function createOrder({
  customerUserId,
  locationId = null,
  subtotalAmount = 0,
  discountPercent = 0,
  discountAmount = 0,
  totalAmount,
}) {
  let resolvedLocationId =
    Number.isInteger(locationId) && locationId > 0 ? locationId : null;

  if (resolvedLocationId != null) {
    const [rows] = await pool.query(
      `SELECT location_id FROM locations WHERE location_id = ? LIMIT 1`,
      [resolvedLocationId]
    );

    if (rows.length === 0) {
      resolvedLocationId = null;
    }
  }

  if (resolvedLocationId == null) {
    const [rows] = await pool.query(
      `SELECT location_id
       FROM locations
       ORDER BY location_id ASC
       LIMIT 1`
    );

    resolvedLocationId = rows[0]?.location_id ?? null;
  }

  if (resolvedLocationId == null) {
    throw new Error('Sijaintia ei löytynyt');
  }

  const [result] = await pool.query(
    `INSERT INTO orders (
      customer_user_id,
      location_id,
      subtotal_amount,
      discount_percent,
      discount_amount,
      total_amount,
      status
    ) VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
    [
      customerUserId || null,
      resolvedLocationId,
      subtotalAmount,
      discountPercent,
      discountAmount,
      totalAmount,
    ]
  );

  return result.insertId;
}

export async function addOrderItem({
  orderId,
  menuItemId,
  quantity,
  originalUnitPrice,
  discountPercent = 0,
  discountAmount = 0,
  discountedUnitPrice,
  lineTotal,
  notes,
}) {
  await pool.query(
    `INSERT INTO order_items (
      order_id,
      menu_item_id,
      quantity,
      original_unit_price,
      discount_percent,
      discount_amount,
      discounted_unit_price,
      line_total,
      unit_price,
      notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      orderId,
      menuItemId,
      quantity,
      originalUnitPrice,
      discountPercent,
      discountAmount,
      discountedUnitPrice,
      lineTotal,
      discountedUnitPrice,
      notes || null,
    ]
  );
}

export async function getOrder(orderId) {
  const [orderRows] = await pool.query(
    `SELECT *
     FROM orders
     WHERE order_id = ?
     LIMIT 1`,
    [orderId]
  );

  if (orderRows.length === 0) {
    return null;
  }

  const [itemRows] = await pool.query(
    `SELECT *
     FROM order_items
     WHERE order_id = ?
     ORDER BY order_item_id ASC`,
    [orderId]
  );

  return {
    ...orderRows[0],
    items: itemRows,
  };
}