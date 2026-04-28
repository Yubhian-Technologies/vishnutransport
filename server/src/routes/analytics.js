const router = require('express').Router();
const { verifyToken } = require('../middleware/auth');
const { requireStaff } = require('../middleware/roleAuth');
const { getDashboardStats, getRouteStats, getRevenueReport } = require('../controllers/analyticsController');

router.get('/dashboard', verifyToken, requireStaff, getDashboardStats);
router.get('/routes', verifyToken, requireStaff, getRouteStats);
router.get('/revenue', verifyToken, requireStaff, getRevenueReport);

module.exports = router;
