const router = require('express').Router();
const { verifyToken } = require('../middleware/auth');
const { requireRole, requireCoordinator, requireBusIncharge, requireStaffOrGuest, ROLES } = require('../middleware/roleAuth');
const { scanAttendance, getMyAttendance, getRouteAttendance, getAllAttendance, markManual } = require('../controllers/attendanceController');

router.post('/scan', verifyToken, requireBusIncharge, scanAttendance);
router.post('/manual', verifyToken, requireBusIncharge, markManual);
router.get('/my', verifyToken, requireRole(ROLES.STUDENT, ROLES.FACULTY), getMyAttendance);
router.get('/route', verifyToken, requireBusIncharge, getRouteAttendance);
router.get('/', verifyToken, requireStaffOrGuest, getAllAttendance);

module.exports = router;
