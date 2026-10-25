const express = require('express');
const { param } = require('express-validator');
const router = express.Router();
const { validate } = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const notificationController = require('../controllers/notificationController');

/**
 * Notification Routes
 */

/**
 * GET /api/notifications
 * Get user notifications
 */
router.get(
  '/',
  authenticate,
  notificationController.getNotifications
);

/**
 * GET /api/notifications/unread-count
 * Get unread notification count
 */
router.get(
  '/unread-count',
  authenticate,
  notificationController.getUnreadCount
);

/**
 * PUT /api/notifications/:id/read
 * Mark notification as read
 */
router.put(
  '/:id/read',
  authenticate,
  [param('id').isUUID().withMessage('Valid notification ID is required')],
  validate,
  notificationController.markAsRead
);

/**
 * PUT /api/notifications/read-all
 * Mark all notifications as read
 */
router.put(
  '/read-all',
  authenticate,
  notificationController.markAllAsRead
);

module.exports = router;
