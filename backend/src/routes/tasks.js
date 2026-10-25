const express = require('express');
const { body, param } = require('express-validator');
const router = express.Router();
const { validate } = require('../middleware/validate');
const {
  authenticate,
  requireEmployee,
  requireSupervisor,
  requireDepartmentManager,
  requireHRManager
} = require('../middleware/auth');
const taskController = require('../controllers/taskController');

/**
 * Task Management Routes
 * CRUD, assignments, progress, submission, review
 */

/**
 * GET /api/tasks
 * List tasks with filters, search, pagination
 */
router.get(
  '/',
  authenticate,
  requireEmployee,
  taskController.getAllTasks
);

/**
 * POST /api/tasks
 * Create a new task
 */
router.post(
  '/',
  authenticate,
  requireDepartmentManager,
  [
    body('title').notEmpty().withMessage('Title is required'),
    body('taskCategory').isIn(['quotation_preparation', 'customer_registration', 'policy_application', 'policy_issuance', 'claims_review', 'claims_resolution', 'premium_reconciliation', 'customer_complaints', 'underwriting_assessment', 'renewals_processing', 'technical_support', 'administrative']).withMessage('Invalid task category'),
    body('priority').optional().isIn(['low', 'normal', 'high', 'urgent']),
    body('complexityLevel').optional().isInt({ min: 1, max: 5 }),
    body('estimatedEffortMinutes').optional().isInt({ min: 1 }),
    body('dueAt').optional().isISO8601()
  ],
  validate,
  taskController.createTask
);

/**
 * GET /api/tasks/:id
 * Get task by ID with assignments, reviews, updates, submissions
 */
router.get(
  '/:id',
  authenticate,
  requireEmployee,
  [param('id').isUUID().withMessage('Valid task ID is required')],
  validate,
  taskController.getTaskById
);

/**
 * PATCH /api/tasks/:id
 * Update task details
 */
router.patch(
  '/:id',
  authenticate,
  requireDepartmentManager,
  [param('id').isUUID().withMessage('Valid task ID is required')],
  validate,
  taskController.updateTask
);

/**
 * DELETE /api/tasks/:id
 * Delete a task (draft or cancelled only)
 */
router.delete(
  '/:id',
  authenticate,
  requireDepartmentManager,
  [param('id').isUUID().withMessage('Valid task ID is required')],
  validate,
  taskController.deleteTask
);

/**
 * POST /api/tasks/:id/assign
 * Assign employees to a task
 */
router.post(
  '/:id/assign',
  authenticate,
  requireDepartmentManager,
  [
    param('id').isUUID().withMessage('Valid task ID is required'),
    body('employeeIds').isArray({ min: 1 }).withMessage('employeeIds must be a non-empty array')
  ],
  validate,
  taskController.assignTask
);

/**
 * POST /api/tasks/:id/start
 * Start working on a task
 */
router.post(
  '/:id/start',
  authenticate,
  requireEmployee,
  [param('id').isUUID().withMessage('Valid task ID is required')],
  validate,
  taskController.startTask
);

/**
 * POST /api/tasks/:id/submit
 * Submit work for review
 */
router.post(
  '/:id/submit',
  authenticate,
  requireEmployee,
  [
    param('id').isUUID().withMessage('Valid task ID is required'),
    body('submissionNotes').optional()
  ],
  validate,
  taskController.submitTask
);

/**
 * POST /api/tasks/:id/review
 * Review a submitted task
 */
router.post(
  '/:id/review',
  authenticate,
  requireSupervisor,
  [
    param('id').isUUID().withMessage('Valid task ID is required'),
    body('reviewDecision').isIn(['approved', 'revision_requested', 'rejected']).withMessage('Invalid review decision'),
    body('qualityScore').optional().isInt({ min: 0, max: 100 }),
    body('feedback').optional()
  ],
  validate,
  taskController.reviewTask
);

/**
 * GET /api/tasks/summary
 * Task summary dashboard metrics
 */
router.get(
  '/summary',
  authenticate,
  requireEmployee,
  taskController.getTaskSummary
);

module.exports = router;
