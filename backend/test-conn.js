const { Client } = require('pg');

const client = new Client({
  host: 'dpg-d6k04pa4d50c73d39ik0-a.frankfurt-postgres.render.com',
  port: 5432,
  database: 'willis_3hj5',
  user: 'willis_3hj5_user',
  password: '2NgfWPnyP7jIZZBzL04kt4NanBPrwLxP',
  ssl: { rejectUnauthorized: false }
});

console.log('Testing single connection...');

client.connect()
  .then(() => {
    console.log('Connected!');
    return client.query('SELECT NOW()');
  })
  .then(r => console.log('Time:', r.rows[0]))
  .catch(e => console.error('Error:', e.message))
  .finally(() => client.end());
