const router = require('express').Router();
const { verifyToken } = require('../middleware/auth');
const { requireCoordinator, requireSuperAdmin } = require('../middleware/roleAuth');
const { upload } = require('../middleware/upload');
const {
  getAllColleges, getCollege, createCollege, updateCollege,
  uploadQRCode, updateBankDetails, deleteCollege,
} = require('../controllers/collegeController');

router.get('/', getAllColleges);
router.get('/:id', getCollege);
router.post('/', verifyToken, requireCoordinator, createCollege);
router.put('/:id', verifyToken, requireCoordinator, updateCollege);
router.post('/:id/qr-code', verifyToken, requireCoordinator, upload.single('qrCode'), uploadQRCode);
router.put('/:id/bank-details', verifyToken, requireCoordinator, updateBankDetails);
router.delete('/:id', verifyToken, requireSuperAdmin, deleteCollege);

module.exports = router;
