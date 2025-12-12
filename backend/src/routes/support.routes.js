const express = require('express');
const router = express.Router();
const supportController = require('../controllers/support.controller');
const { authMiddleware } = require('../middleware/auth.middleware');

router.post('/tickets', authMiddleware(), supportController.createTicket);
router.get('/tickets', authMiddleware(), supportController.getTickets);
router.get('/tickets/:id', authMiddleware(), supportController.getTicket);
router.put('/tickets/:id', authMiddleware(), supportController.updateTicket);
router.post('/tickets/:id/reply', authMiddleware(), supportController.addReply);
router.put('/tickets/:id/assign', authMiddleware(['ISP_ADMIN', 'SUPPORT_STAFF']), supportController.assignTicket);
router.put('/tickets/:id/status', authMiddleware(), supportController.updateTicketStatus);
router.get('/tickets/customer/:customerId', authMiddleware(), supportController.getCustomerTickets);

module.exports = router;