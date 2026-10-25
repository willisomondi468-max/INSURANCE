const express = require('express');
const { body, param } = require('express-validator');
const router = express.Router();
const { validate } = require('../middleware/validate');
const {
  authenticate,
  requireSystemAdmin,
  requireCompanyAdmin,
  requireAdmin
} = require('../middleware/auth');
const adminController = require('../controllers/adminController');

/**
 * Administrator Portal Routes
 * Company-wide control center for authorized administrators
 */

/**
 * GET /api/admin/dashboard
 * Admin dashboard overview
 */
router.get(
  '/dashboard',
  authenticate,
  requireAdmin,
  adminController.getAdminDashboard
);

/**
 * GET /api/admin/users
 * List all users
 */
router.get(
  '/users',
  authenticate,
  requireAdmin,
  adminController.getAllUsers
);

/**
 * POST /api/admin/users
 * Create a new user
 */
router.post(
  '/users',
  authenticate,
  requireAdmin,
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('role').isIn(['customer', 'admin', 'provider', 'system_admin', 'company_admin', 'hr_manager', 'department_manager', 'supervisor', 'employee', 'senior_management']).withMessage('Invalid role'),
    body('phone').optional(),
    body('companyId').optional().isUUID().withMessage('Valid company ID is required')
  ],
  validate,
  adminController.createUser
);

/**
 * PUT /api/admin/users/:id
 * Update user role/status
 */
router.put(
  '/users/:id',
  authenticate,
  requireAdmin,
  [
    param('id').isUUID().withMessage('Valid user ID is required'),
    body('role').optional().isIn(['customer', 'admin', 'provider', 'system_admin', 'company_admin', 'hr_manager', 'department_manager', 'supervisor', 'employee', 'senior_management']),
    body('isActive').optional().isBoolean(),
    body('companyId').optional().isUUID()
  ],
  validate,
  adminController.updateUser
);

/**
 * GET /api/admin/audit-logs
 * Get audit logs
 */
router.get(
  '/audit-logs',
  authenticate,
  requireAdmin,
  adminController.getAuditLogs
);

/**
 * GET /api/admin/departments
 * Get all departments
 */
router.get(
  '/departments',
  authenticate,
  requireAdmin,
  adminController.getDepartments
);

module.exports = router;
