const router = require('express').Router();
const { verifyToken } = require('../middleware/auth');
const { requireCoordinator, requireSuperAdmin } = require('../middleware/roleAuth');
const {
  getAllRoutes, getRoute, createRoute, updateRoute, deleteRoute, assignIncharge,
} = require('../controllers/routeController');

router.get('/', verifyToken, getAllRoutes);
router.get('/:id', verifyToken, getRoute);
router.post('/', verifyToken, requireCoordinator, createRoute);
router.put('/:id', verifyToken, requireCoordinator, updateRoute);
router.patch('/:id/assign-incharge', verifyToken, requireCoordinator, assignIncharge);
router.delete('/:id', verifyToken, requireCoordinator, deleteRoute);

module.exports = router;
