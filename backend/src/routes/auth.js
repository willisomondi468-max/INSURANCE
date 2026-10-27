const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const { validate } = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const authController = require('../controllers/authController');

/**
 * Auth Routes
 * Handles user authentication and registration
 */

// POST /api/auth/register
// Register a new customer
router.post(
  '/register',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('phone').notEmpty().withMessage('Phone number is required'),
    body('fullName').notEmpty().withMessage('Full name is required'),
    body('idNumber').notEmpty().withMessage('ID number is required')
  ],
  validate,
  authController.register
);

// POST /api/auth/login
// Login user
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required')
  ],
  validate,
  authController.login
);

// POST /api/auth/refresh-token
// Refresh access token
router.post(
  '/refresh-token',
  [
    body('refreshToken').notEmpty().withMessage('Refresh token is required')
  ],
  validate,
  authController.refreshToken
);

// POST /api/auth/logout
// Logout user
router.post(
  '/logout',
  authenticate,
  authController.logout
);

// POST /api/auth/forgot-password
// Request password reset
router.post(
  '/forgot-password',
  [
    body('email').isEmail().withMessage('Valid email is required')
  ],
  validate,
  authController.forgotPassword
);

// POST /api/auth/reset-password
// Reset password using reset token
router.post(
  '/reset-password',
  [
    body('token').notEmpty().withMessage('Reset token is required'),
    body('newPassword').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
  ],
  validate,
  authController.resetPassword
);

// POST /api/auth/check-existence
// Check if customer details exist in database
router.post(
  '/check-existence',
  [
    body('idNumber').optional(),
    body('phone').optional()
  ],
  validate,
  authController.checkExistence
);

// POST /api/auth/confirm-details
// Confirm customer details
router.post(
  '/confirm-details',
  [
    body('customerId').notEmpty().withMessage('Customer ID is required'),
    body('isConfirmed').isBoolean().withMessage('Confirmation status is required')
  ],
  validate,
  authController.confirmDetails
);

module.exports = router;
