const { Pool } = require('pg');
require('dotenv').config();

/**
 * Database Connection Pool
 * Supports Supabase PostgreSQL (cloud) or local PostgreSQL.
 *
 * Set DATABASE_URL in backend/.env to your Supabase connection string:
 *   postgresql://postgres.[project-ref]:[password]@[host]:[port]/postgres
 *
 * Or set individual DB_* variables for local PostgreSQL.
 */

const useConnectionString = Boolean(process.env.DATABASE_URL);

const baseConfig = useConnectionString
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      database: process.env.DB_NAME || 'insurance',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    };

const pool = new Pool({
  ...baseConfig,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

let dbAvailable = false;

pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database (Supabase)');
  dbAvailable = true;
});

pool.on('error', (err) => {
  console.error('❌ Database pool error:', err.message);
  dbAvailable = false;
});

const initPool = async () => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    client.release();
    console.log('✅ Database connection verified:', result.rows[0].now);
    dbAvailable = true;
    return true;
  } catch (err) {
    console.error('❌ Database not available:', err.message);
    console.error(
      '   → Set DATABASE_URL in backend/.env to your Supabase connection string.\n' +
      '     Example: postgresql://postgres.[project-ref]:[password]@[host]:5432/postgres\n' +
      '     Get this from your Supabase project settings → Database.\n' +
      '     The server will start but database endpoints will return empty results.'
    );
    dbAvailable = false;
    return false;
  }
};

const query = async (text, params) => {
  if (!dbAvailable) {
    return { rows: [], rowCount: 0 };
  }
  try {
    const res = await pool.query(text, params);
    return res;
  } catch (err) {
    console.warn('Query failed:', err.message);
    dbAvailable = false;
    return { rows: [], rowCount: 0 };
  }
};

const getClient = async () => {
  if (!dbAvailable) return null;
  try {
    const client = await pool.connect();
    return client;
  } catch (err) {
    dbAvailable = false;
    return null;
  }
};

module.exports = {
  pool,
  query,
  getClient,
  initPool,
  isDbAvailable: () => dbAvailable,
};
