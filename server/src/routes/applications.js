const router = require('express').Router();
const { verifyToken } = require('../middleware/auth');
const { requireCoordinator, requireAccounts, requireRole, ROLES } = require('../middleware/roleAuth');
const { upload } = require('../middleware/upload');
const {
  submitApplication,
  getMyApplication,
  getAllApplications,
  getApplication,
  coordinatorReview,
  accountsReview,
  uploadPaymentProof,
  submitDuePayment,
  accountsDueReview,
} = require('../controllers/applicationController');

router.post(
  '/',
  verifyToken,
  requireRole(ROLES.STUDENT, ROLES.FACULTY),
  upload.single('paymentProof'),
  submitApplication
);

router.get('/my', verifyToken, requireRole(ROLES.STUDENT, ROLES.FACULTY), getMyApplication);
router.get('/', verifyToken, getAllApplications);
router.get('/:id', verifyToken, getApplication);

router.patch('/:id/coordinator-review', verifyToken, requireCoordinator, coordinatorReview);
router.patch('/:id/accounts-review', verifyToken, requireAccounts, accountsReview);

router.post(
  '/:id/payment-proof',
  verifyToken,
  requireRole(ROLES.STUDENT, ROLES.FACULTY),
  upload.single('paymentProof'),
  uploadPaymentProof
);

router.post(
  '/:id/due-payment',
  verifyToken,
  requireRole(ROLES.STUDENT, ROLES.FACULTY),
  upload.single('paymentProof'),
  submitDuePayment
);

router.patch('/:id/due-review', verifyToken, requireAccounts, accountsDueReview);

module.exports = router;
