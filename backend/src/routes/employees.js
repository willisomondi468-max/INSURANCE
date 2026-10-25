const express = require('express');
const { body, param } = require('express-validator');
const router = express.Router();
const { validate } = require('../middleware/validate');
const {
  authenticate,
  requireAdmin,
  requireHRManager,
  requireDepartmentManager,
  requireSupervisor,
  requireEmployee,
  requireCompanyScope
} = require('../middleware/auth');
const employeeController = require('../controllers/employeeController');

/**
 * Employee Management Routes
 * Handles workforce employee records
 */

/**
 * GET /api/employees
 * List employees with search, filter, pagination
 * Access: HR Manager, Department Manager, Super Admin, Senior Management
 */
router.get(
  '/',
  authenticate,
  requireCompanyScope,
  requireHRManager,
  employeeController.getAllEmployees
);

/**
 * GET /api/employees/:id
 * Get employee by ID
 * Access: HR Manager, Department Manager, Supervisor, Employee (self), Super Admin
 */
router.get(
  '/:id',
  authenticate,
  requireCompanyScope,
  requireDepartmentManager,
  employeeController.getEmployeeById
);

/**
 * POST /api/employees
 * Create a new employee
 * Access: HR Manager, Super Admin
 */
router.post(
  '/',
  authenticate,
  requireCompanyScope,
  requireHRManager,
  [
    body('employeeNumber').notEmpty().withMessage('Employee number is required'),
    body('jobTitle').optional(),
    body('employmentStatus').optional().isIn(['active', 'on_leave', 'suspended', 'inactive', 'former']),
    body('contractedHours').optional().isInt({ min: 1 }),
    body('monthlyPerformanceTarget').optional().isInt({ min: 0 }),
    body('companyId').optional().isUUID().withMessage('Valid company ID is required')
  ],
  validate,
  employeeController.createEmployee
);

/**
 * PATCH /api/employees/:id
 * Update employee details
 * Access: HR Manager, Super Admin, Department Manager
 */
router.patch(
  '/:id',
  authenticate,
  requireCompanyScope,
  requireHRManager,
  [
    param('id').isUUID().withMessage('Valid employee ID is required'),
    body('departmentId').optional(),
    body('supervisorId').optional(),
    body('jobTitle').optional(),
    body('employmentStatus').optional().isIn(['active', 'on_leave', 'suspended', 'inactive', 'former']),
    body('contractedHours').optional().isInt({ min: 1 }),
    body('monthlyPerformanceTarget').optional().isInt({ min: 0 })
  ],
  validate,
  employeeController.updateEmployee
);

/**
 * DELETE /api/employees/:id
 * Deactivate or delete employee
 * Access: HR Manager, Super Admin
 */
router.delete(
  '/:id',
  authenticate,
  requireCompanyScope,
  requireHRManager,
  [param('id').isUUID().withMessage('Valid employee ID is required')],
  validate,
  employeeController.deactivateEmployee
);

/**
 * GET /api/employees/:id/performance
 * Get employee performance metrics
 * Access: HR Manager, Department Manager, Supervisor, Employee (self)
 */
router.get(
  '/:id/performance',
  authenticate,
  requireCompanyScope,
  requireSupervisor,
  employeeController.getEmployeePerformance
);

module.exports = router;
