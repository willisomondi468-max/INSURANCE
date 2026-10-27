require('dotenv').config();
const { query, initPool } = require('./src/config/db');
const bcrypt = require('bcryptjs');

const email = 'admin@insurance.com';
const SQL = `SELECT u.id, u.email, u.password_hash, u.role, u.is_active, u.created_at,
        cd.full_name, cd.id_number
 FROM users u
 LEFT JOIN customer_details cd ON u.id = cd.user_id
 WHERE u.email = $1`;

initPool().then(async () => {
  const r = await query(SQL, [email]);
  console.log('rows:', r.rows.length);
  if (r.rows.length) {
    const u = r.rows[0];
    console.log('active:', u.is_active, 'role:', u.role);
    console.log('password match:', await bcrypt.compare('admin123', u.password_hash));
  }
  process.exit(0);
}).catch(e => { console.error(e); process.exit(1); });
