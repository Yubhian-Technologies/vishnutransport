const { auth, db } = require('../config/firebase');
const { ROLES } = require('../middleware/roleAuth');
const { uploadToCloud, deleteFromCloud } = require('../middleware/upload');

const getAllUsers = async (req, res) => {
  try {
    const { role, page = 1, limit = 20 } = req.query;
    let query = db.collection('users');
    if (role) query = query.where('role', '==', role);

    const snapshot = await query.get();
    const all = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    const start = (Number(page) - 1) * Number(limit);

    res.json({
      data: all.slice(start, start + Number(limit)),
      total: all.length,
      page: Number(page),
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

const getUser = async (req, res) => {
  try {
    const doc = await db.collection('users').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'User not found' });
    res.json({ id: doc.id, ...doc.data() });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
};

const createUser = async (req, res) => {
  try {
    const { email, password, name, role, phone, assignedRouteId } = req.body;
    if (!email || !password || !name || !role) {
      return res.status(400).json({ error: 'email, password, name, role are required' });
    }
    if (!Object.values(ROLES).includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }
    if (req.user.role === ROLES.BUS_COORDINATOR && role !== ROLES.GUEST) {
      return res.status(403).json({ error: 'Coordinators can only create guest users' });
    }

    const userRecord = await auth.createUser({ email, password, displayName: name });
    await auth.setCustomUserClaims(userRecord.uid, { role });

    const data = {
      uid: userRecord.uid,
      email,
      name,
      role,
      phone: phone || null,
      assignedRouteId: assignedRouteId || null,
      disabled: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await db.collection('users').doc(userRecord.uid).set(data);
    res.status(201).json({ id: userRecord.uid, ...data, message: 'User created successfully' });
  } catch (error) {
    if (error.code === 'auth/email-already-exists') {
      return res.status(409).json({ error: 'Email already in use' });
    }
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
};

const updateUser = async (req, res) => {
  try {
    const { name, phone, role, disabled, assignedRouteId } = req.body;
    const updates = { updatedAt: new Date().toISOString() };
    const authUpdates = {};

    if (name !== undefined) { updates.name = name; authUpdates.displayName = name; }
    if (phone !== undefined) updates.phone = phone;
    if (assignedRouteId !== undefined) updates.assignedRouteId = assignedRouteId;
    if (disabled !== undefined) {
      updates.disabled = disabled;
      authUpdates.disabled = disabled;
    }
    if (role !== undefined) {
      if (!Object.values(ROLES).includes(role)) {
        return res.status(400).json({ error: 'Invalid role' });
      }
      updates.role = role;
      try {
        await auth.setCustomUserClaims(req.params.id, { role });
      } catch (authErr) {
        if (authErr.code !== 'auth/user-not-found') throw authErr;
      }
    }

    await db.collection('users').doc(req.params.id).update(updates);
    if (Object.keys(authUpdates).length > 0) {
      try {
        await auth.updateUser(req.params.id, authUpdates);
      } catch (authErr) {
        if (authErr.code !== 'auth/user-not-found') throw authErr;
      }
    }

    res.json({ message: 'User updated successfully' });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
};

const deleteUser = async (req, res) => {
  try {
    if (req.params.id === req.user.uid) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }
    await auth.deleteUser(req.params.id);
    await db.collection('users').doc(req.params.id).delete();
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
};

const uploadProfilePhoto = async (req, res) => {
  try {
    const uid = req.user.uid;
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const userDoc = await db.collection('users').doc(uid).get();
    const existing = userDoc.data()?.photoPublicId;
    if (existing) await deleteFromCloud(existing);

    const result = await uploadToCloud(req.file, 'profile-photos');
    await db.collection('users').doc(uid).update({
      photoURL: result.url,
      photoPublicId: result.publicId,
      updatedAt: new Date().toISOString(),
    });

    res.json({ photoURL: result.url });
  } catch (error) {
    console.error('Upload profile photo error:', error);
    res.status(500).json({ error: 'Failed to upload photo' });
  }
};

const PROFILE_EDIT_LIMIT = 2;

const updateMyProfile = async (req, res) => {
  try {
    const uid = req.user.uid;
    const isStudent = req.user.role === ROLES.STUDENT;

    const userDoc = await db.collection('users').doc(uid).get();
    const editCount = userDoc.data()?.profileEditCount || 0;

    if (isStudent && editCount >= PROFILE_EDIT_LIMIT) {
      return res.status(403).json({ error: 'Profile is locked. Students can only edit their profile 2 times.' });
    }

    const {
      name, phone,
      nameAsPerSSC, gender, bloodGroup, academicYear, dateOfJoining, address,
      regNo, parentName, parentPhone, studentPhone, emergencyContact,
    } = req.body;

    const updates = {
      updatedAt: new Date().toISOString(),
      profileCompleted: true,
      ...(isStudent && { profileEditCount: editCount + 1 }),
    };

    if (name?.trim()) { updates.name = name.trim(); }
    if (phone !== undefined) updates.phone = phone || null;
    if (nameAsPerSSC !== undefined) updates.nameAsPerSSC = nameAsPerSSC || '';
    if (gender !== undefined) updates.gender = gender || '';
    if (bloodGroup !== undefined) updates.bloodGroup = bloodGroup || '';
    if (academicYear !== undefined) updates.academicYear = academicYear || '';
    if (dateOfJoining !== undefined) updates.dateOfJoining = dateOfJoining || '';
    if (address !== undefined) updates.address = address || '';
    if (regNo !== undefined) updates.regNo = regNo || '';
    if (parentName !== undefined) updates.parentName = parentName || '';
    if (parentPhone !== undefined) updates.parentPhone = parentPhone || '';
    if (studentPhone !== undefined) updates.studentPhone = studentPhone || '';
    if (emergencyContact !== undefined) updates.emergencyContact = emergencyContact || '';

    await db.collection('users').doc(uid).update(updates);
    if (updates.name) {
      try { await auth.updateUser(uid, { displayName: updates.name }); } catch (_) {}
    }

    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

const getGuestUsers = async (req, res) => {
  try {
    const snapshot = await db.collection('users').where('role', '==', ROLES.GUEST).get();
    const guests = snapshot.docs.map(doc => ({
      id: doc.id,
      name: doc.data().name,
      email: doc.data().email,
      disabled: doc.data().disabled || false,
      createdAt: doc.data().createdAt,
    }));
    res.json(guests);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch guest users' });
  }
};

const deleteGuestUser = async (req, res) => {
  try {
    const targetDoc = await db.collection('users').doc(req.params.id).get();
    if (!targetDoc.exists) return res.status(404).json({ error: 'User not found' });
    if (targetDoc.data().role !== ROLES.GUEST) {
      return res.status(403).json({ error: 'Can only delete guest users' });
    }
    await auth.deleteUser(req.params.id);
    await db.collection('users').doc(req.params.id).delete();
    res.json({ message: 'Guest user deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete guest user' });
  }
};

const getBusInchargeList = async (req, res) => {
  try {
    const snapshot = await db.collection('users')
      .where('role', '==', ROLES.BUS_INCHARGE)
      .where('disabled', '==', false)
      .get();
    const incharges = snapshot.docs.map(doc => ({
      id: doc.id,
      name: doc.data().name,
      email: doc.data().email,
      assignedRouteId: doc.data().assignedRouteId,
    }));
    res.json(incharges);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch incharges' });
  }
};

module.exports = { getAllUsers, getUser, createUser, updateUser, deleteUser, getBusInchargeList, updateMyProfile, uploadProfilePhoto, getGuestUsers, deleteGuestUser };
