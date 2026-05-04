import 'dotenv/config';
import mysql from 'mysql2/promise';

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'pizzeria_app',
  });

  const targetEmail = 'admin@gmail.com';

  try {
    const [cols] = await connection.query(
      `SELECT column_name FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name IN ('email','username','user_email') LIMIT 1`
    );

    if (!cols || cols.length === 0) {
      console.error('Cannot find an email column in users table. Aborting.');
      process.exit(2);
    }

    const emailCol = cols[0].column_name;

    // Ensure role column exists
    const [roleCols] = await connection.query(
      `SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name IN ('role','user_role','type') LIMIT 1`
    );

    if (roleCols.length === 0) {
      console.error('No role column found in users table. Please add a role column before running this script.');
      process.exit(3);
    }

    // Find the canonical role column name
    const [roleColInfo] = await connection.query(
      `SELECT column_name FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name IN ('role','user_role','type') LIMIT 1`
    );
    const roleCol = roleColInfo[0].column_name;

    const [res] = await connection.query(
      `UPDATE users SET ${roleCol} = 'admin' WHERE ${emailCol} = ?`,
      [targetEmail]
    );

    if (res && res.affectedRows > 0) {
      console.log(`Set role='admin' for ${targetEmail}`);
    } else {
      console.log(`No user found with email ${targetEmail}.`);
    }
  } finally {
    await connection.end();
  }
}

main().catch(err => {
  console.error('Failed to set admin role:', err);
  process.exit(1);
});
