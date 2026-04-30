const { db } = require('../config/firebase');

const grantConcession = async (req, res) => {
  try {
    const { studentEmail, routeId, boardingPointId, concessionFee, reason } = req.body;
    if (!studentEmail || !routeId || !boardingPointId || !concessionFee || !reason) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    if (Number(concessionFee) <= 0) {
      return res.status(400).json({ error: 'Concession fee must be greater than 0' });
    }

    const userSnap = await db.collection('users')
      .where('email', '==', studentEmail.trim().toLowerCase())
      .limit(1).get();
    if (userSnap.empty) {
      return res.status(404).json({ error: 'No user found with that email' });
    }
    const studentDoc = userSnap.docs[0];
    const student = studentDoc.data();

    const [routeDoc, bpDoc] = await Promise.all([
      db.collection('busRoutes').doc(routeId).get(),
      db.collection('boardingPoints').doc(boardingPointId).get(),
    ]);
    if (!routeDoc.exists) return res.status(404).json({ error: 'Route not found' });
    if (!bpDoc.exists) return res.status(404).json({ error: 'Boarding point not found' });

    const existing = await db.collection('concessionPermissions')
      .where('studentId', '==', studentDoc.id)
      .where('used', '==', false)
      .get();
    if (!existing.empty) {
      return res.status(409).json({ error: 'Student already has an active concession' });
    }

    const data = {
      studentId: studentDoc.id,
      studentEmail: studentEmail.trim().toLowerCase(),
      studentName: student.name || '',
      routeId,
      routeName: routeDoc.data().routeName,
      boardingPointId,
      boardingPointName: bpDoc.data().name,
      concessionFee: Number(concessionFee),
      reason: reason.trim(),
      grantedBy: req.user.uid,
      grantedAt: new Date().toISOString(),
      used: false,
    };

    const docRef = await db.collection('concessionPermissions').add(data);
    res.status(201).json({ id: docRef.id, ...data });
  } catch (error) {
    console.error('Grant concession error:', error);
    res.status(500).json({ error: 'Failed to grant concession' });
  }
};

const getConcessions = async (req, res) => {
  try {
    const snapshot = await db.collection('concessionPermissions')
      .orderBy('grantedAt', 'desc').get();
    res.json(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch concessions' });
  }
};

const revokeConcession = async (req, res) => {
  try {
    const doc = await db.collection('concessionPermissions').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Concession not found' });
    if (doc.data().used) return res.status(409).json({ error: 'Cannot revoke a used concession' });
    await doc.ref.delete();
    res.json({ message: 'Concession revoked' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to revoke concession' });
  }
};

const checkMyConcession = async (req, res) => {
  try {
    const email = req.user.email?.toLowerCase();
    const snap = await db.collection('concessionPermissions')
      .where('studentEmail', '==', email)
      .where('used', '==', false)
      .limit(1).get();
    if (snap.empty) return res.json(null);
    const doc = snap.docs[0];
    res.json({ id: doc.id, ...doc.data() });
  } catch (error) {
    res.status(500).json({ error: 'Failed to check concession' });
  }
};

module.exports = { grantConcession, getConcessions, revokeConcession, checkMyConcession };