const router = require('express').Router();
const { verifyToken } = require('../middleware/auth');
const { register, getProfile, updateProfile } = require('../controllers/authController');
const { auth, db } = require('../config/firebase');

// One-time bootstrap — creates first Super Admin only if none exists
router.post('/bootstrap', async (req, res) => {
  try {
    const existing = await db.collection('users')
      .where('role', '==', 'super_admin')
      .limit(1)
      .get();

    if (!existing.empty) {
      return res.status(403).json({ error: 'Super Admin already exists. Use Admin panel to manage users.' });
    }

    const { email, password, name } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'email, password and name are required' });
    }

    const userRecord = await auth.createUser({ email, password, displayName: name });
    await auth.setCustomUserClaims(userRecord.uid, { role: 'super_admin' });

    await db.collection('users').doc(userRecord.uid).set({
      uid: userRecord.uid,
      email,
      name,
      role: 'super_admin',
      phone: null,
      disabled: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    res.status(201).json({ message: 'Super Admin created successfully. You can now log in.', email });
  } catch (error) {
    if (error.code === 'auth/email-already-exists') {
      return res.status(409).json({ error: 'Email already in use' });
    }
    console.error('Bootstrap error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/register', register);
router.get('/profile', verifyToken, getProfile);
router.patch('/profile', verifyToken, updateProfile);

module.exports = router;
