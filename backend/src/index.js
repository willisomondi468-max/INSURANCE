const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Fail loudly and early if the JWT secret is missing - token signing and
// verification depend on it, and a silent undefined here breaks every login.
if (!process.env.JWT_SECRET) {
  console.error('❌ JWT_SECRET is not set. Add it to backend/.env (see .env.example).');
  process.exit(1);
}

const { initPool, pool } = require('./config/db');

const app = express();

// Import routes
const authRoutes = require('./routes/auth');
const customerRoutes = require('./routes/customers');
const planRoutes = require('./routes/plans');
const policyRoutes = require('./routes/policies');
const claimRoutes = require('./routes/claims');
const paymentRoutes = require('./routes/payments');
const ticketRoutes = require('./routes/tickets');
const dashboardRoutes = require('./routes/dashboard');
const employeeRoutes = require('./routes/employees');
const attendanceRoutes = require('./routes/attendance');
const taskRoutes = require('./routes/tasks');
const analyticsRoutes = require('./routes/analytics');
const reportRoutes = require('./routes/reports');
const leaveRequestRoutes = require('./routes/leaveRequests');
const systemRoutes = require('./routes/system');
const staffCustomerRoutes = require('./routes/staffCustomers');
const staffCustomerDocumentRoutes = require('./routes/staffCustomerDocuments');
const managerRoutes = require('./routes/manager');
const adminRoutes = require('./routes/admin');
const notificationRoutes = require('./routes/notifications');

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  }
});
app.use('/api/', limiter);

// Auth rate limiting (stricter)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per windowMs
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.'
  }
});
// Only throttle failed logins - a successful one should not count against the limit.
authLimiter.skipSuccessfulRequests = true;
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/plans', planRoutes);
app.use('/api/policies', policyRoutes);
app.use('/api/claims', claimRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', dashboardRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/reports', dashboardRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/leave-requests', leaveRequestRoutes);
app.use('/api/system', systemRoutes);
app.use('/api/staff/customers', staffCustomerRoutes);
app.use('/api/staff/customers', staffCustomerDocumentRoutes);
app.use('/api/manager', managerRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);

// Health check endpoint
app.get('/api/health', async (req, res) => {
  let db = 'unavailable';
  try {
    await pool.query('SELECT 1');
    db = 'connected';
  } catch (err) {
    db = 'unavailable';
  }

  res.status(db === 'connected' ? 200 : 503).json({
    success: db === 'connected',
    message: 'Insurance Management System API is running',
    database: db,
    timestamp: new Date().toISOString()
  });
});

// Root route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to Insurance Management System API',
    version: '1.0.0',
    docs: '/api/health'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);

  // Handle specific errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: err.errors
    });
  }

  if (err.code === '23505') { // PostgreSQL unique violation
    return res.status(409).json({
      success: false,
      message: 'Duplicate entry. This record already exists.'
    });
  }

  if (err.code === '23503') { // PostgreSQL foreign key violation
    return res.status(400).json({
      success: false,
      message: 'Invalid reference. Related record does not exist.'
    });
  }

  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});

// Get port from environment or use default
const PORT = process.env.PORT || 5000;

// Start server
const start = async () => {
  // Verify the database before accepting traffic. The server still boots when
  // the database is unreachable so /api/health can report the real problem.
  const dbReady = await initPool();

  if (dbReady) {
    // Ensure the schema exists. Safe to run repeatedly (IF NOT EXISTS) and it
    // repairs the seeded admin account's password hash.
    try {
      const { initializeDatabase } = require('./config/initDb');
      await initializeDatabase();
    } catch (err) {
      console.error('⚠️  Schema initialization skipped:', err.message);
    }
  } else {
    console.error('⚠️  Starting without a verified database connection.');
  }

  app.listen(PORT, () => {
    console.log(`
  ╔═══════════════════════════════════════════════════════════╗
  ║                                                           ║
  ║   🚀 Insurance Management System API                      ║
  ║                                                           ║
  ║   Server running on port ${PORT}                            ║
  ║   Environment: ${process.env.NODE_ENV || 'development'}                          ║
  ║   Database:    ${dbReady ? 'connected' : 'UNAVAILABLE'}                              ║
  ║                                                           ║
  ║   Endpoints:                                              ║
  ║   • Health:   GET  /api/health                            ║
  ║   • Auth:     POST /api/auth/login                        ║
  ║   • Plans:    GET  /api/plans                             ║
  ║   • Policies: GET  /api/policies                          ║
  ║   • Claims:   GET  /api/claims                            ║
  ║   • Tickets:  GET  /api/tickets                           ║
  ║                                                           ║
  ╚═══════════════════════════════════════════════════════════╝
    `);
  });
};

if (!process.env.VERCEL) {
  start();
}

module.exports = app;
