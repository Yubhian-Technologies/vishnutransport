const { db } = require('../config/firebase');
const { uploadToCloud, deleteFromCloud } = require('../middleware/upload');

const getAllColleges = async (req, res) => {
  try {
    const snapshot = await db.collection('colleges').orderBy('name').get();
    const colleges = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(colleges);
  } catch (error) {
    console.error('Get colleges error:', error);
    res.status(500).json({ error: 'Failed to fetch colleges' });
  }
};

const getCollege = async (req, res) => {
  try {
    const doc = await db.collection('colleges').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'College not found' });
    res.json({ id: doc.id, ...doc.data() });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch college' });
  }
};

const createCollege = async (req, res) => {
  try {
    const { name, address, city, state, contactEmail, contactPhone } = req.body;
    if (!name) return res.status(400).json({ error: 'College name is required' });

    const data = {
      name,
      address: address || '',
      city: city || '',
      state: state || '',
      contactEmail: contactEmail || '',
      contactPhone: contactPhone || '',
      qrCodeUrl: null,
      bankDetails: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const docRef = await db.collection('colleges').add(data);
    res.status(201).json({ id: docRef.id, ...data });
  } catch (error) {
    console.error('Create college error:', error);
    res.status(500).json({ error: 'Failed to create college' });
  }
};

const updateCollege = async (req, res) => {
  try {
    const { name, address, city, state, contactEmail, contactPhone, bankDetails } = req.body;
    const updates = { updatedAt: new Date().toISOString() };

    if (name !== undefined) updates.name = name;
    if (address !== undefined) updates.address = address;
    if (city !== undefined) updates.city = city;
    if (state !== undefined) updates.state = state;
    if (contactEmail !== undefined) updates.contactEmail = contactEmail;
    if (contactPhone !== undefined) updates.contactPhone = contactPhone;
    if (bankDetails !== undefined) updates.bankDetails = bankDetails;

    await db.collection('colleges').doc(req.params.id).update(updates);
    res.json({ message: 'College updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update college' });
  }
};

const uploadQRCode = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'QR code file is required' });

    const { url, publicId } = await uploadToCloud(req.file, 'qr-codes');

    // Delete old QR from Cloudinary if one existed
    const existing = await db.collection('colleges').doc(req.params.id).get();
    if (existing.data()?.qrCodePublicId) {
      await deleteFromCloud(existing.data().qrCodePublicId);
    }

    await db.collection('colleges').doc(req.params.id).update({
      qrCodeUrl: url,
      qrCodePublicId: publicId,
      updatedAt: new Date().toISOString(),
    });

    res.json({ message: 'QR code uploaded successfully', url });
  } catch (error) {
    console.error('Upload QR error:', error);
    res.status(500).json({ error: 'Failed to upload QR code' });
  }
};

const updateBankDetails = async (req, res) => {
  try {
    const { bankName, accountName, accountNumber, ifscCode, upiId, branch } = req.body;
    const bankDetails = { bankName, accountName, accountNumber, ifscCode, upiId, branch };

    await db.collection('colleges').doc(req.params.id).update({
      bankDetails,
      updatedAt: new Date().toISOString(),
    });

    res.json({ message: 'Bank details updated successfully', bankDetails });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update bank details' });
  }
};

const deleteCollege = async (req, res) => {
  try {
    await db.collection('colleges').doc(req.params.id).delete();
    res.json({ message: 'College deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete college' });
  }
};

module.exports = {
  getAllColleges,
  getCollege,
  createCollege,
  updateCollege,
  uploadQRCode,
  updateBankDetails,
  deleteCollege,
};
