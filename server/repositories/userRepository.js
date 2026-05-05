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

  const connection = await pool.getConnection();

  try {
    const usersColumns = await getTableColumns(connection, 'users');

    if (usersColumns.length === 0) {
      throw new Error('users table not found');
    }

    const userIdColumn = pickFirstExisting(usersColumns, ['id', 'user_id']);
    const emailColumn = pickFirstExisting(usersColumns, ['email']);
    const passwordColumn = pickFirstExisting(usersColumns, ['password', 'password_hash']);

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

    const userId =
      payload[userIdColumn] ??
      result.insertId ??
      null;

    return {
      id: userId,
      name: normalizedName,
      email: normalizedEmail,
    };

  } catch (error) {
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

    const emailColumn = pickFirstExisting(usersColumns, ['email']);
    const passwordColumn = pickFirstExisting(usersColumns, ['password', 'password_hash']);
    const idColumn = pickFirstExisting(usersColumns, ['id', 'user_id']);
    const nameColumn = pickFirstExisting(usersColumns, ['name', 'full_name']);
    const roleColumn = pickFirstExisting(usersColumns, ['role']);

    const selectCols = [emailColumn, passwordColumn, idColumn, nameColumn, roleColumn]
      .filter(Boolean)
      .join(', ');

    const [rows] = await connection.query(
      `SELECT ${selectCols}
       FROM users
       WHERE ${emailColumn} = ?
       LIMIT 1`,
      [normalizedEmail]
    );

    if (rows.length === 0) return null;

    const user = rows[0];

    const valid = await verifyPassword(password, user[passwordColumn]);

    if (!valid) return null;

    return {
      id: idColumn ? user[idColumn] : null,
      name: nameColumn ? user[nameColumn] : user[emailColumn],
      email: user[emailColumn],
      role: roleColumn ? user[roleColumn] : undefined,
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