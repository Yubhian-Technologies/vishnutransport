import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Layout from '../../components/common/Layout';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { collegesAPI, routesAPI, boardingPointsAPI, applicationsAPI, partialPermissionsAPI } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import { formatCurrency } from '../../utils/helpers';
import toast from 'react-hot-toast';
import { useDropzone } from 'react-dropzone';
import { Upload, X, ChevronRight, ChevronLeft, QrCode, Building2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

const schema = z.object({
  nameAsPerSSC: z.string().min(2, 'Name as per SSC required'),
  gender: z.enum(['male', 'female', 'other'], { required_error: 'Gender required' }),
  bloodGroup: z.string().min(1, 'Blood group required'),
  academicYear: z.string().optional(),
  dateOfJoining: z.string().optional(),
  address: z.string().min(5, 'Address required'),
  regNo: z.string().optional(),
  aadhaar: z.string().optional(),
  branch: z.string().min(1, 'Branch required'),
  parentName: z.string().min(2, 'Parent/Guardian name required'),
  parentPhone: z.string().min(10, 'Parent/Guardian phone required'),
  studentPhone: z.string().min(10, 'Student phone required'),
  emergencyContact: z.string().min(10, 'Emergency contact required'),
  collegeId: z.string().min(1, 'College required'),
  routeId: z.string().min(1, 'Route required'),
  boardingPointId: z.string().min(1, 'Boarding point required'),
  paymentType: z.enum(['full', 'partial', 'coordinator_partial']),
});

const STEPS = ['Personal Details', 'Select Route', 'Payment', 'Review & Submit'];

export default function ApplicationForm() {
  const { userProfile, currentUser, role } = useAuth();
  const navigate = useNavigate();
  const base = role === 'faculty' ? '/faculty' : '/student';
  const [step, setStep] = useState(0);
  const [paymentFile, setPaymentFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const profileDefaults = {
    nameAsPerSSC: userProfile?.nameAsPerSSC || userProfile?.name || '',
    gender: userProfile?.gender || '',
    bloodGroup: userProfile?.bloodGroup || '',
    academicYear: userProfile?.academicYear || '',
    address: userProfile?.address || '',
    regNo: '',
    aadhaar: '',
    dateOfJoining: '',
    branch: '',
    parentName: userProfile?.parentName || '',
    parentPhone: userProfile?.parentPhone || '',
    studentPhone: userProfile?.studentPhone || userProfile?.phone || '',
    emergencyContact: userProfile?.emergencyContact || '',
    collegeId: userProfile?.collegeId || '',
    routeId: '',
    boardingPointId: '',
    paymentType: 'full',
  };

  const { register, handleSubmit, watch, control, formState: { errors }, getValues, reset, trigger, clearErrors } = useForm({
    resolver: zodResolver(schema),
    defaultValues: profileDefaults,
  });

  useEffect(() => {
    if (userProfile) {
      reset(prev => ({
        ...prev,
        nameAsPerSSC: userProfile.nameAsPerSSC || userProfile.name || prev.nameAsPerSSC,
        gender: userProfile.gender || prev.gender,
        bloodGroup: userProfile.bloodGroup || prev.bloodGroup,
        academicYear: userProfile.academicYear || prev.academicYear,
        address: userProfile.address || prev.address,
        parentName: userProfile.parentName || prev.parentName,
        parentPhone: userProfile.parentPhone || prev.parentPhone,
        studentPhone: userProfile.studentPhone || userProfile.phone || prev.studentPhone,
        emergencyContact: userProfile.emergencyContact || prev.emergencyContact,
        collegeId: userProfile.collegeId || prev.collegeId,
      }));
    }
  }, [userProfile]);

  const watchedCollegeId = watch('collegeId');
  const watchedRouteId = watch('routeId');
  const watchedPaymentType = watch('paymentType');
  const watchedAcademicYear = watch('academicYear');
  const watchedRegNo = watch('regNo');
  const isFaculty = role === 'faculty';
  const isFirstYear = watchedAcademicYear === '1';
  const aadhaarRequired = (isFaculty && !watchedRegNo?.trim()) || (!isFaculty && isFirstYear);
  const regNoRequired = !isFaculty && !isFirstYear;

  useEffect(() => {
    clearErrors(['regNo', 'aadhaar']);
    if (watchedAcademicYear) trigger(['regNo', 'aadhaar']);
  }, [watchedAcademicYear]);

  const { data: myApps = [], isLoading: appsLoading } = useQuery({
    queryKey: ['my-applications'],
    queryFn: applicationsAPI.getMy,
  });

  const { data: partialPermission } = useQuery({
    queryKey: ['my-partial-permission'],
    queryFn: partialPermissionsAPI.checkMy,
  });

  const hasActiveApp = myApps.some(
    a => a.status !== 'rejected_l1' && a.status !== 'rejected_l2'
  );

  useEffect(() => {
    if (!appsLoading && hasActiveApp) {
      toast.error('You already have an active application');
      navigate(`${base}/status`, { replace: true });
    }
  }, [appsLoading, hasActiveApp, navigate]);

  const { data: colleges = [] } = useQuery({ queryKey: ['colleges'], queryFn: collegesAPI.getAll });
  const { data: routes = [] } = useQuery({
    queryKey: ['routes', watchedCollegeId],
    queryFn: () => routesAPI.getAll({ collegeId: watchedCollegeId, includeOccupancy: 'true' }),
    enabled: !!watchedCollegeId,
  });
  const { data: boardingPoints = [] } = useQuery({
    queryKey: ['boarding-points', watchedRouteId],
    queryFn: () => boardingPointsAPI.getByRoute(watchedRouteId),
    enabled: !!watchedRouteId,
  });

  const selectedCollege = colleges.find(c => c.id === watchedCollegeId);
  const selectedRoute = routes.find(r => r.id === watchedRouteId);
  const watchedBoardingPointId = watch('boardingPointId');
  const selectedBP = boardingPoints.find(b => b.id === watchedBoardingPointId);

  // Boarding point fare takes priority over route fare
  const fullFare = selectedBP?.fare != null ? selectedBP.fare : selectedRoute?.fare || 0;
  const partialFareAmt = selectedBP?.partialFare != null ? selectedBP.partialFare : selectedRoute?.partialFare;
  const hasPartialOption = !!partialFareAmt;

  // Coordinator-granted partial payment
  const hasCoordinatorPartial = !!partialPermission;
  const coordinatorPayNow = hasCoordinatorPartial ? Math.round(fullFare * partialPermission.percentage / 100) : 0;
  const coordinatorDue = hasCoordinatorPartial ? fullFare - coordinatorPayNow : 0;

  const fare =
    watchedPaymentType === 'coordinator_partial' ? coordinatorPayNow :
    watchedPaymentType === 'partial' && partialFareAmt ? partialFareAmt :
    fullFare;

  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles[0]) setPaymentFile(acceptedFiles[0]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [], 'application/pdf': [] },
    maxSize: 5242880,
    maxFiles: 1,
  });

  const onSubmit = async (data) => {
    if (!paymentFile) {
      toast.error('Please upload payment proof');
      return;
    }
    setSubmitting(true);
    try {
      const formData = new FormData();
      Object.entries(data).forEach(([k, v]) => formData.append(k, v));
      formData.append('name', data.nameAsPerSSC);
      formData.append('email', currentUser.email);
      formData.append('college', selectedCollege?.name || '');
      formData.append('paymentProof', paymentFile);
      if (data.paymentType === 'coordinator_partial' && partialPermission) {
        formData.append('partialPermissionId', partialPermission.id);
      }

      await applicationsAPI.submit(formData);
      toast.success('Application submitted successfully!');
      navigate(`${base}/status`);
    } catch (err) {
      toast.error(err.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  const STEP_FIELDS = [
    // Step 0 — Personal Details
    [
      'nameAsPerSSC', 'gender', 'bloodGroup', 'address', 'branch',
      'studentPhone', 'emergencyContact', 'parentName', 'parentPhone',
      'regNo', 'aadhaar',
      ...(isFaculty ? ['dateOfJoining'] : ['academicYear']),
    ],
    // Step 1 — Route
    ['routeId', 'boardingPointId'],
    // Step 2 — Payment (file validated on submit)
    [],
  ];

  const nextStep = async () => {
    const fields = STEP_FIELDS[step];
    const valid = fields.length === 0 || await trigger(fields);
    if (valid) setStep(s => Math.min(s + 1, STEPS.length - 1));
  };
  const prevStep = () => setStep(s => Math.max(s - 1, 0));

  if (appsLoading) return <LoadingSpinner fullScreen />;
  if (hasActiveApp) return null;

  return (
    <Layout title="Bus Application Form">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          {STEPS.map((label, i) => (
            <div key={i} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                  ${i < step ? 'bg-primary-600 text-white' : i === step ? 'bg-primary-600 text-white ring-4 ring-primary-100' : 'bg-gray-200 text-gray-500'}`}>
                  {i < step ? '✓' : i + 1}
                </div>
                <span className={`text-xs mt-1 hidden sm:block ${i === step ? 'text-primary-600 font-medium' : 'text-gray-400'}`}>
                  {label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-2 ${i < step ? 'bg-primary-600' : 'bg-gray-200'}`} />
              )}
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="card">
            {step === 0 && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3 pb-1 border-b border-gray-100">Personal Details</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="label">Name as per SSC *</label>
                      <input {...register('nameAsPerSSC')} placeholder="As printed on SSC certificate" className={`input ${errors.nameAsPerSSC ? 'input-error' : ''}`} />
                      {errors.nameAsPerSSC && <p className="text-red-500 text-xs mt-1">{errors.nameAsPerSSC.message}</p>}
                    </div>
                    <div>
                      <label className="label">Gender *</label>
                      <select {...register('gender')} className={`input ${errors.gender ? 'input-error' : ''}`}>
                        <option value="">-- Select Gender --</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                      {errors.gender && <p className="text-red-500 text-xs mt-1">{errors.gender.message}</p>}
                    </div>
                    <div>
                      <label className="label">Blood Group *</label>
                      <select {...register('bloodGroup')} className={`input ${errors.bloodGroup ? 'input-error' : ''}`}>
                        <option value="">-- Select Blood Group --</option>
                        {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map(bg => (
                          <option key={bg} value={bg}>{bg}</option>
                        ))}
                      </select>
                      {errors.bloodGroup && <p className="text-red-500 text-xs mt-1">{errors.bloodGroup.message}</p>}
                    </div>
                    {isFaculty ? (
                      <div>
                        <label className="label">Date of Joining *</label>
                        <input
                          type="date"
                          {...register('dateOfJoining', {
                            validate: v => !isFaculty || (v && v.trim().length > 0) || 'Date of joining is required',
                          })}
                          className={`input ${errors.dateOfJoining ? 'input-error' : ''}`}
                        />
                        {errors.dateOfJoining && <p className="text-red-500 text-xs mt-1">{errors.dateOfJoining.message}</p>}
                      </div>
                    ) : (
                      <div>
                        <label className="label">Academic Year *</label>
                        <select {...register('academicYear', { validate: v => v && v.length > 0 || 'Academic year required' })} className={`input ${errors.academicYear ? 'input-error' : ''}`}>
                          <option value="">-- Select Year --</option>
                          <option value="1">1st Year</option>
                          <option value="2">2nd Year</option>
                          <option value="3">3rd Year</option>
                          <option value="4">4th Year</option>
                          <option value="5">5th Year</option>
                        </select>
                        {errors.academicYear && <p className="text-red-500 text-xs mt-1">{errors.academicYear.message}</p>}
                      </div>
                    )}
                    <div>
                      <label className="label">
                        {isFaculty ? 'Employee ID' : 'Registration Number'}{' '}
                        {regNoRequired ? <span className="text-red-500">*</span> : <span className="text-gray-400">(optional)</span>}
                      </label>
                      <input
                        {...register('regNo', {
                          validate: v => !regNoRequired || (v && v.trim().length >= 2) || 'Registration number is required',
                        })}
                        placeholder={isFaculty ? 'e.g. EMP001' : 'e.g. 20CS001'}
                        className={`input ${errors.regNo ? 'input-error' : ''}`}
                      />
                      {errors.regNo && <p className="text-red-500 text-xs mt-1">{errors.regNo.message}</p>}
                      {isFaculty && <p className="text-xs text-amber-600 mt-1">If you don't have an Employee ID, Aadhaar number is required.</p>}
                      {isFirstYear && <p className="text-xs text-amber-600 mt-1">1st year students can fill this later after receiving their roll number.</p>}
                    </div>
                    <div>
                      <label className="label">Branch / Department *</label>
                      <input {...register('branch')} placeholder="e.g. Computer Science" className={`input ${errors.branch ? 'input-error' : ''}`} />
                      {errors.branch && <p className="text-red-500 text-xs mt-1">{errors.branch.message}</p>}
                    </div>
                    <div>
                      <label className="label">
                        Aadhaar Number{' '}
                        {aadhaarRequired ? <span className="text-red-500">*</span> : <span className="text-gray-400">(optional)</span>}
                        {isFaculty && !watchedRegNo?.trim() && <span className="text-xs text-amber-600 ml-1">— required when Employee ID is not provided</span>}
                      </label>
                      <input
                        {...register('aadhaar', {
                          validate: v => !aadhaarRequired || (v && v.trim().length >= 12) || 'Aadhaar number is required (12 digits)',
                        })}
                        placeholder="XXXX XXXX XXXX"
                        className={`input ${errors.aadhaar ? 'input-error' : ''}`}
                      />
                      {errors.aadhaar && <p className="text-red-500 text-xs mt-1">{errors.aadhaar.message}</p>}
                    </div>
                  </div>
                  <div className="mt-4">
                    <label className="label">Address *</label>
                    <textarea {...register('address')} rows={2} placeholder="Full residential address" className={`input resize-none ${errors.address ? 'input-error' : ''}`} />
                    {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address.message}</p>}
                  </div>
                  <div className="mt-4">
                    <label className="label">College</label>
                    <input
                      value={selectedCollege?.name || colleges.find(c => c.id === userProfile?.collegeId)?.name || ''}
                      readOnly
                      disabled
                      className="input bg-gray-50 text-gray-500 cursor-not-allowed"
                    />
                    <input type="hidden" {...register('collegeId')} />
                    <p className="text-xs text-gray-400 mt-1">College is set from your registration and cannot be changed.</p>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3 pb-1 border-b border-gray-100">Contact Details</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="label">Student Phone *</label>
                      <input {...register('studentPhone')} type="tel" placeholder="+91 98765 43210" className={`input ${errors.studentPhone ? 'input-error' : ''}`} />
                      {errors.studentPhone && <p className="text-red-500 text-xs mt-1">{errors.studentPhone.message}</p>}
                    </div>
                    <div>
                      <label className="label">Emergency Contact *</label>
                      <input {...register('emergencyContact')} type="tel" placeholder="+91 98765 43210" className={`input ${errors.emergencyContact ? 'input-error' : ''}`} />
                      {errors.emergencyContact && <p className="text-red-500 text-xs mt-1">{errors.emergencyContact.message}</p>}
                    </div>
                    <div>
                      <label className="label">Parent / Guardian Name *</label>
                      <input {...register('parentName')} placeholder="Father / Mother / Guardian name" className={`input ${errors.parentName ? 'input-error' : ''}`} />
                      {errors.parentName && <p className="text-red-500 text-xs mt-1">{errors.parentName.message}</p>}
                    </div>
                    <div>
                      <label className="label">Parent / Guardian Phone *</label>
                      <input {...register('parentPhone')} type="tel" placeholder="+91 98765 43210" className={`input ${errors.parentPhone ? 'input-error' : ''}`} />
                      {errors.parentPhone && <p className="text-red-500 text-xs mt-1">{errors.parentPhone.message}</p>}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-4">
                <h2 className="mb-4">Select Route & Boarding Point</h2>
                <div>
                  <label className="label">Bus Route *</label>
                  <div className="space-y-2">
                    {routes.length === 0 && (
                      <p className="text-sm text-gray-400 py-4 text-center">No routes available for selected college</p>
                    )}
                    {routes.map(route => {
                      const isFull = route.availableSeats <= 0;
                      return (
                        <label key={route.id} className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all ${isFull ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary-400'} ${watch('routeId') === route.id ? 'border-primary-500 bg-primary-50' : 'border-gray-200'}`}>
                          <input type="radio" {...register('routeId')} value={route.id} disabled={isFull} className="text-primary-600" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm">{route.routeName}</p>
                            <p className="text-xs text-gray-500">{route.startPoint} → {route.endPoint}</p>
                            {route.busNumber && (
                              <p className="text-xs text-gray-400 mt-0.5">Bus: <span className="font-mono font-medium text-gray-600">{route.busNumber}</span></p>
                            )}
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="font-semibold text-primary-700 text-xs">Fare by stop</p>
                            <p className={`text-xs ${isFull ? 'text-red-500' : 'text-green-600'}`}>
                              {isFull ? 'Full' : `${route.availableSeats} seats left`}
                            </p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                  {errors.routeId && <p className="text-red-500 text-xs mt-1">{errors.routeId.message}</p>}
                </div>

                {watchedRouteId && (
                  <div>
                    <label className="label">Boarding Point *</label>
                    <select {...register('boardingPointId')} className={`input ${errors.boardingPointId ? 'input-error' : ''}`}>
                      <option value="">-- Select Boarding Point --</option>
                      {boardingPoints.map(bp => (
                        <option key={bp.id} value={bp.id}>{bp.name} {bp.timings ? `(${bp.timings})` : ''}</option>
                      ))}
                    </select>
                    {errors.boardingPointId && <p className="text-red-500 text-xs mt-1">{errors.boardingPointId.message}</p>}
                  </div>
                )}
              </div>
            )}

            {step === 2 && (
              <div className="space-y-5">
                <h2 className="mb-4">Payment</h2>

                {(hasPartialOption || hasCoordinatorPartial) && (
                  <div>
                    <label className="label">Payment Type</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <label className={`flex flex-col p-3 border rounded-lg cursor-pointer ${watchedPaymentType === 'full' ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'}`}>
                        <input type="radio" {...register('paymentType')} value="full" className="sr-only" />
                        <span className="font-medium text-sm">Full Payment</span>
                        <span className="text-primary-700 font-bold">{formatCurrency(fullFare)}</span>
                      </label>

                      {hasCoordinatorPartial && (
                        <label className={`flex flex-col p-3 border rounded-lg cursor-pointer ${watchedPaymentType === 'coordinator_partial' ? 'border-amber-500 bg-amber-50' : 'border-gray-200 hover:border-gray-300'}`}>
                          <input type="radio" {...register('paymentType')} value="coordinator_partial" className="sr-only" />
                          <span className="font-medium text-sm text-amber-800">Coordinator Partial</span>
                          <span className="text-amber-700 font-bold">{formatCurrency(coordinatorPayNow)}</span>
                          <span className="text-xs text-amber-600 mt-0.5">Pay {partialPermission.percentage}% now · {formatCurrency(coordinatorDue)} due later</span>
                        </label>
                      )}

                      {hasPartialOption && (
                        <label className={`flex flex-col p-3 border rounded-lg cursor-pointer ${watchedPaymentType === 'partial' ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'}`}>
                          <input type="radio" {...register('paymentType')} value="partial" className="sr-only" />
                          <span className="font-medium text-sm">Partial Payment</span>
                          <span className="text-primary-700 font-bold">{formatCurrency(partialFareAmt)}</span>
                        </label>
                      )}
                    </div>
                  </div>
                )}

                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm font-semibold text-blue-800 mb-2 flex items-center gap-2">
                    <Building2 size={16} /> Amount to Pay Now: {formatCurrency(fare)}
                    {watchedPaymentType === 'coordinator_partial' && (
                      <span className="ml-2 text-xs font-normal bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                        {formatCurrency(coordinatorDue)} due after approval
                      </span>
                    )}
                  </p>
                  {selectedCollege?.bankDetails && (
                    <div className="text-xs text-blue-700 space-y-1">
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
                    <p className="text-sm font-medium text-gray-700 mb-2 flex items-center justify-center gap-2"><QrCode size={16} /> Scan QR Code to Pay</p>
                    <img src={selectedCollege.qrCodeUrl} alt="Payment QR" className="w-48 h-48 object-contain mx-auto border rounded-lg" />
                  </div>
                )}

                <div>
                  <label className="label">Upload Payment Proof *</label>
                  <div
                    {...getRootProps()}
                    className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${isDragActive ? 'border-primary-500 bg-primary-50' : 'border-gray-300 hover:border-primary-400'}`}
                  >
                    <input {...getInputProps()} />
                    {paymentFile ? (
                      <div className="flex items-center justify-center gap-2">
                        <span className="text-sm text-gray-700 truncate max-w-xs">{paymentFile.name}</span>
                        <button type="button" onClick={(e) => { e.stopPropagation(); setPaymentFile(null); }} className="text-red-500 hover:text-red-700">
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <Upload size={24} className="mx-auto text-gray-400 mb-2" />
                        <p className="text-sm text-gray-600">Drop file here or click to browse</p>
                        <p className="text-xs text-gray-400 mt-1">JPEG, PNG, PDF up to 5MB</p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <h2 className="mb-4">Review & Submit</h2>
                <div className="bg-gray-50 rounded-lg p-4 space-y-3 text-sm">
                  {[
                    ['Name', getValues('nameAsPerSSC')],
                    [isFaculty ? 'Employee ID' : 'Reg. No.', getValues('regNo')],
                    ...(isFaculty ? [['Date of Joining', getValues('dateOfJoining')]] : []),
                    ['Branch', getValues('branch')],
                    ['College', selectedCollege?.name],
                    ['Route', selectedRoute?.routeName],
                    ['Boarding Point', boardingPoints.find(b => b.id === getValues('boardingPointId'))?.name],
                    ['Fare', formatCurrency(fare)],
                    ['Payment Proof', paymentFile?.name],
                  ].map(([label, value]) => value && (
                    <div key={label} className="flex justify-between py-1 border-b border-gray-200 last:border-0">
                      <span className="text-gray-500">{label}</span>
                      <span className="font-medium text-gray-800 text-right max-w-xs truncate">{value}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-500">
                  By submitting, you confirm all details are correct and payment has been made.
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-between mt-4">
            <button type="button" onClick={prevStep} disabled={step === 0} className="btn-secondary">
              <ChevronLeft size={16} /> Previous
            </button>
            {step < STEPS.length - 1 ? (
              <button type="button" onClick={nextStep} className="btn-primary">
                Next <ChevronRight size={16} />
              </button>
            ) : (
              <button type="submit" disabled={submitting} className="btn-primary">
                {submitting ? 'Submitting...' : 'Submit Application'}
              </button>
            )}
          </div>
        </form>
      </div>
    </Layout>
  );
}
