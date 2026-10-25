const { Pool } = require('pg');
const pool = new Pool({
  host: 'dpg-d6k04pa4d50c73d39ik0-a.frankfurt-postgres.render.com',
  port: 5432,
  database: 'willis_3hj5',
  user: 'willis_3hj5_user',
  password: '2NgfWPnyP7jIZZBzL04kt4NanBPrwLxP',
  ssl: { rejectUnauthorized: false }
});

pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'")
  .then(r => {
    console.log('Tables:', r.rows);
    pool.end();
  })
  .catch(e => {
    console.error('Error:', e.message);
    pool.end();
  });
