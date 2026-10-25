const express = require('express');
const { body, param } = require('express-validator');
const router = express.Router();
const { validate } = require('../middleware/validate');
const { authenticate, requireAdmin, requireProvider, requireCustomer } = require('../middleware/auth');
const policyController = require('../controllers/policyController');

/**
 * Policy Routes
 * Manages insurance policy operations
 */

// GET /api/policies
// Get all policies (filtered by role)
router.get(
  '/',
  authenticate,
  policyController.getAllPolicies
);

// GET /api/policies/:id
// Get policy by ID
router.get(
  '/:id',
  authenticate,
  [param('id').isUUID().withMessage('Valid policy ID is required')],
  validate,
  policyController.getPolicyById
);

// POST /api/policies
// Apply for a policy (Customer)
router.post(
  '/',
  authenticate,
  requireCustomer,
  [
    body('planId').isUUID().withMessage('Valid plan ID is required'),
    body('documents').optional().isArray()
  ],
  validate,
  policyController.applyForPolicy
);

// PUT /api/policies/:id/status
// Update policy status (Admin/Provider)
router.put(
  '/:id/status',
  authenticate,
  requireAdmin,
  [
    param('id').isUUID().withMessage('Valid policy ID is required'),
    body('status').isIn(['pending', 'approved', 'active', 'cancelled', 'expired'])
      .withMessage('Invalid status')
  ],
  validate,
  policyController.updatePolicyStatus
);

// DELETE /api/policies/:id
// Delete policy (Admin only)
router.delete(
  '/:id',
  authenticate,
  requireAdmin,
  [param('id').isUUID().withMessage('Valid policy ID is required')],
  validate,
  policyController.deletePolicy
);

module.exports = router;
