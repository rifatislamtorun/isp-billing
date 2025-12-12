const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customer.controller');
const { authMiddleware } = require('../middleware/auth.middleware');

router.post('/', authMiddleware(['ISP_ADMIN', 'ACCOUNTANT']), customerController.createCustomer);
router.get('/', authMiddleware(), customerController.getCustomers);
router.get('/:id', authMiddleware(), customerController.getCustomer);
router.put('/:id', authMiddleware(['ISP_ADMIN', 'ACCOUNTANT']), customerController.updateCustomer);
router.put('/:id/status', authMiddleware(['ISP_ADMIN']), customerController.updateCustomerStatus);
router.post('/bulk-import', authMiddleware(['ISP_ADMIN']), customerController.bulkImportCustomers);
router.get('/:id/dashboard', authMiddleware(), customerController.getCustomerDashboard);

module.exports = router;