import mysql from 'mysql2/promise';
import {promisify} from 'node:util';
import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from 'node:crypto';

const scrypt = promisify(scryptCallback);

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

const MENU_IMAGE_BY_ID = {
  1: '/src/assets/images/pizza-chicken-bbq.jpg',
  2: '/src/assets/images/pizza-vegetariana.jpg',
  3: '/src/assets/images/pizza-diavola.jpg',
  4: '/src/assets/images/pizza-margherita.jpg',
  5: '/src/assets/images/pizza-tonno.jpg',
  6: '/src/assets/images/pizza-pepperoni.jpg',
  7: '/src/assets/images/pizza-quattro-formaggi.jpg',
  8: '/src/assets/images/pizza-vegetariana.jpg',
  9: '/src/assets/images/pizza-prosciutto.jpg',
  10: '/src/assets/images/pizza-capricciosa.jpg',
  11: '/src/assets/images/pizza-hawaii.jpg',
};

const DEFAULT_OPENING_HOURS = {
  label: 'Aukioloajat',
  title: 'Pizzeria on auki',
  weekdaysLabel: 'Ma - pe',
  weekdaysHours: '6.00 - 18.00',
  weekendsLabel: 'La - su',
  weekendsHours: '8.00 - 15.00',
  lunchNote: 'Ennen klo 13 saat lounaspizzat 10 % edullisemmin.',
};

const DEFAULT_LUNCH_OFFER = {
  label: 'Lounastarjous',
  title: '10 % edullisempi ennen klo 13',
  discountPercent: 10,
  startTime: '11:00',
  endTime: '13:00',
  activeText: 'Ennen klo 13 tilatut pizzat ovat 10 % tavallista halvempia.',
  inactiveText: '10 % alennus on voimassa klo 11.00-13.00.',
};

function getDefaultMenuImage(item) {
  const customImage = String(item?.image || '').trim();

  if (customImage) {
    return customImage;
  }

  const numericId = Number(item?.itemId);

  if (Number.isInteger(numericId) && MENU_IMAGE_BY_ID[numericId]) {
    return MENU_IMAGE_BY_ID[numericId];
  }

  return item?.image || null;
}

function normalizeEmail(email) {
  return String(email || '')
    .trim()
    .toLowerCase();
}

async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const key = await scrypt(password, salt, 64);
  return `scrypt$${salt}$${Buffer.from(key).toString('hex')}`;
}

async function verifyPassword(password, hash) {
  if (typeof hash !== 'string') {
    return false;
  }

  if (!hash.startsWith('scrypt$')) {
    return password === hash;
  }

  const [algorithm, salt, storedHex] = hash.split('$');
  if (algorithm !== 'scrypt' || !salt || !storedHex) {
    return false;
  }

  const key = await scrypt(password, salt, 64);
  const storedBuffer = Buffer.from(storedHex, 'hex');
  const keyBuffer = Buffer.from(key);

  if (storedBuffer.length !== keyBuffer.length) {
    return false;
  }

  return timingSafeEqual(storedBuffer, keyBuffer);
}

async function tableExists(connection, tableName) {
  const [rows] = await connection.query(
    `SELECT 1
     FROM information_schema.tables
     WHERE table_schema = DATABASE()
       AND table_name = ?
     LIMIT 1`,
    [tableName]
  );

  return rows.length > 0;
}

async function getTableColumns(connection, tableName) {
  const [rows] = await connection.query(
    `SELECT
      column_name,
      is_nullable,
      column_default,
      extra,
      data_type
     FROM information_schema.columns
     WHERE table_schema = DATABASE()
       AND table_name = ?`,
    [tableName]
  );

  return rows.map(row => ({
    name: row.column_name,
    isNullable: row.is_nullable === 'YES',
    hasDefault: row.column_default != null,
    isAutoIncrement: String(row.extra || '').includes('auto_increment'),
    dataType: String(row.data_type || '').toLowerCase(),
  }));
}

function hasColumn(columns, name) {
  return columns.some(column => column.name === name);
}

