const express = require('express');
const router = express.Router();
const { authenticate, requireHRManager } = require('../middleware/auth');
const reportController = require('../controllers/reportController');

/**
 * Report Routes
 * Monthly report generation and export
 */

/**
 * GET /api/reports/monthly
 * Generate monthly performance report (PDF or CSV)
 */
router.get(
  '/monthly',
  authenticate,
  requireHRManager,
  reportController.generateMonthlyReport
);

module.exports = router;
