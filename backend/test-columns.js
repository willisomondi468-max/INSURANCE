   require('dotenv').config();
const { Pool } = require('pg');
const p = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
p.query("SELECT table_name, column_name FROM information_schema.columns WHERE table_schema='public' AND table_name IN ('users','customer_details') ORDER BY table_name, ordinal_position")
  .then(r => { r.rows.forEach(x => console.log(x.table_name + '.' + x.column_name)); return p.end(); })
  .catch(e => { console.error(e.message); process.exit(1); });
