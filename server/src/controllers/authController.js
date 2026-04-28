const { auth, db } = require('../config/firebase');
const { ROLES } = require('../middleware/roleAuth');

const register = async (req, res) => {
  try {
    const { email, password, name, role = ROLES.STUDENT, phone, collegeId, collegeName } = req.body;

    const allowedPublicRoles = [ROLES.STUDENT, ROLES.FACULTY];
    if (!allowedPublicRoles.includes(role)) {
      const callerRole = req.user?.role;
      if (callerRole !== ROLES.SUPER_ADMIN && callerRole !== ROLES.BUS_COORDINATOR) {
        return res.status(403).json({ error: 'Cannot self-register with this role' });
      }
    }

    const userRecord = await auth.createUser({ email, password, displayName: name });

    await db.collection('users').doc(userRecord.uid).set({
      uid: userRecord.uid,
      email,
      name,
      role,
      phone: phone || null,
      collegeId: collegeId || null,
      collegeName: collegeName || null,
      disabled: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await auth.setCustomUserClaims(userRecord.uid, { role });

    res.status(201).json({
      message: 'User created successfully',
      uid: userRecord.uid,
      role,
    });
  } catch (error) {
    if (error.code === 'auth/email-already-exists') {
      return res.status(409).json({ error: 'Email already in use' });
    }
    if (error.code === 'auth/invalid-password') {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    console.error('Register error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
};

const getProfile = async (req, res) => {
  try {
    const userDoc = await db.collection('users').doc(req.user.uid).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }
    const data = userDoc.data();
    const { ...profile } = data;
    res.json(profile);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { name, phone } = req.body;
    const updates = { updatedAt: new Date().toISOString() };
    if (name) updates.name = name;
    if (phone !== undefined) updates.phone = phone;

    await db.collection('users').doc(req.user.uid).update(updates);
    if (name) await auth.updateUser(req.user.uid, { displayName: name });

    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

module.exports = { register, getProfile, updateProfile };
