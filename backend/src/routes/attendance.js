const express = require('express');
const { body, param } = require('express-validator');
const router = express.Router();
const { validate } = require('../middleware/validate');
const {
  authenticate,
  requireEmployee,
  requireSupervisor,
  requireDepartmentManager,
  requireHRManager
} = require('../middleware/auth');
const attendanceController = require('../controllers/attendanceController');

/**
 * Attendance Routes
 * Clock-in/clock-out, breaks, adjustments, and attendance reporting
 */

/**
 * POST /api/attendance/clock-in
 * Employee clocks in
 */
router.post(
  '/clock-in',
  authenticate,
  requireEmployee,
  attendanceController.clockIn
);

/**
 * POST /api/attendance/clock-out
 * Employee clocks out
 */
router.post(
  '/clock-out',
  authenticate,
  requireEmployee,
  attendanceController.clockOut
);

/**
 * POST /api/attendance/breaks/start
 * Start a break
 */
router.post(
  '/breaks/start',
  authenticate,
  requireEmployee,
  [
    body('breakType').isIn(['lunch', 'tea', 'personal', 'other']).withMessage('Invalid break type'),
    body('paid').optional().isBoolean()
  ],
  validate,
  attendanceController.startBreak
);

/**
 * POST /api/attendance/breaks/end
 * End a break
 */
router.post(
  '/breaks/end',
  authenticate,
  requireEmployee,
  [body('breakId').isUUID().withMessage('Valid break ID is required')],
  validate,
  attendanceController.endBreak
);

/**
 * GET /api/attendance/me
 * Get current employee's attendance status
 */
router.get(
  '/me',
  authenticate,
  requireEmployee,
  attendanceController.getMyAttendance
);

/**
 * GET /api/attendance
 * List attendance records (manager/HR)
 */
router.get(
  '/',
  authenticate,
  requireSupervisor,
  attendanceController.getAttendance
);

/**
 * GET /api/attendance/summary
 * Attendance summary dashboard (manager/HR)
 */
router.get(
  '/summary',
  authenticate,
  requireDepartmentManager,
  attendanceController.getAttendanceSummary
);

/**
 * POST /api/attendance/adjustments
 * Request attendance correction
 */
router.post(
  '/adjustments',
  authenticate,
  requireEmployee,
  [
    body('attendanceRecordId').isUUID().withMessage('Valid attendance record ID is required'),
    body('proposedValues').isObject().withMessage('Proposed values must be an object'),
    body('reason').notEmpty().withMessage('Reason is required')
  ],
  validate,
  attendanceController.requestAdjustment
);

/**
 * PATCH /api/attendance/adjustments/:id/review
 * Review an attendance adjustment (HR/Manager)
 */
router.patch(
  '/adjustments/:id/review',
  authenticate,
  requireHRManager,
  [
    param('id').isUUID().withMessage('Valid adjustment ID is required'),
    body('decision').isIn(['approved', 'rejected']).withMessage('Decision must be approved or rejected')
  ],
  validate,
  attendanceController.reviewAdjustment
);

module.exports = router;
