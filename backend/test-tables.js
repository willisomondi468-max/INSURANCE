                                                                                                                                                    require('dotenv').config();
const { Pool } = require('pg');
const p = new Pool(process.env.DATABASE_URL ? { connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } } : {});
const tables = ['companies', 'insurance_plans', 'users', 'policies', 'claims', 'payments', 'tickets', 'ticket_responses', 'audit_logs', 'notifications', 'customer_details', 'refresh_tokens', 'customer_documents', 'departments', 'employees'];
p.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public'").then(r => {
  const existing = r.rows.map(x => x.table_name);
  for (const t of tables) console.log(existing.includes(t) ? 'EXISTS   ' : 'MISSING  ', t);
  console.log('--- all public tables ---');
  console.log(existing.join(', '));
  return p.end();
}).catch(e => { console.error(e.message); process.exit(1); });
