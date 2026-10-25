const express = require('express');
const router = express.Router();
const { authenticate, requireSupervisor, requireDepartmentManager, requireHRManager } = require('../middleware/auth');
const analyticsController = require('../controllers/analyticsController');

/**
 * Analytics Routes
 * Performance metrics, monthly comparisons, attendance analytics, productivity
 */

/**
 * GET /api/analytics/staff
 * Individual staff performance metrics
 */
router.get(
  '/staff',
  authenticate,
  requireSupervisor,
  analyticsController.getStaffAnalytics
);

/**
 * GET /api/analytics/departments
 * Department-level performance comparison
 */
router.get(
  '/departments',
  authenticate,
  requireDepartmentManager,
  analyticsController.getDepartmentAnalytics
);

/**
 * GET /api/analytics/company
 * Company-wide performance metrics
 */
router.get(
  '/company',
  authenticate,
  requireHRManager,
  analyticsController.getCompanyAnalytics
);

/**
 * GET /api/analytics/monthly
 * Monthly performance comparison data
 */
router.get(
  '/monthly',
  authenticate,
  requireHRManager,
  analyticsController.getMonthlyComparison
);

/**
 * GET /api/analytics/attendance
 * Attendance analytics with filters
 */
router.get(
  '/attendance',
  authenticate,
  requireDepartmentManager,
  analyticsController.getAttendanceAnalytics
);

/**
 * GET /api/analytics/productivity
 * Productivity metrics for charts
 */
router.get(
  '/productivity',
  authenticate,
  requireDepartmentManager,
  analyticsController.getProductivityAnalytics
);

/**
 * GET /api/analytics/targets
 * Performance targets and achievement
 */
router.get(
  '/targets',
  authenticate,
  requireDepartmentManager,
  analyticsController.getTargetsAnalytics
);

/**
 * GET /api/analytics/insights
 * AI-style insights from calculated data
 */
router.get(
  '/insights',
  authenticate,
  requireHRManager,
  analyticsController.getInsights
);

module.exports = router;
