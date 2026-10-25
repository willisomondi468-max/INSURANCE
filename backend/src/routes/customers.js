const express = require('express');
const { body, param } = require('express-validator');
const router = express.Router();
const { validate } = require('../middleware/validate');
const { authenticate, requireAdmin, requireCustomer } = require('../middleware/auth');
const customerController = require('../controllers/customerController');

/**
 * Customer Routes
 * Handles customer profile management
 */

// GET /api/customers/profile
// Get current customer profile
router.get(
  '/profile',
  authenticate,
  requireCustomer,
  customerController.getProfile
);

// PUT /api/customers/profile
// Update current customer profile
router.put(
  '/profile',
  authenticate,
  requireCustomer,
  [
    body('fullName').optional(),
    body('phone').optional(),
    body('address').optional(),
    body('dateOfBirth').optional()
  ],
  validate,
  customerController.updateProfile
);

// GET /api/customers
// Get all customers (Admin only)
router.get(
  '/',
  authenticate,
  requireAdmin,
  customerController.getAllCustomers
);

// GET /api/customers/:id
// Get customer by ID (Admin only)
router.get(
  '/:id',
  authenticate,
  requireAdmin,
  [param('id').isUUID().withMessage('Valid customer ID is required')],
  validate,
  customerController.getCustomerById
);

// PUT /api/customers/:id/status
// Update customer status (Admin only)
router.put(
  '/:id/status',
  authenticate,
  requireAdmin,
  [
    param('id').isUUID().withMessage('Valid customer ID is required'),
    body('isActive').isBoolean().withMessage('isActive must be a boolean')
  ],
  validate,
  customerController.updateCustomerStatus
);

// GET /api/customers/dashboard
// Get customer dashboard data
router.get(
  '/dashboard',
  authenticate,
  requireCustomer,
  customerController.getCustomerDashboard
);

module.exports = router;
