const express = require('express');
const { body, param } = require('express-validator');
const router = express.Router();
const { validate } = require('../middleware/validate');
const {
  authenticate,
  requireEmployee,
  requireDepartmentManager,
  requireHRManager,
  requireCompanyAdmin
} = require('../middleware/auth');
const staffCustomerController = require('../controllers/staffCustomerController');

/**
 * Staff Customer Management Routes
 * Authorized staff can register, search, and manage customers
 */

/**
 * GET /api/staff/customers
 * List customers with search, pagination, filters
 */
router.get(
  '/',
  authenticate,
  requireEmployee,
  staffCustomerController.getStaffCustomers
);

/**
 * GET /api/staff/customers/search?q=
 * Quick customer search
 */
router.get(
  '/search',
  authenticate,
  requireEmployee,
  staffCustomerController.searchCustomers
);

/**
 * GET /api/staff/customers/:id/profile
 * Get customer profile for staff
 */
router.get(
  '/:id/profile',
  authenticate,
  requireEmployee,
  [param('id').isUUID().withMessage('Valid customer ID is required')],
  validate,
  staffCustomerController.getStaffCustomerProfile
);

/**
 * GET /api/staff/customers/:id/history
 * Get customer work history (tasks, claims, audit logs)
 */
router.get(
  '/:id/history',
  authenticate,
  requireEmployee,
  [param('id').isUUID().withMessage('Valid customer ID is required')],
  validate,
  staffCustomerController.getCustomerWorkHistory
);

/**
 * POST /api/staff/customers
 * Create a new customer (staff)
 */
router.post(
  '/',
  authenticate,
  requireDepartmentManager,
  [
    body('fullName').notEmpty().withMessage('Full name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('phone').notEmpty().withMessage('Phone number is required'),
    body('idNumber').notEmpty().withMessage('ID number is required'),
    body('password').optional().isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
  ],
  validate,
  staffCustomerController.createStaffCustomer
);

module.exports = router;