function pickFirstExisting(columns, candidates) {
  for (const candidate of candidates) {
    if (hasColumn(columns, candidate)) {
      return candidate;
    }
  }

  return null;
}

function findColumn(columns, name) {
  return columns.find(column => column.name === name) || null;
}

function splitName(name) {
  const normalized = String(name || '').trim();
  if (!normalized) {
    return {firstName: '', lastName: ''};
  }

  const parts = normalized.split(/\s+/);
  if (parts.length === 1) {
    return {firstName: parts[0], lastName: ''};
  }

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' '),
  };
}

function buildInsertQuery(tableName, payload) {
  const columns = Object.keys(payload);
  const placeholders = columns.map(() => '?');
  const values = columns.map(column => payload[column]);

  return {
    sql: `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders.join(', ')})`,
    values,
  };
}

function resolveMissingRequiredColumns(columns, providedColumns) {
  return columns
    .filter(column => {
      if (providedColumns.has(column.name)) {
        return false;
      }

      if (column.isNullable || column.hasDefault || column.isAutoIncrement) {
        return false;
      }

      return true;
    })
    .map(column => column.name);
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
    image: row.image || MENU_IMAGE_BY_ID[Number(row.menu_item_id)] || null,
  };
}

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

  const [imageColumnRows] = await pool.query(
    `SELECT 1
     FROM information_schema.columns
     WHERE table_schema = DATABASE()
       AND table_name = 'menu_items'
       AND column_name = 'image'
     LIMIT 1`
  );

  if (imageColumnRows.length === 0) {
    await pool.query(`ALTER TABLE menu_items ADD COLUMN image VARCHAR(500) NULL AFTER available_weekday`);
  }

  const [featuredColumnRows] = await pool.query(
    `SELECT 1
     FROM information_schema.columns
     WHERE table_schema = DATABASE()
       AND table_name = 'menu_items'
       AND column_name = 'featured'
     LIMIT 1`
  );

  if (featuredColumnRows.length === 0) {
    await pool.query(`ALTER TABLE menu_items ADD COLUMN featured TINYINT(1) NOT NULL DEFAULT 0 AFTER image`);
  }

  await pool.query(
    `UPDATE menu_items
     SET image = CASE menu_item_id
       WHEN 1 THEN ?
       WHEN 2 THEN ?
       WHEN 3 THEN ?
       WHEN 4 THEN ?
       WHEN 5 THEN ?
       WHEN 6 THEN ?
       WHEN 7 THEN ?
       WHEN 8 THEN ?
       WHEN 9 THEN ?
       WHEN 10 THEN ?
       WHEN 11 THEN ?
       ELSE image
     END
     WHERE menu_item_id IN (1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11)
       AND (image IS NULL OR image = '')`,
    [
      MENU_IMAGE_BY_ID[1],
      MENU_IMAGE_BY_ID[2],
      MENU_IMAGE_BY_ID[3],
      MENU_IMAGE_BY_ID[4],
      MENU_IMAGE_BY_ID[5],
      MENU_IMAGE_BY_ID[6],
      MENU_IMAGE_BY_ID[7],
      MENU_IMAGE_BY_ID[8],
      MENU_IMAGE_BY_ID[9],
      MENU_IMAGE_BY_ID[10],
      MENU_IMAGE_BY_ID[11],
    ]
  );

  // Mark first 4 items as featured
  await pool.query(
    `UPDATE menu_items SET featured = 1 WHERE menu_item_id IN (1, 2, 3, 4)`
  );

  // Create ratings table if it doesn't exist
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ratings (
      rating_id INT PRIMARY KEY AUTO_INCREMENT,
      score VARCHAR(10) NOT NULL,
      description VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // Seed initial rating data if table is empty
  const [ratingRows] = await pool.query('SELECT COUNT(*) as count FROM ratings');
  if (ratingRows[0].count === 0) {
    await pool.query(`
      INSERT INTO ratings (score, description) VALUES
      (?, ?)
    `, ['4.8/5', 'Asiakastyytyväisyys']);
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
    // Determine available columns and include city if present in schema
    const locationColumns = await getTableColumns(pool, 'locations');
    const payload = {name: 'Pizzeria Pro', address: 'Urho Kekkosen katu 1, 00100 Helsinki', is_default: 1};
    if (findColumn(locationColumns, 'city') && !findColumn(locationColumns, 'city').hasDefault) {
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
    await pool.query(`ALTER TABLE opening_hours ADD COLUMN lunch_note VARCHAR(255) NOT NULL DEFAULT 'Ennen klo 13 saat lounaspizzat 10 % edullisemmin.'`);
  }
  if (!hasColumn(openingHoursColumns, 'updated_at')) {
    await pool.query(`ALTER TABLE opening_hours ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`);
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
    await pool.query(`ALTER TABLE lunch_offers ADD COLUMN title VARCHAR(150) NOT NULL DEFAULT '10 % edullisempi ennen klo 13'`);
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
    await pool.query(`ALTER TABLE lunch_offers ADD COLUMN active_text VARCHAR(255) NOT NULL DEFAULT 'Ennen klo 13 tilatut pizzat ovat 10 % tavallista halvempia.'`);
  }
  if (!hasColumn(lunchOfferColumns, 'inactive_text')) {
    await pool.query(`ALTER TABLE lunch_offers ADD COLUMN inactive_text VARCHAR(255) NOT NULL DEFAULT '10 % alennus on voimassa klo 11.00-13.00.'`);
  }
  if (!hasColumn(lunchOfferColumns, 'updated_at')) {
    await pool.query(`ALTER TABLE lunch_offers ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`);
  }

  const [lunchOfferRows] = await pool.query(`SELECT lunch_offer_id FROM lunch_offers LIMIT 1`);
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
      ) VALUES (?, ?, ?, ?, ?, ?, ?)` ,
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

  const [openingHoursRows] = await pool.query(
    `SELECT label FROM opening_hours LIMIT 1`
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
  } else {
    await pool.query(
      `UPDATE opening_hours
       SET label = ?,
           title = ?,
           weekdays_label = ?,
           weekdays_hours = ?,
           weekends_label = ?,
           weekends_hours = ?,
           lunch_note = ?`,
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

  // Create order_items table
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
}

export async function pingDatabase() {
  await pool.query('SELECT 1');
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
         SET name = ?, description = ?, price = ?, category = ?, dietary_info = ?, is_lunch_item = ?, available_weekday = ?, image = ?, featured = ?
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
  const [result] = await pool.query('DELETE FROM menu_items WHERE menu_item_id = ?', [
    itemId,
  ]);
  return result.affectedRows > 0;
}

export async function registerCustomerAccount({name, email, password}) {
  const normalizedEmail = normalizeEmail(email);
  const normalizedName = String(name || '').trim();

  const connection = await pool.getConnection();

  try {
    const usersColumns = await getTableColumns(connection, 'users');
    if (usersColumns.length === 0) {
      throw new Error('users table not found from current database');
    }

    const userIdColumnName = pickFirstExisting(usersColumns, [
      'id',
      'user_id',
      'uuid',
    ]);
    const emailColumnName = pickFirstExisting(usersColumns, [
      'email',
      'username',
      'user_email',
    ]);
    const passwordColumnName = pickFirstExisting(usersColumns, [
      'password_hash',
      'password',
      'passwd',
    ]);

    if (!emailColumnName || !passwordColumnName) {
      throw new Error(
        'users table must include email/username and password columns'
      );
    }

    const [duplicates] = await connection.query(
      `SELECT ${emailColumnName}
       FROM users
       WHERE ${emailColumnName} = ?
       LIMIT 1`,
      [normalizedEmail]
    );

    if (duplicates.length > 0) {
      const error = new Error('Tällä sähköpostilla on jo tili.');
      error.status = 409;
      error.code = 'CUSTOMER_EXISTS';
      throw error;
    }

    const passwordHash = await hashPassword(password);
    const userPayload = {
      [emailColumnName]: normalizedEmail,
      [passwordColumnName]: passwordHash,
    };

    const roleColumn = pickFirstExisting(usersColumns, [
      'role',
      'user_role',
      'type',
    ]);
    if (roleColumn) {
      userPayload[roleColumn] = 'customer';
    }

    const activeColumn = pickFirstExisting(usersColumns, [
      'is_active',
      'active',
      'enabled',
    ]);
    if (activeColumn) {
      userPayload[activeColumn] = 1;
    }

    const statusColumn = pickFirstExisting(usersColumns, ['status']);
    if (statusColumn) {
      userPayload[statusColumn] = 'active';
    }

    const usersNameColumn = pickFirstExisting(usersColumns, [
      'name',
      'full_name',
    ]);
    if (usersNameColumn) {
      userPayload[usersNameColumn] = normalizedName;
    }

    if (userIdColumnName) {
      const idColumnDef = findColumn(usersColumns, userIdColumnName);
      if (idColumnDef && !idColumnDef.isAutoIncrement) {
        if (idColumnDef.dataType === 'char' || idColumnDef.dataType === 'varchar') {
          userPayload[userIdColumnName] = randomBytes(16).toString('hex');
        }
      }
    }

    const missingRequiredForUsers = resolveMissingRequiredColumns(
      usersColumns,
      new Set(Object.keys(userPayload))
    );
    if (missingRequiredForUsers.length > 0) {
      throw new Error(
        `users table has required columns without defaults: ${missingRequiredForUsers.join(', ')}`
      );
    }

    await connection.beginTransaction();

    const userInsert = buildInsertQuery('users', userPayload);
    const [insertResult] = await connection.query(userInsert.sql, userInsert.values);

    let userId = null;
    if (userIdColumnName && userPayload[userIdColumnName] != null) {
      userId = userPayload[userIdColumnName];
    } else if (insertResult && insertResult.insertId) {
      userId = insertResult.insertId;
    } else if (userIdColumnName) {
      const [userRows] = await connection.query(
        `SELECT ${userIdColumnName}
         FROM users
         WHERE ${emailColumnName} = ?
         LIMIT 1`,
        [normalizedEmail]
      );
      userId = userRows[0]?.[userIdColumnName] ?? null;
    }

    const customerProfilesExists = await tableExists(connection, 'customer_profiles');
    if (customerProfilesExists) {
      const customerProfileColumns = await getTableColumns(
        connection,
        'customer_profiles'
      );

      const profilePayload = {};
      const profileUserIdColumn = pickFirstExisting(customerProfileColumns, [
        'user_id',
        'customer_id',
        'users_id',
      ]);

      if (profileUserIdColumn && userId != null) {
        profilePayload[profileUserIdColumn] = userId;
      }

      const profileNameColumn = pickFirstExisting(customerProfileColumns, [
        'name',
        'full_name',
      ]);
      if (profileNameColumn) {
        profilePayload[profileNameColumn] = normalizedName;
      }

      const firstNameColumn = pickFirstExisting(customerProfileColumns, [
        'first_name',
        'firstname',
      ]);
      const lastNameColumn = pickFirstExisting(customerProfileColumns, [
        'last_name',
        'lastname',
      ]);
      if (firstNameColumn || lastNameColumn) {
        const nameParts = splitName(normalizedName);
        if (firstNameColumn) {
          profilePayload[firstNameColumn] = nameParts.firstName;
        }
        if (lastNameColumn) {
          profilePayload[lastNameColumn] = nameParts.lastName;
        }
      }

      const profileEmailColumn = pickFirstExisting(customerProfileColumns, [
        'email',
        'user_email',
      ]);
      if (profileEmailColumn) {
        profilePayload[profileEmailColumn] = normalizedEmail;
      }

      const missingRequiredForProfile = resolveMissingRequiredColumns(
        customerProfileColumns,
        new Set(Object.keys(profilePayload))
      );

      if (missingRequiredForProfile.length === 0 && Object.keys(profilePayload).length > 0) {
        const profileInsert = buildInsertQuery('customer_profiles', profilePayload);
        await connection.query(profileInsert.sql, profileInsert.values);
      }
    }

    await connection.commit();

    const result = {
      id: userId,
      name: normalizedName,
      email: normalizedEmail,
    };

    // Include role when users table has a role column
    if (roleColumn) {
      result.role = userPayload[roleColumn] || 'customer';
    }

    return result;
  } catch (error) {
    try {
      await connection.rollback();
    } catch {
      // ignore rollback errors when transaction has not started
    }
    throw error;
  } finally {
    connection.release();
  }
}

export async function loginCustomerAccount({email, password}) {
  const normalizedEmail = normalizeEmail(email);
  const connection = await pool.getConnection();

  try {
    const usersColumns = await getTableColumns(connection, 'users');
    if (usersColumns.length === 0) {
      throw new Error('users table not found from current database');
    }

    const userIdColumnName = pickFirstExisting(usersColumns, [
      'id',
      'user_id',
      'uuid',
    ]);
    const emailColumnName = pickFirstExisting(usersColumns, [
      'email',
      'username',
      'user_email',
    ]);
    const passwordColumnName = pickFirstExisting(usersColumns, [
      'password_hash',
      'password',
      'passwd',
    ]);
    const usersNameColumn = pickFirstExisting(usersColumns, ['name', 'full_name']);

    if (!emailColumnName || !passwordColumnName) {
      throw new Error(
        'users table must include email/username and password columns'
      );
    }

    const selectColumns = [emailColumnName, passwordColumnName];
    if (userIdColumnName) {
      selectColumns.push(userIdColumnName);
    }
    if (usersNameColumn) {
      selectColumns.push(usersNameColumn);
    }
    const userRoleColumn = pickFirstExisting(usersColumns, [
      'role',
      'user_role',
      'type',
    ]);
    if (userRoleColumn) {
      selectColumns.push(userRoleColumn);
    }

    const [rows] = await connection.query(
      `SELECT ${selectColumns.join(', ')}
       FROM users
       WHERE ${emailColumnName} = ?
       LIMIT 1`,
      [normalizedEmail]
    );

    if (rows.length === 0) {
      return null;
    }

    const user = rows[0];
    const isValid = await verifyPassword(password, user[passwordColumnName]);
    if (!isValid) {
      return null;
    }

    const customer = {
      id: userIdColumnName ? user[userIdColumnName] : null,
      name: usersNameColumn ? user[usersNameColumn] : null,
      email: user[emailColumnName],
    };

    if (userRoleColumn) {
      customer.role = user[userRoleColumn] || 'customer';
    }

    const customerProfilesExists = await tableExists(connection, 'customer_profiles');
    if (customerProfilesExists && customer.id != null) {
      const profileColumns = await getTableColumns(connection, 'customer_profiles');
      const profileUserIdColumn = pickFirstExisting(profileColumns, [
        'user_id',
        'customer_id',
        'users_id',
      ]);

      if (profileUserIdColumn) {
        const profileNameColumn = pickFirstExisting(profileColumns, ['name', 'full_name']);
        const profileFirstName = pickFirstExisting(profileColumns, [
          'first_name',
          'firstname',
        ]);
        const profileLastName = pickFirstExisting(profileColumns, [
          'last_name',
          'lastname',
        ]);

        const profileSelectColumns = [];
        if (profileNameColumn) {
          profileSelectColumns.push(profileNameColumn);
        }
        if (profileFirstName) {
          profileSelectColumns.push(profileFirstName);
        }
        if (profileLastName) {
          profileSelectColumns.push(profileLastName);
        }

        if (profileSelectColumns.length > 0) {
          const [profileRows] = await connection.query(
            `SELECT ${profileSelectColumns.join(', ')}
             FROM customer_profiles
             WHERE ${profileUserIdColumn} = ?
             LIMIT 1`,
            [customer.id]
          );

          const profile = profileRows[0];
          if (profile) {
            if (profileNameColumn && profile[profileNameColumn]) {
              customer.name = profile[profileNameColumn];
            } else {
              const first = profileFirstName ? profile[profileFirstName] : '';
              const last = profileLastName ? profile[profileLastName] : '';
              const combined = `${first || ''} ${last || ''}`.trim();
              if (combined) {
                customer.name = combined;
              }
            }
          }
        }
      }
    }

    if (!customer.name) {
      customer.name = customer.email;
    }

    return customer;
  } finally {
    connection.release();
  }
}

export async function getUserByEmail(email) {
  const normalizedEmail = normalizeEmail(email);
  const connection = await pool.getConnection();

  try {
    const usersColumns = await getTableColumns(connection, 'users');
    if (usersColumns.length === 0) {
      return null;
    }

    const userIdColumnName = pickFirstExisting(usersColumns, [
      'id',
      'user_id',
      'uuid',
    ]);
    const emailColumnName = pickFirstExisting(usersColumns, [
      'email',
      'username',
      'user_email',
    ]);
    const usersNameColumn = pickFirstExisting(usersColumns, ['name', 'full_name']);
    const roleColumn = pickFirstExisting(usersColumns, [
      'role',
      'user_role',
      'type',
    ]);

    const selectColumns = [emailColumnName];
    if (userIdColumnName) selectColumns.push(userIdColumnName);
    if (usersNameColumn) selectColumns.push(usersNameColumn);
    if (roleColumn) selectColumns.push(roleColumn);

    const [rows] = await connection.query(
      `SELECT ${selectColumns.join(', ')} FROM users WHERE ${emailColumnName} = ? LIMIT 1`,
      [normalizedEmail]
    );

    if (rows.length === 0) return null;

    const row = rows[0];
    const user = {
      id: userIdColumnName ? row[userIdColumnName] : null,
      name: usersNameColumn ? row[usersNameColumn] : null,
      email: row[emailColumnName],
    };

    if (roleColumn) {
      user.role = row[roleColumn] || 'customer';
    }

    return user;
  } finally {
    connection.release();
  }
}

export async function getRatings() {
  const [rows] = await pool.query(
    `SELECT rating_id, score, description
     FROM ratings
     ORDER BY rating_id ASC`
  );
  return rows.map(row => ({
    id: row.rating_id,
    score: row.score,
    description: row.description,
  }));
}

export async function getOpeningHours() {
  const [rows] = await pool.query(
    `SELECT
      label,
      title,
      weekdays_label,
      weekdays_hours,
      weekends_label,
      weekends_hours,
      lunch_note
     FROM opening_hours
     LIMIT 1`
  );

  const row = rows[0];

  if (!row) {
    return {...DEFAULT_OPENING_HOURS};
  }

  return {
    label: row.label,
    title: row.title,
    weekdaysLabel: row.weekdays_label,
    weekdaysHours: row.weekdays_hours,
    weekendsLabel: row.weekends_label,
    weekendsHours: row.weekends_hours,
    lunchNote: row.lunch_note,
  };
}

function normalizeLunchOfferRow(row) {
  if (!row) {
    return {...DEFAULT_LUNCH_OFFER};
  }

  return {
    label: row.label,
    title: row.title,
    discountPercent: Number(row.discount_percent),
    startTime: String(row.start_time || DEFAULT_LUNCH_OFFER.startTime).slice(0, 5),
    endTime: String(row.end_time || DEFAULT_LUNCH_OFFER.endTime).slice(0, 5),
    activeText: row.active_text,
    inactiveText: row.inactive_text,
  };
}

export async function getLunchOffer() {
  const [rows] = await pool.query(
    `SELECT
      label,
      title,
      discount_percent,
      start_time,
      end_time,
      active_text,
      inactive_text
     FROM lunch_offers
     LIMIT 1`
  );

  return normalizeLunchOfferRow(rows[0]);
}

export async function updateLunchOffer({label, title, discountPercent, startTime, endTime, activeText, inactiveText}) {
  const [rows] = await pool.query(`SELECT lunch_offer_id FROM lunch_offers LIMIT 1`);
  if (rows.length === 0) {
    throw new Error('Lunch offer row not found');
  }

  const offerId = rows[0].lunch_offer_id;

  const [result] = await pool.query(
    `UPDATE lunch_offers
     SET label = ?,
         title = ?,
         discount_percent = ?,
         start_time = ?,
         end_time = ?,
         active_text = ?,
         inactive_text = ?
     WHERE lunch_offer_id = ?`,
    [
      String(label).trim(),
      String(title).trim(),
      Number(discountPercent),
      String(startTime).trim(),
      String(endTime).trim(),
      String(activeText).trim(),
      String(inactiveText).trim(),
      offerId,
    ]
  );

  return result.affectedRows > 0;
}

export async function updateRating(ratingId, {score, description}) {
  if (!ratingId) {
    throw new Error('ratingId is required');
  }

  const updates = [];
  const values = [];

  if (score != null) {
    updates.push('score = ?');
    values.push(String(score).trim());
  }

  if (description != null) {
    updates.push('description = ?');
    values.push(String(description).trim());
  }

  if (updates.length === 0) {
    throw new Error('No fields to update');
  }

  values.push(ratingId);

  const [result] = await pool.query(
    `UPDATE ratings
     SET ${updates.join(', ')}
     WHERE rating_id = ?`,
    values
  );

  return result.affectedRows > 0;
}

export async function createOrder({customerUserId, locationId = null, subtotalAmount = 0, discountPercent = 0, discountAmount = 0, totalAmount}) {
  let resolvedLocationId = Number.isInteger(locationId) && locationId > 0 ? locationId : null;

  if (resolvedLocationId != null) {
    const [locationRows] = await pool.query(
      `SELECT location_id FROM locations WHERE location_id = ? LIMIT 1`,
      [resolvedLocationId]
    );

    if (locationRows.length === 0) {
      resolvedLocationId = null;
    }
  }

  if (resolvedLocationId == null) {
    const [defaultLocationRows] = await pool.query(
      `SELECT location_id
       FROM locations
       WHERE is_default = 1
       ORDER BY location_id ASC
       LIMIT 1`
    );

    resolvedLocationId = defaultLocationRows[0]?.location_id ?? null;
  }

  if (resolvedLocationId == null) {
    const [fallbackLocationRows] = await pool.query(
      `SELECT location_id
       FROM locations
       ORDER BY location_id ASC
       LIMIT 1`
    );

    resolvedLocationId = fallbackLocationRows[0]?.location_id ?? null;
  }

  if (resolvedLocationId == null) {
    throw new Error('Sijaintia ei löytynyt tilauksen luontia varten');
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
      subtotalAmount || 0,
      discountPercent || 0,
      discountAmount || 0,
      totalAmount || 0,
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
    `SELECT order_id, customer_user_id, location_id, subtotal_amount, discount_percent, discount_amount, total_amount, status, created_at FROM orders WHERE order_id = ? LIMIT 1`,
    [orderId]
  );

  if (orderRows.length === 0) {
    return null;
  }

  const order = orderRows[0];
  const [itemRows] = await pool.query(
    `SELECT order_item_id, menu_item_id, quantity, original_unit_price, discount_percent, discount_amount, discounted_unit_price, line_total, unit_price, notes FROM order_items WHERE order_id = ? ORDER BY order_item_id ASC`,
    [orderId]
  );

  return {
    id: order.order_id,
    customerId: order.customer_user_id,
    locationId: order.location_id,
    subtotalAmount: Number(order.subtotal_amount),
    discountPercent: Number(order.discount_percent),
    discountAmount: Number(order.discount_amount),
    totalAmount: Number(order.total_amount),
    status: order.status,
    createdAt: order.created_at,
    items: itemRows.map(item => ({
      id: item.order_item_id,
      menuItemId: item.menu_item_id,
      quantity: item.quantity,
      originalUnitPrice: Number(item.original_unit_price),
      discountPercent: Number(item.discount_percent),
      discountAmount: Number(item.discount_amount),
      discountedUnitPrice: Number(item.discounted_unit_price),
      lineTotal: Number(item.line_total),
      unitPrice: Number(item.unit_price),
      notes: item.notes,
    })),
  };
}
