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

    return {
      id: userId,
      name: normalizedName,
      email: normalizedEmail,
    };
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
