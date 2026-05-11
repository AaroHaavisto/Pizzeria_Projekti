import {randomBytes} from 'node:crypto';
import {pool} from '../db/pool.js';
import {
  buildInsertQuery,
  findColumn,
  getTableColumns,
  pickFirstExisting,
  resolveMissingRequiredColumns,
} from '../db/schemaUtils.js';
import {
  hashPassword,
  normalizeEmail,
  verifyPassword,
} from '../utils/auth.js';

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

export async function registerCustomerAccount({name, email, password}) {
  const normalizedEmail = normalizeEmail(email);
  const normalizedName = String(name || '').trim();
  const {firstName, lastName} = splitName(normalizedName);

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const usersColumns = await getTableColumns(connection, 'users');

    if (usersColumns.length === 0) {
      throw new Error('users table not found');
    }

    const userIdColumn = pickFirstExisting(usersColumns, ['id', 'user_id']);
    const emailColumn = pickFirstExisting(usersColumns, ['email']);
    const passwordColumn = pickFirstExisting(usersColumns, [
      'password',
      'password_hash',
    ]);

    if (!emailColumn || !passwordColumn) {
      throw new Error('users table missing email/password');
    }

    const [existing] = await connection.query(
      `SELECT ${emailColumn} FROM users WHERE ${emailColumn} = ? LIMIT 1`,
      [normalizedEmail]
    );

    if (existing.length > 0) {
      const error = new Error('Tällä sähköpostilla on jo tili.');
      error.status = 409;
      throw error;
    }

    const passwordHash = await hashPassword(password);

    const payload = {
      [emailColumn]: normalizedEmail,
      [passwordColumn]: passwordHash,
    };

    const nameColumn = pickFirstExisting(usersColumns, ['name', 'full_name']);
    if (nameColumn) {
      payload[nameColumn] = normalizedName;
    }

    if (userIdColumn) {
      const def = findColumn(usersColumns, userIdColumn);
      if (def && !def.isAutoIncrement) {
        payload[userIdColumn] = randomBytes(16).toString('hex');
      }
    }

    const missing = resolveMissingRequiredColumns(
      usersColumns,
      new Set(Object.keys(payload))
    );

    if (missing.length > 0) {
      throw new Error(`Missing required columns: ${missing.join(', ')}`);
    }

    const insert = buildInsertQuery('users', payload);
    const [result] = await connection.query(insert.sql, insert.values);

    const userId = payload[userIdColumn] ?? result.insertId ?? null;

    if (userId) {
      await connection.query(
        `INSERT INTO customer_profiles (
          user_id,
          first_name,
          last_name,
          phone
        ) VALUES (?, ?, ?, ?)`,
        [userId, firstName, lastName, null]
      );
    }

    await connection.commit();

    return {
      id: userId,
      name: normalizedName,
      email: normalizedEmail,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function loginCustomerAccount({email, password}) {
  const normalizedEmail = normalizeEmail(email);
  const connection = await pool.getConnection();

  try {
    const [rows] = await connection.query(
      `SELECT
        u.user_id,
        u.email,
        u.password_hash,
        u.role,
        cp.first_name,
        cp.last_name
       FROM users u
       LEFT JOIN customer_profiles cp
        ON cp.user_id = u.user_id
       WHERE u.email = ?
       LIMIT 1`,
      [normalizedEmail]
    );

    if (rows.length === 0) return null;

    const user = rows[0];

    const valid = await verifyPassword(password, user.password_hash);

    if (!valid) return null;

    const fullName = [user.first_name, user.last_name]
      .filter(Boolean)
      .join(' ')
      .trim();

    return {
      id: user.user_id,
      name: fullName || user.email,
      email: user.email,
      role: user.role,
    };
  } finally {
    connection.release();
  }
}

export async function getUserByEmail(email) {
  const normalizedEmail = normalizeEmail(email);

  const [rows] = await pool.query(
    `SELECT * FROM users WHERE email = ? LIMIT 1`,
    [normalizedEmail]
  );

  return rows[0] || null;
}