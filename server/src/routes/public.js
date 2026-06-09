const router = require('express').Router();
const { db } = require('../config/firebase');
const { verifyToken } = require('../middleware/auth');
const { requireCoordinator } = require('../middleware/roleAuth');

router.get('/config', async (req, res) => {
  try {
    const doc = await db.collection('config').doc('publicSettings').get();
    const data = doc.exists ? doc.data() : {};
    res.json({ busSchedulePdfUrl: data.busSchedulePdfUrl || null });
  } catch {
    res.json({ busSchedulePdfUrl: null });
  }
});

router.patch('/config', verifyToken, requireCoordinator, async (req, res) => {
  const { busSchedulePdfUrl } = req.body;
  await db.collection('config').doc('publicSettings').set(
    { busSchedulePdfUrl: busSchedulePdfUrl || null },
    { merge: true }
  );
  res.json({ message: 'Updated' });
});

module.exports = router;
