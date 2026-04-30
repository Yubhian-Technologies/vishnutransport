const { db } = require('../config/firebase');
const { uploadToCloud, deleteFromCloud } = require('../middleware/upload');

const APPLICATION_STATUS = {
  PENDING_COORDINATOR: 'pending_coordinator',
  REJECTED_L1: 'rejected_l1',
  PENDING_ACCOUNTS: 'pending_accounts',
  REJECTED_L2: 'rejected_l2',
  APPROVED_FINAL: 'approved_final',
};

const submitApplication = async (req, res) => {
  try {
    const uid = req.user.uid;
    const existingSnap = await db.collection('applications')
      .where('studentId', '==', uid)
      .get();
    const hasActive = existingSnap.docs.some(d => {
      const s = d.data().status;
      return s !== APPLICATION_STATUS.REJECTED_L1 && s !== APPLICATION_STATUS.REJECTED_L2;
    });
    if (hasActive) {
      return res.status(409).json({ error: 'You already have an active application' });
    }

    const {
      name, email, regNo, aadhaar, branch, college, collegeId,
      routeId, boardingPointId, paymentType, partialPermissionId, concessionPermissionId,
    } = req.body;

    if (!name || !regNo || !collegeId || !routeId || !boardingPointId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const [routeDoc, collegeDoc, bpDoc] = await Promise.all([
      db.collection('busRoutes').doc(routeId).get(),
      db.collection('colleges').doc(collegeId).get(),
      db.collection('boardingPoints').doc(boardingPointId).get(),
    ]);

    if (!routeDoc.exists) return res.status(404).json({ error: 'Route not found' });
    if (!collegeDoc.exists) return res.status(404).json({ error: 'College not found' });
    if (!bpDoc.exists) return res.status(404).json({ error: 'Boarding point not found' });

    const route = routeDoc.data();
    const bp = bpDoc.data();
    const routeAppsSnap = await db.collection('applications')
      .where('routeId', '==', routeId)
      .get();
    const RELEASED = [APPLICATION_STATUS.REJECTED_L1, APPLICATION_STATUS.REJECTED_L2];
    const heldCount = routeAppsSnap.docs.filter(
      d => !RELEASED.includes(d.data().status)
    ).length;

    if (heldCount >= route.seatCapacity) {
      return res.status(409).json({ error: 'No seats available on this route' });
    }

    let paymentProofUrl = null;
    let paymentProofPublicId = null;
    if (req.file) {
      const result = await uploadToCloud(req.file, 'payment-proofs');
      paymentProofUrl = result.url;
      paymentProofPublicId = result.publicId;
    }

    const fullFare = bp.fare != null ? bp.fare : route.fare;
    const partialFareAmt = bp.partialFare != null ? bp.partialFare : route.partialFare;

    // Coordinator-granted partial payment takes priority
    let fare = paymentType === 'partial' && partialFareAmt ? partialFareAmt : fullFare;
    let dueAmount = 0;
    let dueStatus = null;
    let resolvedPermissionId = null;
    let resolvedConcessionId = null;
    let concessionReason = null;

    if (partialPermissionId) {
      const permDoc = await db.collection('partialPaymentPermissions').doc(partialPermissionId).get();
      if (permDoc.exists && !permDoc.data().used && permDoc.data().studentId === uid) {
        const perm = permDoc.data();
        fare = Math.round(fullFare * perm.percentage / 100);
        dueAmount = fullFare - fare;
        dueStatus = 'pending_upload';
        resolvedPermissionId = permDoc.id;
        await permDoc.ref.update({ used: true });
      }
    }

    if (concessionPermissionId) {
      const concDoc = await db.collection('concessionPermissions').doc(concessionPermissionId).get();
      if (concDoc.exists && !concDoc.data().used && concDoc.data().studentId === uid) {
        const conc = concDoc.data();
        fare = conc.concessionFee;
        dueAmount = 0;
        dueStatus = null;
        concessionReason = conc.reason;
        resolvedConcessionId = concDoc.id;
        await concDoc.ref.update({ used: true });
      }
    }

    const {
      nameAsPerSSC, gender, bloodGroup, academicYear, dateOfJoining, address,
      parentName, parentPhone, studentPhone, emergencyContact,
    } = req.body;

    const appData = {
      studentId: uid,
      applicantRole: req.user.role || 'student',
      name,
      nameAsPerSSC: nameAsPerSSC || '',
      gender: gender || '',
      bloodGroup: bloodGroup || '',
      academicYear: academicYear || '',
      dateOfJoining: dateOfJoining || '',
      address: address || '',
      email,
      regNo,
      aadhaar: aadhaar || '',
      branch: branch || '',
      parentName: parentName || '',
      parentPhone: parentPhone || '',
      studentPhone: studentPhone || '',
      emergencyContact: emergencyContact || '',
      college,
      collegeId,
      routeId,
      routeName: route.routeName,
      boardingPointId,
      boardingPointName: bp.name,
      paymentType: resolvedConcessionId ? 'concession' : resolvedPermissionId ? 'coordinator_partial' : (paymentType || 'full'),
      fare,
      fullFare,
      dueAmount,
      dueStatus,
      partialPermissionId: resolvedPermissionId,
      concessionPermissionId: resolvedConcessionId,
      concessionReason,
      duePaymentProofUrl: null,
      duePaymentPublicId: null,
      duePaymentSubmittedAt: null,
      dueRejectionReason: null,
      dueReviewedBy: null,
      dueReviewedAt: null,
      paymentProofUrl,
      paymentProofPublicId,
      status: APPLICATION_STATUS.PENDING_COORDINATOR,
      seatNumber: null,
      l1ReviewedBy: null,
      l1ReviewedAt: null,
      l1RejectionReason: null,
      l2ReviewedBy: null,
      l2ReviewedAt: null,
      l2RejectionReason: null,
      submittedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const docRef = await db.collection('applications').add(appData);
    res.status(201).json({ id: docRef.id, ...appData, message: 'Application submitted successfully' });
  } catch (error) {
    console.error('Submit application error:', error);
    res.status(500).json({ error: 'Failed to submit application' });
  }
};

const getMyApplication = async (req, res) => {
  try {
    const snapshot = await db.collection('applications')
      .where('studentId', '==', req.user.uid)
      .get();
    const apps = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .sort((a, b) => (b.submittedAt || '').localeCompare(a.submittedAt || ''))
      .slice(0, 5);
    res.json(apps);
  } catch (error) {
    console.error('Get my application error:', error);
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
};

const getAllApplications = async (req, res) => {
  try {
    const { status, collegeId, routeId, page = 1, limit = 20 } = req.query;
    let query = db.collection('applications');

    const role = req.user.role;
    if (role === 'bus_coordinator') {
      if (status) {
        query = query.where('status', '==', status);
      } else {
        query = query.where('status', 'in', [
          APPLICATION_STATUS.PENDING_COORDINATOR,
          APPLICATION_STATUS.REJECTED_L1,
          APPLICATION_STATUS.PENDING_ACCOUNTS,
          APPLICATION_STATUS.APPROVED_FINAL,
          APPLICATION_STATUS.REJECTED_L2,
        ]);
      }
    } else if (role === 'accounts') {
      if (status) {
        query = query.where('status', '==', status);
      } else {
        query = query.where('status', 'in', [
          APPLICATION_STATUS.PENDING_ACCOUNTS,
          APPLICATION_STATUS.REJECTED_L2,
          APPLICATION_STATUS.APPROVED_FINAL,
        ]);
      }
    } else if (role === 'bus_incharge') {
      const routeDoc = await db.collection('busRoutes')
        .where('inchargeId', '==', req.user.uid)
        .limit(1)
        .get();
      if (routeDoc.empty) return res.json({ data: [], total: 0 });
      query = query.where('routeId', '==', routeDoc.docs[0].id);
      if (status) query = query.where('status', '==', status);
    } else if (status) {
      query = query.where('status', '==', status);
    }

    const snapshot = await query.get();
    let all = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    if (collegeId) all = all.filter(a => a.collegeId === collegeId);
    if (routeId) all = all.filter(a => a.routeId === routeId);

    all = all.sort((a, b) => (b.submittedAt || '').localeCompare(a.submittedAt || ''));

    const startIndex = (Number(page) - 1) * Number(limit);
    const paginated = all.slice(startIndex, startIndex + Number(limit));

    res.json({ data: paginated, total: all.length, page: Number(page), limit: Number(limit) });
  } catch (error) {
    console.error('Get applications error:', error);
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
};

const getApplication = async (req, res) => {
  try {
    const doc = await db.collection('applications').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Application not found' });

    const app = { id: doc.id, ...doc.data() };
    const role = req.user.role;

    if (role === 'student' && app.studentId !== req.user.uid) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(app);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch application' });
  }
};

const coordinatorReview = async (req, res) => {
  try {
    const { action, reason } = req.body;
    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'Action must be approve or reject' });
    }

    const doc = await db.collection('applications').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Application not found' });

    const app = doc.data();
    if (app.status !== APPLICATION_STATUS.PENDING_COORDINATOR) {
      return res.status(409).json({ error: 'Application is not pending coordinator review' });
    }

    const updates = {
      l1ReviewedBy: req.user.uid,
      l1ReviewedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (action === 'approve') {
      updates.status = APPLICATION_STATUS.PENDING_ACCOUNTS;
    } else {
      if (!reason) return res.status(400).json({ error: 'Rejection reason is required' });
      updates.status = APPLICATION_STATUS.REJECTED_L1;
      updates.l1RejectionReason = reason;
    }

    await db.collection('applications').doc(req.params.id).update(updates);
    res.json({ message: `Application ${action}d successfully`, status: updates.status });
  } catch (error) {
    console.error('Coordinator review error:', error);
    res.status(500).json({ error: 'Failed to process review' });
  }
};

const accountsReview = async (req, res) => {
  try {
    const { action, reason } = req.body;
    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'Action must be approve or reject' });
    }

    const doc = await db.collection('applications').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Application not found' });

    const app = doc.data();
    if (app.status !== APPLICATION_STATUS.PENDING_ACCOUNTS) {
      return res.status(409).json({ error: 'Application is not pending accounts review' });
    }

    const updates = {
      l2ReviewedBy: req.user.uid,
      l2ReviewedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (action === 'approve') {
      const [routeAppsSnap, routeDoc] = await Promise.all([
        db.collection('applications').where('routeId', '==', app.routeId).get(),
        db.collection('busRoutes').doc(app.routeId).get(),
      ]);
      const confirmedDocs = routeAppsSnap.docs.filter(
        d => d.data().status === APPLICATION_STATUS.APPROVED_FINAL
      );
      const seatCapacity = routeDoc.data().seatCapacity;

      if (confirmedDocs.length >= seatCapacity) {
        return res.status(409).json({ error: 'No seats available on this route' });
      }

      updates.status = APPLICATION_STATUS.APPROVED_FINAL;
      updates.seatNumber = confirmedDocs.length + 1;
      // dueStatus stays as-is (either null for full payment or 'pending_upload' for coordinator partial)
    } else {
      if (!reason) return res.status(400).json({ error: 'Rejection reason is required' });
      updates.status = APPLICATION_STATUS.REJECTED_L2;
      updates.l2RejectionReason = reason;
    }

    await db.collection('applications').doc(req.params.id).update(updates);
    res.json({ message: `Application ${action}d successfully`, status: updates.status });
  } catch (error) {
    console.error('Accounts review error:', error);
    res.status(500).json({ error: 'Failed to process review' });
  }
};

