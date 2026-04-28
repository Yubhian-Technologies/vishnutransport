const router = require('express').Router();
const { verifyToken } = require('../middleware/auth');
const { requireSuperAdmin, requireCoordinator } = require('../middleware/roleAuth');
const { upload } = require('../middleware/upload');
const {
  getAllUsers, getUser, createUser, updateUser, deleteUser, getBusInchargeList, updateMyProfile, uploadProfilePhoto,
} = require('../controllers/userController');

router.get('/', verifyToken, requireSuperAdmin, getAllUsers);
router.get('/incharges', verifyToken, requireCoordinator, getBusInchargeList);
router.put('/me', verifyToken, updateMyProfile);
router.post('/me/photo', verifyToken, upload.single('photo'), uploadProfilePhoto);
router.get('/:id', verifyToken, requireSuperAdmin, getUser);
router.post('/', verifyToken, requireSuperAdmin, createUser);
router.put('/:id', verifyToken, requireSuperAdmin, updateUser);
router.delete('/:id', verifyToken, requireSuperAdmin, deleteUser);

module.exports = router;
