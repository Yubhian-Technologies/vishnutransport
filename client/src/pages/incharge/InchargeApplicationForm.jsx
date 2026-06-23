import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Layout from '../../components/common/Layout';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { routesAPI, boardingPointsAPI, applicationsAPI, collegesAPI } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import { formatCurrency } from '../../utils/helpers';
import toast from 'react-hot-toast';
import { useDropzone } from 'react-dropzone';
import { Upload, X, Bus, ChevronRight, ChevronLeft, QrCode, Building2 } from 'lucide-react';

const schema = z.object({
  nameAsPerSSC: z.string().min(2, 'Full name required'),
  employeeId: z.string().min(1, 'Employee ID required'),
  gender: z.enum(['male', 'female', 'other'], { required_error: 'Gender required' }),
  bloodGroup: z.string().min(1, 'Blood group required'),
  branch: z.string().min(1, 'Branch / Department required'),
  collegeId: z.string().min(1, 'College required'),
  address: z.string().min(5, 'Address required'),
  studentPhone: z.string().min(10, 'Phone number required'),
  emergencyContact: z.string().min(10, 'Emergency contact required'),
  boardingPointId: z.string().min(1, 'Boarding point required'),
  utrNumber: z.string().optional(),
});

const STEPS = ['Personal Details', 'Boarding Point', 'Payment', 'Review & Submit'];

