const express = require('express');
const router = express.Router();
const { authenticate, requireAdmin, requireProvider } = require('../middleware/auth');
const dashboardController = require('../controllers/dashboardController');

/**
 * Dashboard Routes
 * Provides dashboard statistics and reports
 */

// GET /api/dashboard/stats
// Get admin dashboard statistics (Admin only)
router.get(
  '/stats',
  authenticate,
  requireAdmin,
  dashboardController.getDashboardStats
);

// GET /api/dashboard/provider
// Get service provider dashboard (Provider/Admin)
router.get(
  '/provider',
  authenticate,
  requireProvider,
  dashboardController.getProviderDashboard
);

// GET /api/reports/pdf/:type
// Generate PDF report (Admin only)
router.get(
  '/pdf/:type',
  authenticate,
  requireAdmin,
  dashboardController.generatePDFReport
);

// GET /api/reports/csv/:type
// Generate CSV report (Admin only)
router.get(
  '/csv/:type',
  authenticate,
  requireAdmin,
  dashboardController.generateCSVReport
);

// GET /api/audit-logs
// Get audit logs (Admin only)
router.get(
  '/audit-logs',
  authenticate,
  requireAdmin,
  dashboardController.getAuditLogs
);

module.exports = router;
