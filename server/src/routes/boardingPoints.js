const router = require('express').Router();
const { verifyToken } = require('../middleware/auth');
const { requireCoordinator } = require('../middleware/roleAuth');
const { getByRoute, create, update, remove } = require('../controllers/boardingPointController');

router.get('/route/:routeId', verifyToken, getByRoute);
router.post('/', verifyToken, requireCoordinator, create);
router.put('/:id', verifyToken, requireCoordinator, update);
router.delete('/:id', verifyToken, requireCoordinator, remove);

module.exports = router;
