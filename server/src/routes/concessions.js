const router = require('express').Router();
const { verifyToken } = require('../middleware/auth');
const { requireCoordinator, requireRole, ROLES } = require('../middleware/roleAuth');
const { grantConcession, getConcessions, revokeConcession, checkMyConcession } = require('../controllers/concessionController');

router.get('/my', verifyToken, requireRole(ROLES.STUDENT, ROLES.FACULTY), checkMyConcession);
router.get('/', verifyToken, requireCoordinator, getConcessions);
router.post('/', verifyToken, requireCoordinator, grantConcession);
router.delete('/:id', verifyToken, requireCoordinator, revokeConcession);

module.exports = router;