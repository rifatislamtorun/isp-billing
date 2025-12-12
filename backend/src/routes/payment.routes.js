const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');
const { authMiddleware } = require('../middleware/auth.middleware');

router.post('/', authMiddleware(['ISP_ADMIN', 'ACCOUNTANT']), paymentController.createPayment);
router.get('/', authMiddleware(), paymentController.getPayments);
router.get('/stats', authMiddleware(), paymentController.getPaymentStats);
router.post('/online', authMiddleware(), paymentController.processOnlinePayment);
router.get('/:id/receipt', authMiddleware(), paymentController.generateReceipt);
router.post('/:id/refund', authMiddleware(['ISP_ADMIN']), paymentController.refundPayment);

module.exports = router;