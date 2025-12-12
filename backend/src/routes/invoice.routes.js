const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoice.controller');
const { authMiddleware } = require('../middleware/auth.middleware');

router.post('/generate', authMiddleware(['ISP_ADMIN', 'ACCOUNTANT']), invoiceController.generateMonthlyInvoices);
router.get('/', authMiddleware(), invoiceController.getInvoices);
router.get('/:id', authMiddleware(), invoiceController.getInvoice);
router.put('/:id', authMiddleware(['ISP_ADMIN', 'ACCOUNTANT']), invoiceController.updateInvoice);
router.post('/:id/reminder', authMiddleware(['ISP_ADMIN', 'ACCOUNTANT']), invoiceController.sendInvoiceReminder);
router.post('/bulk-reminders', authMiddleware(['ISP_ADMIN']), invoiceController.bulkSendReminders);
router.get('/export/excel', authMiddleware(), invoiceController.exportInvoices);

module.exports = router;