const uploadPaymentProof = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Payment proof file is required' });

    const doc = await db.collection('applications').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Application not found' });

    const app = doc.data();
    if (app.studentId !== req.user.uid) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (app.paymentProofPublicId) {
      await deleteFromCloud(app.paymentProofPublicId);
    }

    const { url, publicId } = await uploadToCloud(req.file, 'payment-proofs');
    await db.collection('applications').doc(req.params.id).update({
      paymentProofUrl: url,
      paymentProofPublicId: publicId,
      updatedAt: new Date().toISOString(),
    });

    res.json({ message: 'Payment proof uploaded', url });
  } catch (error) {
    res.status(500).json({ error: 'Failed to upload payment proof' });
  }
};

// Student uploads due payment proof
const submitDuePayment = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Payment proof file is required' });

    const doc = await db.collection('applications').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Application not found' });

    const app = doc.data();
    if (app.studentId !== req.user.uid) return res.status(403).json({ error: 'Access denied' });
    if (!app.dueAmount || app.dueAmount <= 0) return res.status(400).json({ error: 'No due amount for this application' });
    if (app.status !== APPLICATION_STATUS.APPROVED_FINAL) {
      return res.status(400).json({ error: 'Application must be approved before submitting due payment' });
    }
    if (app.dueStatus !== 'pending_upload' && app.dueStatus !== 'rejected') {
      return res.status(409).json({ error: 'Due payment cannot be submitted in the current state' });
    }

    if (app.duePaymentPublicId) {
      await deleteFromCloud(app.duePaymentPublicId);
    }

    const { url, publicId } = await uploadToCloud(req.file, 'payment-proofs');
    await doc.ref.update({
      duePaymentProofUrl: url,
      duePaymentPublicId: publicId,
      duePaymentSubmittedAt: new Date().toISOString(),
      dueStatus: 'pending_verification',
      dueRejectionReason: null,
      updatedAt: new Date().toISOString(),
    });

    res.json({ message: 'Due payment submitted for verification' });
  } catch (error) {
    console.error('Submit due payment error:', error);
    res.status(500).json({ error: 'Failed to submit due payment' });
  }
};

