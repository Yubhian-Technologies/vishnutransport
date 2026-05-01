const router = require('express').Router();
const { verifyToken } = require('../middleware/auth');
const { requireStaffOrGuest } = require('../middleware/roleAuth');
const { getDashboardStats, getRouteStats, getRevenueReport } = require('../controllers/analyticsController');

router.get('/dashboard', verifyToken, requireStaffOrGuest, getDashboardStats);
router.get('/routes', verifyToken, requireStaffOrGuest, getRouteStats);
router.get('/revenue', verifyToken, requireStaffOrGuest, getRevenueReport);

module.exports = router;
