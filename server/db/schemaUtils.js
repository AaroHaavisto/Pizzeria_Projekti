export async function tableExists(connection, tableName) {
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

export async function getTableColumns(connection, tableName) {
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

export function hasColumn(columns, name) {
  return columns.some(column => column.name === name);
}

export function pickFirstExisting(columns, candidates) {
  for (const candidate of candidates) {
    if (hasColumn(columns, candidate)) {
      return candidate;
    }
  }

  return null;
}

export function findColumn(columns, name) {
  return columns.find(column => column.name === name) || null;
}

export function buildInsertQuery(tableName, payload) {
  const columns = Object.keys(payload);
  const placeholders = columns.map(() => '?');
  const values = columns.map(column => payload[column]);

  return {
    sql: `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders.join(', ')})`,
    values,
  };
}

export function resolveMissingRequiredColumns(columns, providedColumns) {
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