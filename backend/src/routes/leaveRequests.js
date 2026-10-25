const express = require('express');
const { body, param } = require('express-validator');
const router = express.Router();
const { validate } = require('../middleware/validate');
const {
  authenticate,
  requireEmployee,
  requireDepartmentManager,
  requireHRManager
} = require('../middleware/auth');
const leaveRequestController = require('../controllers/leaveRequestController');

/**
 * Leave Request Routes
 */

/**
 * GET /api/leave-requests
 * List leave requests with filters
 */
router.get(
  '/',
  authenticate,
  requireDepartmentManager,
  leaveRequestController.getLeaveRequests
);

/**
 * POST /api/leave-requests
 * Create a leave request (employee self)
 */
router.post(
  '/',
  authenticate,
  requireEmployee,
  [
    body('employeeId').isUUID().withMessage('Valid employee ID is required'),
    body('leaveType').isIn(['annual', 'sick', 'personal', 'maternity', 'paternity', 'unpaid', 'other']).withMessage('Invalid leave type'),
    body('startDate').isISO8601().withMessage('Valid start date is required'),
    body('endDate').isISO8601().withMessage('Valid end date is required'),
    body('reason').notEmpty().withMessage('Reason is required')
  ],
  validate,
  leaveRequestController.createLeaveRequest
);

/**
 * PATCH /api/leave-requests/:id/approve
 * Approve or reject a leave request
 */
router.patch(
  '/:id/approve',
  authenticate,
  requireHRManager,
  [
    param('id').isUUID().withMessage('Valid leave request ID is required'),
    body('decision').isIn(['approved', 'rejected']).withMessage('Decision must be approved or rejected')
  ],
  validate,
  leaveRequestController.approveLeaveRequest
);

module.exports = router;
