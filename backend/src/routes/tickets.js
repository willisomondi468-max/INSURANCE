const express = require('express');
const { body, param } = require('express-validator');
const router = express.Router();
const { validate } = require('../middleware/validate');
const { authenticate, requireAdmin, requireProvider, requireCustomer } = require('../middleware/auth');
const ticketController = require('../controllers/ticketController');

/**
 * Ticket Routes
 * Manages support ticket operations
 */

// GET /api/tickets
// Get all tickets (filtered by role)
router.get(
  '/',
  authenticate,
  ticketController.getAllTickets
);

// GET /api/tickets/:id
// Get ticket by ID
router.get(
  '/:id',
  authenticate,
  [param('id').isUUID().withMessage('Valid ticket ID is required')],
  validate,
  ticketController.getTicketById
);

// POST /api/tickets
// Create a new ticket (Customer)
router.post(
  '/',
  authenticate,
  requireCustomer,
  [
    body('subject').notEmpty().withMessage('Subject is required'),
    body('description').notEmpty().withMessage('Description is required'),
    body('priority').optional().isIn(['low', 'medium', 'high', 'urgent'])
  ],
  validate,
  ticketController.createTicket
);

// PUT /api/tickets/:id
// Update ticket (Admin/Provider)
router.put(
  '/:id',
  authenticate,
  requireProvider,
  [
    param('id').isUUID().withMessage('Valid ticket ID is required'),
    body('status').optional().isIn(['open', 'in_progress', 'resolved', 'escalated', 'closed']),
    body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
    body('assignedProviderId').optional().isUUID()
  ],
  validate,
  ticketController.updateTicket
);

// POST /api/tickets/:id/respond
// Respond to ticket (Any authenticated user)
router.post(
  '/:id/respond',
  authenticate,
  [
    param('id').isUUID().withMessage('Valid ticket ID is required'),
    body('response').notEmpty().withMessage('Response is required')
  ],
  validate,
  ticketController.respondToTicket
);

// POST /api/tickets/:id/escalate
// Escalate ticket to admin (Provider)
router.post(
  '/:id/escalate',
  authenticate,
  requireProvider,
  [
    param('id').isUUID().withMessage('Valid ticket ID is required'),
    body('reason').notEmpty().withMessage('Reason for escalation is required')
  ],
  validate,
  ticketController.escalateTicket
);

module.exports = router;
