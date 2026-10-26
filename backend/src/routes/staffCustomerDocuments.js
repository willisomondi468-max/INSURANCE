const express = require('express');
const { param, body } = require('express-validator');
const router = express.Router();
const { validate } = require('../middleware/validate');
const {
  authenticate,
  requireEmployee,
  requireDepartmentManager
} = require('../middleware/auth');
const customerDocumentController = require('../controllers/customerDocumentController');
const staffClaimsController = require('../controllers/staffClaimsController');

/**
 * Staff Customer Document Routes
 */

/**
 * GET /api/staff/customers/:id/documents
 * List customer documents
 */
router.get(
  '/:id/documents',
  authenticate,
  requireEmployee,
  [param('id').isUUID().withMessage('Valid customer ID is required')],
  validate,
  customerDocumentController.getCustomerDocuments
);

/**
 * POST /api/staff/customers/:id/documents
 * Upload customer document
 */
router.post(
  '/:id/documents',
  authenticate,
  requireDepartmentManager,
  [
    param('id').isUUID().withMessage('Valid customer ID is required'),
    body('documentType').notEmpty().withMessage('Document type is required'),
    body('documentName').notEmpty().withMessage('Document name is required'),
    body('filePath').notEmpty().withMessage('File path is required')
  ],
  validate,
  customerDocumentController.uploadCustomerDocument
);

/**
 * PUT /api/staff/customers/:id/documents/:docId/verify
 * Verify customer document
 */
router.put(
  '/:id/documents/:docId/verify',
  authenticate,
  requireDepartmentManager,
  [
    param('id').isUUID().withMessage('Valid customer ID is required'),
    param('docId').isUUID().withMessage('Valid document ID is required'),
    body('isVerified').isBoolean().withMessage('isVerified must be a boolean')
  ],
  validate,
  customerDocumentController.verifyCustomerDocument
);

/**
 * Staff Customer Claim Routes
 */

/**
 * GET /api/staff/customers/:id/claims
 * List customer claims
 */
router.get(
  '/:id/claims',
  authenticate,
  requireEmployee,
  [param('id').isUUID().withMessage('Valid customer ID is required')],
  validate,
  staffClaimsController.getCustomerClaims
);

/**
 * POST /api/staff/customers/:id/claims
 * Create customer claim
 */
router.post(
  '/:id/claims',
  authenticate,
  requireDepartmentManager,
  [
    param('id').isUUID().withMessage('Valid customer ID is required'),
    body('claimType').notEmpty().withMessage('Claim type is required'),
    body('amountClaimed').isNumeric().withMessage('Amount claimed must be a number')
  ],
  validate,
  staffClaimsController.createCustomerClaim
);

/**
 * PUT /api/staff/claims/:id/status
 * Update claim status
 */
router.put(
  '/claims/:id/status',
  authenticate,
  requireDepartmentManager,
  [
    param('id').isUUID().withMessage('Valid claim ID is required'),
    body('status').isIn(['pending', 'under_review', 'approved', 'rejected', 'paid']).withMessage('Invalid status')
  ],
  validate,
  staffClaimsController.updateClaimStatus
);

module.exports = router;
