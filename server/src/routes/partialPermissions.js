const router = require('express').Router();
const { verifyToken } = require('../middleware/auth');
const { requireCoordinator, requireRole, ROLES } = require('../middleware/roleAuth');
const {
  grantPermission, getPermissions, revokePermission, checkMyPermission,
} = require('../controllers/partialPermissionController');

router.get('/my', verifyToken, requireRole(ROLES.STUDENT, ROLES.FACULTY), checkMyPermission);
router.get('/', verifyToken, requireCoordinator, getPermissions);
router.post('/', verifyToken, requireCoordinator, grantPermission);
router.delete('/:id', verifyToken, requireCoordinator, revokePermission);

module.exports = router;
