require('dotenv').config();
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const p = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  const hash = await bcrypt.hash('sysadmin123', 10);
  const res = await p.query('UPDATE users SET password_hash = $1 WHERE email = $2', [hash, 'system@insuravault.com']);
  console.log('Update result rows affected:', res.rowCount);
  await p.end();
}

main().catch(err => {
  console.error('Error in update:', err.message);
  p.end();
  process.exit(1);
});
