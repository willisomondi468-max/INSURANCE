const express = require('express');
const { body, param } = require('express-validator');
const router = express.Router();
const { validate } = require('../middleware/validate');
const { authenticate, requireAdmin, requireProvider, requireCustomer } = require('../middleware/auth');
const claimController = require('../controllers/claimController');

/**
 * Claim Routes
 * Manages insurance claim operations
 */

// GET /api/claims
// Get all claims (filtered by role)
router.get(
  '/',
  authenticate,
  claimController.getAllClaims
);

// GET /api/claims/:id
// Get claim by ID
router.get(
  '/:id',
  authenticate,
  [param('id').isUUID().withMessage('Valid claim ID is required')],
  validate,
  claimController.getClaimById
);

// POST /api/claims
// Submit a claim (Customer)
router.post(
  '/',
  authenticate,
  requireCustomer,
  [
    body('policyId').isUUID().withMessage('Valid policy ID is required'),
    body('claimType').notEmpty().withMessage('Claim type is required'),
    body('amountClaimed').isNumeric().withMessage('Amount claimed must be a number'),
    body('description').notEmpty().withMessage('Description is required'),
    body('documents').optional().isArray()
  ],
  validate,
  claimController.submitClaim
);

// PUT /api/claims/:id/status
// Update claim status (Admin/Provider)
router.put(
  '/:id/status',
  authenticate,
  requireAdmin,
  [
    param('id').isUUID().withMessage('Valid claim ID is required'),
    body('status').isIn(['pending', 'under_review', 'approved', 'rejected', 'paid'])
      .withMessage('Invalid status'),
    body('notes').optional()
  ],
  validate,
  claimController.updateClaimStatus
);

// DELETE /api/claims/:id
// Delete claim (Admin only)
router.delete(
  '/:id',
  authenticate,
  requireAdmin,
  [param('id').isUUID().withMessage('Valid claim ID is required')],
  validate,
  claimController.deleteClaim
);

module.exports = router;
