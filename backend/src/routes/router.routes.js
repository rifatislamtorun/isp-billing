const express = require('express');
const router = express.Router();
const routerController = require('../controllers/router.controller');
const { authMiddleware } = require('../middleware/auth.middleware');

router.post('/', authMiddleware(['ISP_ADMIN', 'NETWORK_ENGINEER']), routerController.createRouter);
router.get('/', authMiddleware(), routerController.getRouters);
router.get('/:id', authMiddleware(), routerController.getRouter);
router.put('/:id', authMiddleware(['ISP_ADMIN', 'NETWORK_ENGINEER']), routerController.updateRouter);
router.delete('/:id', authMiddleware(['ISP_ADMIN']), routerController.deleteRouter);
router.get('/:id/bandwidth', authMiddleware(), routerController.getBandwidthStats);
router.post('/:id/status', authMiddleware(['NETWORK_ENGINEER']), routerController.updateRouterStatus);

module.exports = router;