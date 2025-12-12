const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard.controller');
const { authMiddleware } = require('../middleware/auth.middleware');

router.get('/stats', authMiddleware(), dashboardController.getDashboardStats);
router.get('/revenue', authMiddleware(), dashboardController.getRevenueData);
router.get('/customers-growth', authMiddleware(), dashboardController.getCustomersGrowth);
router.get('/network-status', authMiddleware(), dashboardController.getNetworkStatus);
router.get('/recent-activity', authMiddleware(), dashboardController.getRecentActivity);
router.get('/upcoming-invoices', authMiddleware(), dashboardController.getUpcomingInvoices);

module.exports = router;