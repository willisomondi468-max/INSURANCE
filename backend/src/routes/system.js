const express = require('express');
const { param, body } = require('express-validator');
const router = express.Router();
const { validate } = require('../middleware/validate');
const {
  authenticate,
  requireSystemAdmin
} = require('../middleware/auth');
const systemController = require('../controllers/systemController');

/**
 * System Admin Routes
 * Full system access - manage companies, view all data
 */

/**
 * GET /api/system/companies
 * List all companies (System Admin only)
 */
router.get(
  '/companies',
  authenticate,
  requireSystemAdmin,
  systemController.getAllCompanies
);

/**
 * POST /api/system/companies
 * Create a new company (System Admin only)
 */
router.post(
  '/companies',
  authenticate,
  requireSystemAdmin,
  [
    body('name').notEmpty().withMessage('Company name is required')
  ],
  validate,
  systemController.createCompany
);

/**
 * PATCH /api/system/companies/:id
 * Update company details (System Admin only)
 */
router.patch(
  '/companies/:id',
  authenticate,
  requireSystemAdmin,
  [param('id').isUUID().withMessage('Valid company ID is required')],
  validate,
  systemController.updateCompany
);

/**
 * GET /api/system/companies/:id/stats
 * Get company statistics (System Admin only)
 */
router.get(
  '/companies/:id/stats',
  authenticate,
  requireSystemAdmin,
  [param('id').isUUID().withMessage('Valid company ID is required')],
  validate,
  systemController.getCompanyStats
);

/**
 * POST /api/system/companies/:id/admin
 * Create a company admin for a specific company (System Admin only)
 */
router.post(
  '/companies/:id/admin',
  authenticate,
  requireSystemAdmin,
  [
    param('id').isUUID().withMessage('Valid company ID is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('phone').optional(),
    body('fullName').optional()
  ],
  validate,
  systemController.createCompanyAdmin
);

/**
 * GET /api/system/companies/:id/employees
 * View all employees in a company (System Admin only)
 */
router.get(
  '/companies/:id/employees',
  authenticate,
  requireSystemAdmin,
  [param('id').isUUID().withMessage('Valid company ID is required')],
  validate,
  systemController.getCompanyEmployees
);

/**
 * POST /api/system/access/:companyId
 * System admin accesses a company (impersonation token)
 */
router.post(
  '/access/:companyId',
  authenticate,
  requireSystemAdmin,
  [param('companyId').isUUID().withMessage('Valid company ID is required')],
  validate,
  systemController.accessCompany
);

/**
 * GET /api/system/dashboard
 * System-wide dashboard overview (System Admin only)
 */
router.get(
  '/dashboard',
  authenticate,
  requireSystemAdmin,
  systemController.getSystemDashboard
);

module.exports = router;