// Accounts reviews due payment — rejection does NOT delete the application
const accountsDueReview = async (req, res) => {
  try {
    const { action, reason } = req.body;
    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'Action must be approve or reject' });
    }

    const doc = await db.collection('applications').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Application not found' });

    const app = doc.data();
    if (app.dueStatus !== 'pending_verification') {
      return res.status(409).json({ error: 'Due payment is not pending verification' });
    }

    const updates = {
      dueReviewedBy: req.user.uid,
      dueReviewedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (action === 'approve') {
      updates.dueStatus = 'verified';
    } else {
      if (!reason) return res.status(400).json({ error: 'Rejection reason is required' });
      updates.dueStatus = 'rejected';
      updates.dueRejectionReason = reason;
      // Application status stays approved_final — only dueStatus is rejected
    }

    await doc.ref.update(updates);
    res.json({ message: `Due payment ${action}d`, dueStatus: updates.dueStatus });
  } catch (error) {
    console.error('Accounts due review error:', error);
    res.status(500).json({ error: 'Failed to process due payment review' });
  }
};

module.exports = {
  submitApplication,
  getMyApplication,
  getAllApplications,
  getApplication,
  coordinatorReview,
  accountsReview,
  uploadPaymentProof,
  submitDuePayment,
  accountsDueReview,
  APPLICATION_STATUS,
};
