const express = require('express');
const router = express.Router();
const packageController = require('../controllers/package.controller');
const { authMiddleware } = require('../middleware/auth.middleware');

router.post('/', authMiddleware(['ISP_ADMIN']), packageController.createPackage);
router.get('/', authMiddleware(), packageController.getPackages);
router.get('/:id', authMiddleware(), packageController.getPackage);
router.put('/:id', authMiddleware(['ISP_ADMIN']), packageController.updatePackage);
router.delete('/:id', authMiddleware(['ISP_ADMIN']), packageController.deletePackage);
router.put('/:id/toggle', authMiddleware(['ISP_ADMIN']), packageController.togglePackageStatus);

module.exports = router;