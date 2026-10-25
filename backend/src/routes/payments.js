const express = require('express');
const { body, param } = require('express-validator');
const router = express.Router();
const { validate } = require('../middleware/validate');
const { authenticate, requireAdmin, requireCustomer } = require('../middleware/auth');
const paymentController = require('../controllers/paymentController');

/**
 * Payment Routes
 * Manages payment operations
 */

// GET /api/payments
// Get all payments (filtered by role)
router.get(
  '/',
  authenticate,
  paymentController.getAllPayments
);

// GET /api/payments/:id
// Get payment by ID
router.get(
  '/:id',
  authenticate,
  [param('id').isUUID().withMessage('Valid payment ID is required')],
  validate,
  paymentController.getPaymentById
);

// POST /api/payments
// Process payment (Customer)
router.post(
  '/',
  authenticate,
  requireCustomer,
  [
    body('policyId').isUUID().withMessage('Valid policy ID is required'),
    body('amount').isNumeric().withMessage('Amount must be a number'),
    body('paymentMethod').notEmpty().withMessage('Payment method is required')
  ],
  validate,
  paymentController.processPayment
);

// GET /api/payments/history
// Get payment history (Customer)
router.get(
  '/history',
  authenticate,
  requireCustomer,
  paymentController.getPaymentHistory
);

module.exports = router;
