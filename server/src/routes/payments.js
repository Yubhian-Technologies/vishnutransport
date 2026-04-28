const router = require('express').Router();
const { verifyToken } = require('../middleware/auth');
const { requireAccounts, requireCoordinator } = require('../middleware/roleAuth');
const { db } = require('../config/firebase');

router.get('/', verifyToken, requireAccounts, async (req, res) => {
  try {
    const { status, routeId, collegeId } = req.query;
    let query = db.collection('applications');
    if (status) query = query.where('status', '==', status);
    if (routeId) query = query.where('routeId', '==', routeId);
    if (collegeId) query = query.where('collegeId', '==', collegeId);

    const snapshot = await query.orderBy('submittedAt', 'desc').get();
    const records = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(a => a.paymentProofUrl)
      .map(a => ({
        id: a.id,
        studentName: a.name,
        regNo: a.regNo,
        routeName: a.routeName,
        college: a.college,
        fare: a.fare,
        paymentType: a.paymentType,
        paymentProofUrl: a.paymentProofUrl,
        status: a.status,
        submittedAt: a.submittedAt,
      }));

    res.json(records);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch payment records' });
  }
});

router.get('/summary', verifyToken, requireAccounts, async (req, res) => {
  try {
    const snapshot = await db.collection('applications')
      .where('status', '==', 'approved_final')
      .get();
    const apps = snapshot.docs.map(d => d.data());
    const totalRevenue = apps.reduce((s, a) => s + (Number(a.fare) || 0), 0);
    res.json({ totalRevenue, totalPaid: apps.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch payment summary' });
  }
});

module.exports = router;