export default function InchargeApplicationForm() {
  const { userProfile, currentUser } = useAuth();
  const navigate = useNavigate();
  const [paymentFile, setPaymentFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState(0);

  const { data: myApps = [], isLoading: appsLoading } = useQuery({
    queryKey: ['my-applications'],
    queryFn: applicationsAPI.getMy,
  });

  const hasActiveApp = myApps.some(
    a => a.status !== 'rejected_l1' && a.status !== 'rejected_l2'
  );

  useEffect(() => {
    if (!appsLoading && hasActiveApp) {
      navigate('/incharge/status', { replace: true });
    }
  }, [appsLoading, hasActiveApp, navigate]);

  const { data: myRoutes = [], isLoading: routesLoading } = useQuery({
    queryKey: ['my-route', userProfile?.uid],
    queryFn: () => routesAPI.getAll({ inchargeId: userProfile.uid, includeOccupancy: 'true' }),
    enabled: !!userProfile?.uid,
  });
  const myRoute = myRoutes[0] || null;

  const { data: colleges = [] } = useQuery({
    queryKey: ['colleges'],
    queryFn: collegesAPI.getAll,
  });

  const { data: boardingPoints = [] } = useQuery({
    queryKey: ['boarding-points', myRoute?.id],
    queryFn: () => boardingPointsAPI.getByRoute(myRoute.id),
    enabled: !!myRoute?.id,
  });

  const { register, handleSubmit, watch, trigger, setValue, formState: { errors }, reset } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      nameAsPerSSC: '',
      employeeId: '',
      gender: '',
      bloodGroup: '',
      branch: '',
      collegeId: '',
      address: '',
      studentPhone: '',
      emergencyContact: '',
      boardingPointId: '',
      utrNumber: '',
    },
  });

  useEffect(() => {
    if (!userProfile || colleges.length === 0) return;

    // Match collegeId from profile, or fall back to name match
    let resolvedCollegeId = userProfile.collegeId || '';
    if (!resolvedCollegeId) {
      const profileCollegeName = (userProfile.collegeName || userProfile.college || '').toLowerCase().trim();
      if (profileCollegeName) {
        const match = colleges.find(c => (c.name || '').toLowerCase().trim() === profileCollegeName);
        if (match) resolvedCollegeId = match.id;
      }
    }

    reset(prev => ({
      ...prev,
      nameAsPerSSC: userProfile.nameAsPerSSC || userProfile.name || prev.nameAsPerSSC,
      gender: userProfile.gender || prev.gender,
      bloodGroup: userProfile.bloodGroup || prev.bloodGroup,
      branch: userProfile.branch || prev.branch,
      collegeId: resolvedCollegeId || prev.collegeId,
      address: userProfile.address || prev.address,
      studentPhone: userProfile.studentPhone || userProfile.phone || prev.studentPhone,
    }));
  }, [userProfile, colleges]);

  const watchedBPId = watch('boardingPointId');
  const watchedCollegeId = watch('collegeId');
  const selectedBP = boardingPoints.find(b => b.id === watchedBPId);
  const selectedCollege = colleges.find(c => c.id === watchedCollegeId);
  const fullFare = selectedBP?.fare != null ? selectedBP.fare : myRoute?.fare || 0;
  const inchargeFare = Math.round(fullFare * 0.5);

  const onDrop = useCallback((accepted) => {
    if (accepted[0]) setPaymentFile(accepted[0]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [], 'application/pdf': [] },
    maxSize: 5242880,
    maxFiles: 1,
  });

  const STEP_FIELDS = [
    ['nameAsPerSSC', 'employeeId', 'gender', 'bloodGroup', 'branch', 'collegeId', 'address', 'studentPhone', 'emergencyContact'],
    ['boardingPointId'],
    [],
  ];

  const nextStep = async () => {
    const valid = await trigger(STEP_FIELDS[step]);
    if (valid) setStep(s => Math.min(s + 1, STEPS.length - 1));
  };
  const prevStep = () => setStep(s => Math.max(s - 1, 0));

  const onSubmit = async (data) => {
    if (!paymentFile) {
      toast.error('Please upload payment proof');
      return;
    }
    if (!myRoute) {
      toast.error('No route assigned. Contact your coordinator.');
      return;
    }
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('name', data.nameAsPerSSC);
      formData.append('nameAsPerSSC', data.nameAsPerSSC);
      formData.append('email', currentUser.email);
      formData.append('regNo', data.employeeId);
      formData.append('gender', data.gender);
      formData.append('bloodGroup', data.bloodGroup);
      formData.append('branch', data.branch);
      formData.append('collegeId', data.collegeId);
      formData.append('college', selectedCollege?.name || '');
      formData.append('address', data.address);
      formData.append('studentPhone', data.studentPhone);
      formData.append('emergencyContact', data.emergencyContact);
      formData.append('routeId', myRoute.id);
      formData.append('boardingPointId', data.boardingPointId);
      formData.append('paymentType', 'full');
      if (data.utrNumber) formData.append('utrNumber', data.utrNumber);
      formData.append('paymentProof', paymentFile);

      await applicationsAPI.submit(formData);
      toast.success('Application submitted successfully!');
      navigate('/incharge/status');
    } catch (err) {
      toast.error(err?.response?.data?.error || err.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (appsLoading || routesLoading) return <LoadingSpinner fullScreen />;

  if (!myRoute) {
    return (
      <Layout title="Bus Application">
        <div className="card text-center py-16">
          <Bus size={48} className="text-gray-300 mx-auto mb-4" />
          <h3 className="text-gray-600">No Route Assigned</h3>
          <p className="text-sm text-gray-400 mt-2">Contact your Bus Coordinator to get assigned to a route before applying.</p>
        </div>
      </Layout>
    );
  }

  const values = {
    nameAsPerSSC: watch('nameAsPerSSC'),
    employeeId: watch('employeeId'),
    gender: watch('gender'),
    bloodGroup: watch('bloodGroup'),
    branch: watch('branch'),
    address: watch('address'),
    studentPhone: watch('studentPhone'),
    emergencyContact: watch('emergencyContact'),
    utrNumber: watch('utrNumber'),
  };

  return (
    <Layout title="Bus Pass Application">
      <div className="max-w-2xl mx-auto">
        {/* Stepper */}
        <div className="flex items-center justify-between mb-6">
          {STEPS.map((label, i) => (
            <div key={i} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                  ${i < step ? 'bg-primary-600 text-white' : i === step ? 'bg-primary-600 text-white ring-4 ring-primary-100' : 'bg-gray-200 text-gray-500'}`}>
                  {i < step ? '✓' : i + 1}
                </div>
                <span className={`text-xs mt-1 hidden sm:block ${i === step ? 'text-primary-600 font-medium' : 'text-gray-400'}`}>{label}</span>
              </div>
              {i < STEPS.length - 1 && <div className={`flex-1 h-0.5 mx-2 ${i < step ? 'bg-primary-600' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>

        {/* Assigned route banner */}
        <div className="mb-4 flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
          <Bus size={18} className="text-blue-500 flex-shrink-0" />
          <div>
            <p className="text-xs text-blue-500 font-medium">Your Assigned Route</p>
            <p className="text-sm font-semibold text-blue-800">{myRoute.routeName} — {myRoute.startPoint} → {myRoute.endPoint}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="card">

            {/* Step 0 — Personal Details */}
            {step === 0 && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-700 pb-1 border-b border-gray-100">Personal Details</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="label">Full Name *</label>
                    <input {...register('nameAsPerSSC')} placeholder="As per official records" className={`input ${errors.nameAsPerSSC ? 'input-error' : ''}`} />
                    {errors.nameAsPerSSC && <p className="text-red-500 text-xs mt-1">{errors.nameAsPerSSC.message}</p>}
                  </div>
                  <div>
                    <label className="label">Employee ID *</label>
                    <input {...register('employeeId')} placeholder="e.g. EMP001" className={`input ${errors.employeeId ? 'input-error' : ''}`} />
                    {errors.employeeId && <p className="text-red-500 text-xs mt-1">{errors.employeeId.message}</p>}
                  </div>
                  <div>
                    <label className="label">Branch / Department *</label>
                    <input {...register('branch')} placeholder="e.g. CSE, Administration" className={`input ${errors.branch ? 'input-error' : ''}`} />
                    {errors.branch && <p className="text-red-500 text-xs mt-1">{errors.branch.message}</p>}
                  </div>
                  <div className="sm:col-span-2">
                    <label className="label">College *</label>
                    <div className="select-wrapper">
                      <select {...register('collegeId')} className={`select ${errors.collegeId ? 'input-error' : ''}`}>
                        <option value="">Select College</option>
                        {colleges.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    {errors.collegeId && <p className="text-red-500 text-xs mt-1">{errors.collegeId.message}</p>}
                  </div>
                  <div>
                    <label className="label">Gender *</label>
                    <div className="select-wrapper">
                      <select {...register('gender')} className={`select ${errors.gender ? 'input-error' : ''}`}>
                        <option value="">Select Gender</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    {errors.gender && <p className="text-red-500 text-xs mt-1">{errors.gender.message}</p>}
                  </div>
                  <div>
                    <label className="label">Blood Group *</label>
                    <div className="select-wrapper">
                      <select {...register('bloodGroup')} className={`select ${errors.bloodGroup ? 'input-error' : ''}`}>
                        <option value="">Select</option>
                        {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(g => <option key={g} value={g}>{g}</option>)}
                      </select>
                    </div>
                    {errors.bloodGroup && <p className="text-red-500 text-xs mt-1">{errors.bloodGroup.message}</p>}
                  </div>
                  <div className="sm:col-span-2">
                    <label className="label">Address *</label>
                    <textarea {...register('address')} rows={2} placeholder="Residential address" className={`input resize-none ${errors.address ? 'input-error' : ''}`} />
                    {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address.message}</p>}
                  </div>
                  <div>
                    <label className="label">Phone Number *</label>
                    <input {...register('studentPhone')} type="tel" placeholder="10-digit number" className={`input ${errors.studentPhone ? 'input-error' : ''}`} />
                    {errors.studentPhone && <p className="text-red-500 text-xs mt-1">{errors.studentPhone.message}</p>}
                  </div>
                  <div>
                    <label className="label">Emergency Contact *</label>
                    <input {...register('emergencyContact')} type="tel" placeholder="10-digit number" className={`input ${errors.emergencyContact ? 'input-error' : ''}`} />
                    {errors.emergencyContact && <p className="text-red-500 text-xs mt-1">{errors.emergencyContact.message}</p>}
                  </div>
                </div>
              </div>
            )}

            {/* Step 1 — Boarding Point */}
            {step === 1 && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-700 pb-1 border-b border-gray-100">Select Boarding Point</h3>
                {boardingPoints.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6">No boarding points configured for this route.</p>
                ) : (
                  <div className="space-y-2">
                    {boardingPoints.map(bp => (
                      <label key={bp.id} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors
                        ${watchedBPId === bp.id ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'}`}>
                        <input type="radio" value={bp.id} {...register('boardingPointId')} className="mt-1 accent-primary-600" />
                        <div className="flex-1">
                          <p className="font-medium text-sm">{bp.name}</p>
                          {bp.timings && <p className="text-xs text-gray-400 mt-0.5">{bp.timings}</p>}
                          {bp.fare != null && (
                            <p className="text-xs text-gray-500 mt-0.5">
                              Full fare: {formatCurrency(bp.fare)} · Your fare (50%): {formatCurrency(Math.round(bp.fare * 0.5))}
                            </p>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                )}
                {errors.boardingPointId && <p className="text-red-500 text-xs mt-1">{errors.boardingPointId.message}</p>}

                {selectedBP && (
                  <div className="mt-4 p-4 rounded-xl bg-green-50 border border-green-100">
                    <p className="text-xs text-green-700 font-semibold mb-1">Fee Summary — 50% Incharge Concession Applied</p>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Full fare</span>
                      <span className="font-medium">{formatCurrency(fullFare)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Concession (50%)</span>
                      <span className="text-green-600 font-medium">- {formatCurrency(fullFare - inchargeFare)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-bold border-t border-green-200 mt-2 pt-2">
                      <span>Amount to Pay</span>
                      <span className="text-green-700">{formatCurrency(inchargeFare)}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 2 — Payment */}
            {step === 2 && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-700 pb-1 border-b border-gray-100">Payment Proof</h3>
                <div className="p-4 rounded-xl bg-blue-50 border border-blue-100 text-sm">
                  <p className="font-semibold text-blue-800 flex items-center gap-2">
                    <Building2 size={15} /> Pay {formatCurrency(inchargeFare)} and upload proof below.
                  </p>
                  <p className="text-blue-600 text-xs mt-1">Full fare: {formatCurrency(fullFare)} · 50% concession applied.</p>
                  {selectedCollege?.bankDetails && (
                    <div className="mt-3 pt-3 border-t border-blue-200 space-y-1">
                      <p><strong>Bank:</strong> {selectedCollege.bankDetails.bankName}</p>
                      <p><strong>A/C Name:</strong> {selectedCollege.bankDetails.accountName}</p>
                      <p><strong>A/C No:</strong> {selectedCollege.bankDetails.accountNumber}</p>
                      <p><strong>IFSC:</strong> {selectedCollege.bankDetails.ifscCode}</p>
                      {selectedCollege.bankDetails.upiId && <p><strong>UPI:</strong> {selectedCollege.bankDetails.upiId}</p>}
                    </div>
                  )}
                </div>

                {selectedCollege?.qrCodeUrl && (
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-700 mb-2 flex items-center justify-center gap-2">
                      <QrCode size={16} /> Scan QR Code to Pay
                    </p>
                    <img src={selectedCollege.qrCodeUrl} alt="Payment QR" className="w-48 h-48 object-contain mx-auto border rounded-lg" />
                  </div>
                )}

                <div>
                  <label className="label">UTR / Transaction Number</label>
                  <input {...register('utrNumber')} placeholder="e.g. UTR123456789012" className="input" />
                </div>
                <div>
                  <label className="label">Payment Proof *</label>
                  <div
                    {...getRootProps()}
                    className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors
                      ${isDragActive ? 'border-primary-500 bg-primary-50' : 'border-gray-300 hover:border-primary-400'}`}
                  >
                    <input {...getInputProps()} />
                    {paymentFile ? (
                      <div className="flex items-center justify-center gap-2">
                        <span className="text-sm text-gray-700 truncate max-w-xs">{paymentFile.name}</span>
                        <button type="button" onClick={(e) => { e.stopPropagation(); setPaymentFile(null); }} className="text-red-400 hover:text-red-600">
                          <X size={15} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <Upload size={28} className="mx-auto text-gray-400 mb-2" />
                        <p className="text-sm text-gray-600">Drop payment screenshot here or click to browse</p>
                        <p className="text-xs text-gray-400 mt-1">JPEG, PNG, PDF · max 5MB</p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Step 3 — Review */}
            {step === 3 && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-700 pb-1 border-b border-gray-100">Review & Submit</h3>
                <div className="space-y-3 text-sm">
                  {[
                    ['Name', values.nameAsPerSSC],
                    ['Employee ID', values.employeeId],
                    ['Branch / Dept.', values.branch],
                    ['College', selectedCollege?.name || '—'],
                    ['Gender', values.gender],
                    ['Blood Group', values.bloodGroup],
                    ['Phone', values.studentPhone],
                    ['Emergency Contact', values.emergencyContact],
                    ['Route', myRoute.routeName],
                    ['Boarding Point', selectedBP?.name || '—'],
                    ['Amount to Pay', formatCurrency(inchargeFare)],
                    ['Full Fare', formatCurrency(fullFare)],
                    ['Concession', '50% Staff (Bus Incharge)'],
                    ['Payment File', paymentFile?.name || '—'],
                    ['UTR', values.utrNumber || '—'],
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between py-1.5 border-b border-gray-50">
                      <span className="text-gray-500">{label}</span>
                      <span className="font-medium text-gray-800 text-right max-w-[60%] truncate">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="flex justify-between mt-4">
            {step > 0 ? (
              <button type="button" onClick={prevStep} className="btn-outline flex items-center gap-2">
                <ChevronLeft size={16} /> Back
              </button>
            ) : <div />}
            {step < STEPS.length - 1 ? (
              <button type="button" onClick={nextStep} className="btn-primary flex items-center gap-2">
                Next <ChevronRight size={16} />
              </button>
            ) : (
              <button type="submit" disabled={submitting || !paymentFile} className="btn-primary">
                {submitting ? 'Submitting…' : 'Submit Application'}
              </button>
            )}
          </div>
        </form>
      </div>
    </Layout>
  );
}
