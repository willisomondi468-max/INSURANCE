const express = require('express');
const { param, body } = require('express-validator');
const router = express.Router();
const { validate } = require('../middleware/validate');
const {
  authenticate,
  requireDepartmentManager,
  requireHRManager,
  requireCompanyAdmin
} = require('../middleware/auth');
const managerController = require('../controllers/managerController');

/**
 * Manager Dashboard Routes
 * Department-scoped management views
 */

/**
 * GET /api/manager/dashboard
 * Manager dashboard overview
 */
router.get(
  '/dashboard',
  authenticate,
  requireDepartmentManager,
  managerController.getManagerDashboard
);

/**
 * GET /api/manager/attendance
 * Team attendance records
 */
router.get(
  '/attendance',
  authenticate,
  requireDepartmentManager,
  managerController.getTeamAttendance
);

/**
 * GET /api/manager/tasks
 * Team task summary
 */
router.get(
  '/tasks',
  authenticate,
  requireDepartmentManager,
  managerController.getTeamTasks
);

/**
 * POST /api/manager/attendance-corrections/:id/approve
 * Approve or reject attendance correction
 */
router.post(
  '/attendance-corrections/:id/approve',
  authenticate,
  requireDepartmentManager,
  [
    param('id').isUUID().withMessage('Valid correction ID is required'),
    body('approved').isBoolean().withMessage('approved must be a boolean'),
    body('reason').optional()
  ],
  validate,
  managerController.approveAttendanceCorrection
);

/**
 * POST /api/manager/leave-requests/:id/approve
 * Approve or reject leave request
 */
router.post(
  '/leave-requests/:id/approve',
  authenticate,
  requireDepartmentManager,
  [
    param('id').isUUID().withMessage('Valid leave request ID is required'),
    body('approved').isBoolean().withMessage('approved must be a boolean'),
    body('reason').optional()
  ],
  validate,
  managerController.approveLeaveRequest
);

module.exports = router;
