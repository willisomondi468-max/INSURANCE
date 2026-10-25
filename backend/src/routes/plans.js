const express = require('express');
const { body, param } = require('express-validator');
const router = express.Router();
const { validate } = require('../middleware/validate');
const { authenticate, requireAdmin, requireCustomer } = require('../middleware/auth');
const planController = require('../controllers/planController');

/**
 * Insurance Plans Routes
 * Manages insurance plan CRUD operations
 */

// GET /api/plans
// Get all insurance plans
router.get(
  '/',
  authenticate,
  planController.getAllPlans
);

// GET /api/plans/:id
// Get plan by ID
router.get(
  '/:id',
  authenticate,
  [param('id').isUUID().withMessage('Valid plan ID is required')],
  validate,
  planController.getPlanById
);

// POST /api/plans
// Create insurance plan (Admin only)
router.post(
  '/',
  authenticate,
  requireAdmin,
  [
    body('name').notEmpty().withMessage('Plan name is required'),
    body('description').optional(),
    body('coverageAmount').isNumeric().withMessage('Coverage amount must be a number'),
    body('premiumAmount').isNumeric().withMessage('Premium amount must be a number'),
    body('durationMonths').isInt({ min: 1 }).withMessage('Duration must be at least 1 month'),
    body('features').optional().isArray().withMessage('Features must be an array'),
    body('isActive').optional().isBoolean()
  ],
  validate,
  planController.createPlan
);

// PUT /api/plans/:id
// Update insurance plan (Admin only)
router.put(
  '/:id',
  authenticate,
  requireAdmin,
  [
    param('id').isUUID().withMessage('Valid plan ID is required'),
    body('name').optional(),
    body('description').optional(),
    body('coverageAmount').optional().isNumeric(),
    body('premiumAmount').optional().isNumeric(),
    body('durationMonths').optional().isInt({ min: 1 }),
    body('features').optional().isArray(),
    body('isActive').optional().isBoolean()
  ],
  validate,
  planController.updatePlan
);

// DELETE /api/plans/:id
// Delete insurance plan (Admin only)
router.delete(
  '/:id',
  authenticate,
  requireAdmin,
  [param('id').isUUID().withMessage('Valid plan ID is required')],
  validate,
  planController.deletePlan
);

module.exports = router;
