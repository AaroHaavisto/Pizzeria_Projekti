import {pool} from './pool.js';
import {DEFAULT_OPENING_HOURS} from '../constants/openingHours.js';
import {DEFAULT_LUNCH_OFFER} from '../constants/lunchOffer.js';
import {
  buildInsertQuery,
  findColumn,
  getTableColumns,
  hasColumn,
} from './schemaUtils.js';

export async function initDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS menu_items (
      menu_item_id INT PRIMARY KEY AUTO_INCREMENT,
      name VARCHAR(255) NOT NULL,
      description TEXT NULL,
      price DECIMAL(10,2) NOT NULL,
      category VARCHAR(100) NOT NULL DEFAULT 'pizza',
      dietary_info VARCHAR(255) NULL,
      is_lunch_item TINYINT(1) NOT NULL DEFAULT 0,
      available_weekday VARCHAR(50) NULL,
      image VARCHAR(500) NULL,
      featured TINYINT(1) NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS ratings (
      rating_id INT PRIMARY KEY AUTO_INCREMENT,
      score VARCHAR(10) NOT NULL,
      description VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  const [ratingRows] = await pool.query('SELECT COUNT(*) as count FROM ratings');

  if (ratingRows[0].count === 0) {
    await pool.query(
      `INSERT INTO ratings (score, description) VALUES (?, ?)`,
      ['4.8/5', 'Asiakastyytyväisyys']
    );
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS locations (
      location_id INT PRIMARY KEY AUTO_INCREMENT,
      name VARCHAR(255) NOT NULL,
      address VARCHAR(255) NOT NULL,
      is_default TINYINT(1) NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  const [locationRows] = await pool.query('SELECT COUNT(*) as count FROM locations');

  if (locationRows[0].count === 0) {
    const locationColumns = await getTableColumns(pool, 'locations');

    const payload = {
      name: 'Pizzeria Pro',
      address: 'Urho Kekkosen katu 1, 00100 Helsinki',
      is_default: 1,
    };

    const cityColumn = findColumn(locationColumns, 'city');

    if (cityColumn && !cityColumn.hasDefault) {
      payload.city = 'Helsinki';
    }

    const insert = buildInsertQuery('locations', payload);
    await pool.query(insert.sql, insert.values);
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS opening_hours (
      opening_hours_id INT PRIMARY KEY AUTO_INCREMENT,
      label VARCHAR(100) NOT NULL,
      title VARCHAR(150) NOT NULL,
      weekdays_label VARCHAR(50) NOT NULL,
      weekdays_hours VARCHAR(50) NOT NULL,
      weekends_label VARCHAR(50) NOT NULL,
      weekends_hours VARCHAR(50) NOT NULL,
      lunch_note VARCHAR(255) NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  const openingHoursColumns = await getTableColumns(pool, 'opening_hours');

  if (!hasColumn(openingHoursColumns, 'label')) {
    await pool.query(`ALTER TABLE opening_hours ADD COLUMN label VARCHAR(100) NOT NULL DEFAULT 'Aukioloajat'`);
  }

  if (!hasColumn(openingHoursColumns, 'title')) {
    await pool.query(`ALTER TABLE opening_hours ADD COLUMN title VARCHAR(150) NOT NULL DEFAULT 'Pizzeria on auki'`);
  }

  if (!hasColumn(openingHoursColumns, 'weekdays_label')) {
    await pool.query(`ALTER TABLE opening_hours ADD COLUMN weekdays_label VARCHAR(50) NOT NULL DEFAULT 'Ma - pe'`);
  }

  if (!hasColumn(openingHoursColumns, 'weekdays_hours')) {
    await pool.query(`ALTER TABLE opening_hours ADD COLUMN weekdays_hours VARCHAR(50) NOT NULL DEFAULT '6.00 - 18.00'`);
  }

  if (!hasColumn(openingHoursColumns, 'weekends_label')) {
    await pool.query(`ALTER TABLE opening_hours ADD COLUMN weekends_label VARCHAR(50) NOT NULL DEFAULT 'La - su'`);
  }

  if (!hasColumn(openingHoursColumns, 'weekends_hours')) {
    await pool.query(`ALTER TABLE opening_hours ADD COLUMN weekends_hours VARCHAR(50) NOT NULL DEFAULT '8.00 - 15.00'`);
  }

  if (!hasColumn(openingHoursColumns, 'lunch_note')) {
    await pool.query(`ALTER TABLE opening_hours ADD COLUMN lunch_note VARCHAR(255) NOT NULL DEFAULT 'Ennen klo 13 saat lounaspizzat edullisemmin.'`);
  }

  if (!hasColumn(openingHoursColumns, 'updated_at')) {
    await pool.query(`ALTER TABLE opening_hours ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`);
  }

const [openingHoursRows] = await pool.query(
  `SELECT * FROM opening_hours LIMIT 1`
);

if (openingHoursRows.length === 0) {
  await pool.query(
    `INSERT INTO opening_hours (
      label,
      title,
      weekdays_label,
      weekdays_hours,
      weekends_label,
      weekends_hours,
      lunch_note
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      DEFAULT_OPENING_HOURS.label,
      DEFAULT_OPENING_HOURS.title,
      DEFAULT_OPENING_HOURS.weekdaysLabel,
      DEFAULT_OPENING_HOURS.weekdaysHours,
      DEFAULT_OPENING_HOURS.weekendsLabel,
      DEFAULT_OPENING_HOURS.weekendsHours,
      DEFAULT_OPENING_HOURS.lunchNote,
    ]
  );
}

  await pool.query(`
    CREATE TABLE IF NOT EXISTS lunch_offers (
      lunch_offer_id INT PRIMARY KEY AUTO_INCREMENT,
      label VARCHAR(100) NOT NULL,
      title VARCHAR(150) NOT NULL,
      discount_percent DECIMAL(5,2) NOT NULL,
      start_time TIME NOT NULL,
      end_time TIME NOT NULL,
      active_text VARCHAR(255) NOT NULL,
      inactive_text VARCHAR(255) NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  const lunchOfferColumns = await getTableColumns(pool, 'lunch_offers');

  if (!hasColumn(lunchOfferColumns, 'label')) {
    await pool.query(`ALTER TABLE lunch_offers ADD COLUMN label VARCHAR(100) NOT NULL DEFAULT 'Lounastarjous'`);
  }

  if (!hasColumn(lunchOfferColumns, 'title')) {
    await pool.query(`ALTER TABLE lunch_offers ADD COLUMN title VARCHAR(150) NOT NULL DEFAULT 'Edullisempi ennen klo 13'`);
  }

  if (!hasColumn(lunchOfferColumns, 'discount_percent')) {
    await pool.query(`ALTER TABLE lunch_offers ADD COLUMN discount_percent DECIMAL(5,2) NOT NULL DEFAULT 10.00`);
  }

  if (!hasColumn(lunchOfferColumns, 'start_time')) {
    await pool.query(`ALTER TABLE lunch_offers ADD COLUMN start_time TIME NOT NULL DEFAULT '11:00:00'`);
  }

  if (!hasColumn(lunchOfferColumns, 'end_time')) {
    await pool.query(`ALTER TABLE lunch_offers ADD COLUMN end_time TIME NOT NULL DEFAULT '13:00:00'`);
  }

  if (!hasColumn(lunchOfferColumns, 'active_text')) {
    await pool.query(`ALTER TABLE lunch_offers ADD COLUMN active_text VARCHAR(255) NOT NULL DEFAULT 'Ennen klo 13 tilatut pizzat ovat edullisempia.'`);
  }

  if (!hasColumn(lunchOfferColumns, 'inactive_text')) {
    await pool.query(`ALTER TABLE lunch_offers ADD COLUMN inactive_text VARCHAR(255) NOT NULL DEFAULT 'Alennus on voimassa klo 11.00-13.00.'`);
  }

  if (!hasColumn(lunchOfferColumns, 'updated_at')) {
    await pool.query(`ALTER TABLE lunch_offers ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`);
  }

  const [lunchOfferRows] = await pool.query(
    `SELECT lunch_offer_id FROM lunch_offers LIMIT 1`
  );

  if (lunchOfferRows.length === 0) {
    await pool.query(
      `INSERT INTO lunch_offers (
        label,
        title,
        discount_percent,
        start_time,
        end_time,
        active_text,
        inactive_text
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        DEFAULT_LUNCH_OFFER.label,
        DEFAULT_LUNCH_OFFER.title,
        DEFAULT_LUNCH_OFFER.discountPercent,
        '11:00:00',
        '13:00:00',
        DEFAULT_LUNCH_OFFER.activeText,
        DEFAULT_LUNCH_OFFER.inactiveText,
      ]
    );
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS orders (
      order_id INT PRIMARY KEY AUTO_INCREMENT,
      customer_user_id INT NULL DEFAULT NULL,
      location_id INT NULL DEFAULT NULL,
      order_type VARCHAR(50) NULL DEFAULT NULL,
      status VARCHAR(50) DEFAULT 'pending',
      pickup_time VARCHAR(50) NULL DEFAULT NULL,
      subtotal_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
      discount_percent DECIMAL(5,2) NOT NULL DEFAULT 0,
      discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
      total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  const ordersTableColumns = await getTableColumns(pool, 'orders');

  if (
    ordersTableColumns.length > 0 &&
    !hasColumn(ordersTableColumns, 'location_id')
  ) {
    await pool.query(`
      ALTER TABLE orders
      ADD COLUMN location_id INT NULL DEFAULT NULL AFTER customer_user_id
    `);
  }

  if (!hasColumn(ordersTableColumns, 'subtotal_amount')) {
    await pool.query(`ALTER TABLE orders ADD COLUMN subtotal_amount DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER pickup_time`);
  }

  if (!hasColumn(ordersTableColumns, 'discount_percent')) {
    await pool.query(`ALTER TABLE orders ADD COLUMN discount_percent DECIMAL(5,2) NOT NULL DEFAULT 0 AFTER subtotal_amount`);
  }

  if (!hasColumn(ordersTableColumns, 'discount_amount')) {
    await pool.query(`ALTER TABLE orders ADD COLUMN discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER discount_percent`);
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS order_items (
      order_item_id INT PRIMARY KEY AUTO_INCREMENT,
      order_id INT NOT NULL,
      menu_item_id INT NOT NULL,
      quantity INT NOT NULL DEFAULT 1,
      original_unit_price DECIMAL(10,2) NOT NULL,
      discount_percent DECIMAL(5,2) NOT NULL DEFAULT 0,
      discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
      discounted_unit_price DECIMAL(10,2) NOT NULL,
      line_total DECIMAL(10,2) NOT NULL,
      unit_price DECIMAL(10,2) NOT NULL,
      notes VARCHAR(255) NULL,
      FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE,
      FOREIGN KEY (menu_item_id) REFERENCES menu_items(menu_item_id) ON DELETE RESTRICT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  const orderItemsColumns = await getTableColumns(pool, 'order_items');

  if (!hasColumn(orderItemsColumns, 'original_unit_price')) {
    await pool.query(`ALTER TABLE order_items ADD COLUMN original_unit_price DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER quantity`);
  }

  if (!hasColumn(orderItemsColumns, 'discount_percent')) {
    await pool.query(`ALTER TABLE order_items ADD COLUMN discount_percent DECIMAL(5,2) NOT NULL DEFAULT 0 AFTER original_unit_price`);
  }

  if (!hasColumn(orderItemsColumns, 'discount_amount')) {
    await pool.query(`ALTER TABLE order_items ADD COLUMN discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER discount_percent`);
  }

  if (!hasColumn(orderItemsColumns, 'discounted_unit_price')) {
    await pool.query(`ALTER TABLE order_items ADD COLUMN discounted_unit_price DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER discount_amount`);
  }

  if (!hasColumn(orderItemsColumns, 'line_total')) {
    await pool.query(`ALTER TABLE order_items ADD COLUMN line_total DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER discounted_unit_price`);
  }



  await pool.query(
    `UPDATE menu_items SET featured = 1 WHERE menu_item_id IN (1, 2, 3, 4)`
  );
}