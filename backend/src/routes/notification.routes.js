const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification.controller');
const { authMiddleware } = require('../middleware/auth.middleware');

router.get('/', authMiddleware(), notificationController.getNotifications);
router.get('/unread', authMiddleware(), notificationController.getUnreadNotifications);
router.put('/:id/read', authMiddleware(), notificationController.markAsRead);
router.put('/read-all', authMiddleware(), notificationController.markAllAsRead);
router.delete('/:id', authMiddleware(), notificationController.deleteNotification);

module.exports = router;