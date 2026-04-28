const { db } = require('../config/firebase');

const grantPermission = async (req, res) => {
  try {
    const { studentEmail, percentage } = req.body;
    if (!studentEmail || percentage == null) {
      return res.status(400).json({ error: 'studentEmail and percentage are required' });
    }
    const pct = Number(percentage);
    if (isNaN(pct) || pct <= 0 || pct >= 100) {
      return res.status(400).json({ error: 'Percentage must be between 1 and 99' });
    }

    const userSnap = await db.collection('users').where('email', '==', studentEmail).limit(1).get();
    if (userSnap.empty) return res.status(404).json({ error: 'No user found with that email' });

    const userDoc = userSnap.docs[0];
    const user = userDoc.data();
    if (user.role !== 'student' && user.role !== 'faculty') {
      return res.status(400).json({ error: 'User must be a student or faculty' });
    }

    // Upsert: update existing unused permission, or create new
    const existingSnap = await db.collection('partialPaymentPermissions')
      .where('studentId', '==', userDoc.id)
      .where('used', '==', false)
      .limit(1)
      .get();

    if (!existingSnap.empty) {
      await existingSnap.docs[0].ref.update({
        percentage: pct,
        grantedBy: req.user.uid,
        grantedAt: new Date().toISOString(),
      });
      return res.json({ id: existingSnap.docs[0].id, message: 'Permission updated' });
    }

    const permData = {
      studentId: userDoc.id,
      studentEmail: user.email,
      studentName: user.name || '',
      percentage: pct,
      grantedBy: req.user.uid,
      grantedAt: new Date().toISOString(),
      used: false,
    };
    const docRef = await db.collection('partialPaymentPermissions').add(permData);
    res.status(201).json({ id: docRef.id, ...permData });
  } catch (error) {
    console.error('Grant permission error:', error);
    res.status(500).json({ error: 'Failed to grant permission' });
  }
};

const getPermissions = async (req, res) => {
  try {
    const snap = await db.collection('partialPaymentPermissions').get();
    const perms = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => b.grantedAt.localeCompare(a.grantedAt));
    res.json(perms);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch permissions' });
  }
};

const revokePermission = async (req, res) => {
  try {
    const doc = await db.collection('partialPaymentPermissions').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Permission not found' });
    if (doc.data().used) return res.status(409).json({ error: 'Cannot revoke a used permission' });
    await doc.ref.delete();
    res.json({ message: 'Permission revoked' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to revoke permission' });
  }
};

const checkMyPermission = async (req, res) => {
  try {
    const snap = await db.collection('partialPaymentPermissions')
      .where('studentId', '==', req.user.uid)
      .where('used', '==', false)
      .limit(1)
      .get();
    if (snap.empty) return res.json(null);
    res.json({ id: snap.docs[0].id, ...snap.docs[0].data() });
  } catch (error) {
    res.status(500).json({ error: 'Failed to check permission' });
  }
};

module.exports = { grantPermission, getPermissions, revokePermission, checkMyPermission };
