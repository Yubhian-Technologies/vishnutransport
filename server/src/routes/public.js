const router = require('express').Router();
const { db } = require('../config/firebase');
const { verifyToken } = require('../middleware/auth');
const { requireCoordinator } = require('../middleware/roleAuth');

router.get('/config', async (req, res) => {
  try {
    const doc = await db.collection('config').doc('publicSettings').get();
    const data = doc.exists ? doc.data() : {};
    res.json({
      busSchedulePdfUrl: data.busSchedulePdfUrl || null,
      loconavEmail: data.loconavEmail || null,
      loconavPassword: data.loconavPassword || null,
      loconavPlayStore: data.loconavPlayStore || null,
      loconavAppStore: data.loconavAppStore || null,
    });
  } catch {
    res.json({ busSchedulePdfUrl: null, loconavEmail: null, loconavPassword: null, loconavPlayStore: null, loconavAppStore: null });
  }
});

router.patch('/config', verifyToken, requireCoordinator, async (req, res) => {
  const { busSchedulePdfUrl, loconavEmail, loconavPassword, loconavPlayStore, loconavAppStore } = req.body;
  await db.collection('config').doc('publicSettings').set(
    {
      busSchedulePdfUrl: busSchedulePdfUrl ?? null,
      loconavEmail: loconavEmail ?? null,
      loconavPassword: loconavPassword ?? null,
      loconavPlayStore: loconavPlayStore ?? null,
      loconavAppStore: loconavAppStore ?? null,
    },
    { merge: true }
  );
  res.json({ message: 'Updated' });
});

module.exports = router;
