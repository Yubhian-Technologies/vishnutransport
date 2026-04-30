const { db } = require('../config/firebase');

// Determine period based on server time
const getPeriod = () => {
  const hour = new Date().getHours();
  return hour < 12 ? 'morning' : 'evening';
};

// POST /api/attendance/scan  (bus_incharge only)
const scanAttendance = async (req, res) => {
  try {
    const { qrData } = req.body;
    if (!qrData) return res.status(400).json({ error: 'QR data is required' });

    let parsed;
    try {
      parsed = JSON.parse(qrData);
    } catch {
      return res.status(400).json({ error: 'Invalid QR code format' });
    }

    const { uid: studentId, date: qrDate } = parsed;
    if (!studentId || !qrDate) {
      return res.status(400).json({ error: 'QR code missing required fields' });
    }

    const today = new Date().toISOString().split('T')[0];
    if (qrDate !== today) {
      return res.status(400).json({ error: `QR code is for ${qrDate}, not today (${today})` });
    }

    // Verify the incharge is assigned to the student's route
    const inchargeId = req.user.uid;
    const routeSnap = await db.collection('busRoutes').where('inchargeId', '==', inchargeId).get();
    if (routeSnap.empty) {
      return res.status(403).json({ error: 'No route assigned to you' });
    }
    const routeDoc = routeSnap.docs[0];
    const route = { id: routeDoc.id, ...routeDoc.data() };

    // Verify the student has an approved application on this route
    const appSnap = await db.collection('applications')
      .where('studentId', '==', studentId)
      .where('status', '==', 'approved_final')
      .get();

    const studentApp = appSnap.docs.find(d => d.data().routeId === route.id);
    if (!studentApp) {
      return res.status(404).json({ error: 'Student not found on this route' });
    }

    const appData = studentApp.data();
    const period = getPeriod();

    // Prevent duplicate scan for same student + date + period
    const dupSnap = await db.collection('attendance')
      .where('studentId', '==', studentId)
      .where('date', '==', today)
      .where('period', '==', period)
      .get();

    if (!dupSnap.empty) {
      return res.status(409).json({
        error: `Attendance already marked for ${period} today`,
        student: { name: appData.name, regNo: appData.regNo },
      });
    }

    const record = {
      studentId,
      studentName: appData.name,
      regNo: appData.regNo,
      branch: appData.branch || '',
      college: appData.college || '',
      routeId: route.id,
      routeName: route.routeName,
      boardingPointName: appData.boardingPointName || '',
      seatNumber: appData.seatNumber || null,
      scannedBy: inchargeId,
      period,
      date: today,
      timestamp: new Date().toISOString(),
    };

    const docRef = await db.collection('attendance').add(record);
    res.status(201).json({ id: docRef.id, ...record });
  } catch (error) {
    console.error('Scan attendance error:', error);
    res.status(500).json({ error: 'Failed to record attendance' });
  }
};

// GET /api/attendance/my  (student/faculty)
const getMyAttendance = async (req, res) => {
  try {
    const snap = await db.collection('attendance')
      .where('studentId', '==', req.user.uid)
      .get();

    const records = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp));

    res.json(records);
  } catch (error) {
    console.error('Get my attendance error:', error);
    res.status(500).json({ error: 'Failed to fetch attendance' });
  }
};

// GET /api/attendance/route  (bus_incharge)
const getRouteAttendance = async (req, res) => {
  try {
    const { date } = req.query;
    const inchargeId = req.user.uid;

    const routeSnap = await db.collection('busRoutes').where('inchargeId', '==', inchargeId).get();
    if (routeSnap.empty) return res.json({ records: [], routeName: null });

    const routeId = routeSnap.docs[0].id;
    const routeName = routeSnap.docs[0].data().routeName;

    let snap = await db.collection('attendance').where('routeId', '==', routeId).get();
    let records = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    if (date) records = records.filter(r => r.date === date);
    records.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

    res.json({ records, routeName });
  } catch (error) {
    console.error('Get route attendance error:', error);
    res.status(500).json({ error: 'Failed to fetch attendance' });
  }
};

// GET /api/attendance  (coordinator/super_admin)
const getAllAttendance = async (req, res) => {
  try {
    const { date, routeId } = req.query;

    let snap = await db.collection('attendance').get();
    let records = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    if (date) records = records.filter(r => r.date === date);
    if (routeId) records = records.filter(r => r.routeId === routeId);
    records.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

    res.json(records);
  } catch (error) {
    console.error('Get all attendance error:', error);
    res.status(500).json({ error: 'Failed to fetch attendance' });
  }
};

// POST /api/attendance/manual  (bus_incharge only)
const markManual = async (req, res) => {
  try {
    const { studentId, period } = req.body;
    if (!studentId || !period) return res.status(400).json({ error: 'studentId and period are required' });
    if (!['morning', 'evening'].includes(period)) return res.status(400).json({ error: 'Invalid period' });

    const today = new Date().toISOString().split('T')[0];
    const inchargeId = req.user.uid;

    const routeSnap = await db.collection('busRoutes').where('inchargeId', '==', inchargeId).get();
    if (routeSnap.empty) return res.status(403).json({ error: 'No route assigned to you' });
    const routeDoc = routeSnap.docs[0];
    const route = { id: routeDoc.id, ...routeDoc.data() };

    const appSnap = await db.collection('applications')
      .where('studentId', '==', studentId)
      .where('status', '==', 'approved_final')
      .get();
    const studentApp = appSnap.docs.find(d => d.data().routeId === route.id);
    if (!studentApp) return res.status(404).json({ error: 'Student not found on this route' });

    const appData = studentApp.data();

    const dupSnap = await db.collection('attendance')
      .where('studentId', '==', studentId)
      .where('date', '==', today)
      .where('period', '==', period)
      .get();
    if (!dupSnap.empty) {
      return res.status(409).json({ error: `Attendance already marked for ${period} today` });
    }

    const record = {
      studentId,
      studentName: appData.name,
      regNo: appData.regNo,
      branch: appData.branch || '',
      college: appData.college || '',
      routeId: route.id,
      routeName: route.routeName,
      boardingPointName: appData.boardingPointName || '',
      seatNumber: appData.seatNumber || null,
      scannedBy: inchargeId,
      markedManually: true,
      period,
      date: today,
      timestamp: new Date().toISOString(),
    };

    const docRef = await db.collection('attendance').add(record);
    res.status(201).json({ id: docRef.id, ...record });
  } catch (error) {
    console.error('Manual attendance error:', error);
    res.status(500).json({ error: 'Failed to record attendance' });
  }
};

module.exports = { scanAttendance, getMyAttendance, getRouteAttendance, getAllAttendance, markManual };
