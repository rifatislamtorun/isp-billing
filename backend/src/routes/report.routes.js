const express = require('express');
const router = express.Router();
const reportController = require('../controllers/report.controller');
const { authMiddleware } = require('../middleware/auth.middleware');

router.get('/financial', authMiddleware(), reportController.generateFinancialReport);
router.get('/customer', authMiddleware(), reportController.generateCustomerReport);
router.get('/network', authMiddleware(['ISP_ADMIN', 'NETWORK_ENGINEER']), reportController.generateNetworkReport);
router.get('/collection', authMiddleware(['ISP_ADMIN', 'ACCOUNTANT']), reportController.generateCollectionReport);
router.get('/export/pdf/:type', authMiddleware(), reportController.exportPDF);
router.get('/export/excel/:type', authMiddleware(), reportController.exportExcel);

module.exports = router;