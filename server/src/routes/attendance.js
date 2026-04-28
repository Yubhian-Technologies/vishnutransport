const router = require('express').Router();
const { verifyToken } = require('../middleware/auth');
const { requireRole, requireCoordinator, requireBusIncharge, ROLES } = require('../middleware/roleAuth');
const { scanAttendance, getMyAttendance, getRouteAttendance, getAllAttendance } = require('../controllers/attendanceController');

router.post('/scan', verifyToken, requireBusIncharge, scanAttendance);
router.get('/my', verifyToken, requireRole(ROLES.STUDENT, ROLES.FACULTY), getMyAttendance);
router.get('/route', verifyToken, requireBusIncharge, getRouteAttendance);
router.get('/', verifyToken, requireCoordinator, getAllAttendance);

module.exports = router;
