const { Pool } = require('pg');

const pool = new Pool({
  host: 'dpg-d6k04pa4d50c73d39ik0-a.frankfurt-postgres.render.com',
  port: 5432,
  database: 'willis_3hj5',
  user: 'willis_3hj5_user',
  password: '2NgfWPnyP7jIZZBzL04kt4NanBPrwLxP',
  max: 5,
  idleTimeoutMillis: 60000,
  connectionTimeoutMillis: 15000,
  ssl: { rejectUnauthorized: false }
});

console.log('Connecting to database...');

pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'")
  .then(r => {
    console.log('Tables found:', r.rows.length);
    r.rows.forEach(t => console.log(' -', t.table_name));
    return pool.end();
  })
  .catch(e => {
    console.error('Error:', e.message);
    return pool.end();
  })
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
