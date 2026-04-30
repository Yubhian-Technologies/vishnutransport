import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import jsQR from 'jsqr';
import Layout from '../../components/common/Layout';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { attendanceAPI, applicationsAPI } from '../../utils/api';
import { format } from 'date-fns';
import {
  ScanLine, CheckCircle2, XCircle, CameraOff, Calendar,
  Sun, Sunset, Users, Search, MapPin,
} from 'lucide-react';
import toast from 'react-hot-toast';

/* ── Beep ─────────────────────────────────────────────── */
function playBeep(success = true) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.value = success ? 1046 : 300;
    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
  } catch (_) {}
}

/* ── Camera QR Scanner ────────────────────────────────── */
function QrScanner({ onResult }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const doneRef = useRef(false);

  useEffect(() => {
    doneRef.current = false;

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          tick();
        }
      } catch {
        onResult(null, 'Camera access denied. Please allow camera permission.');
      }
    };

    const tick = () => {
      if (doneRef.current) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState < 2) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      const { videoWidth: w, videoHeight: h } = video;
      if (!w || !h) { rafRef.current = requestAnimationFrame(tick); return; }
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(video, 0, 0, w, h);
      const imageData = ctx.getImageData(0, 0, w, h);
      const code = jsQR(imageData.data, w, h, { inversionAttempts: 'dontInvert' });
      if (code?.data) {
        doneRef.current = true;
        stopCamera();
        onResult(code.data, null);
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    const stopCamera = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    };

    startCamera();
    return () => {
      doneRef.current = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    };
  }, [onResult]);

  return (
    <div className="relative w-full rounded-xl overflow-hidden bg-black" style={{ aspectRatio: '4/3' }}>
      <video ref={videoRef} className="w-full h-full object-cover" playsInline muted autoPlay />
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="relative w-56 h-56">
          {[['top-0 left-0', 'border-t-4 border-l-4 rounded-tl-lg'],
            ['top-0 right-0', 'border-t-4 border-r-4 rounded-tr-lg'],
            ['bottom-0 left-0', 'border-b-4 border-l-4 rounded-bl-lg'],
            ['bottom-0 right-0', 'border-b-4 border-r-4 rounded-br-lg'],
          ].map(([pos, cls], i) => (
            <div key={i} className={`absolute ${pos} w-8 h-8 border-white ${cls}`} />
          ))}
          <div className="absolute inset-x-0 top-1/2 h-0.5 bg-green-400 opacity-80 animate-pulse" />
        </div>
      </div>
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}

/* ── Main Page ────────────────────────────────────────── */
export default function AttendanceScanner() {
  const queryClient = useQueryClient();
  const today = format(new Date(), 'yyyy-MM-dd');
  const currentPeriod = new Date().getHours() < 12 ? 'morning' : 'evening';

  const [selectedDate, setSelectedDate] = useState(today);
  const [scanState, setScanState] = useState('idle');
  const [scanInfo, setScanInfo] = useState(null);
  const [scanKey, setScanKey] = useState(0);
  const [activeTab, setActiveTab] = useState('scan');
  const [manualPeriod, setManualPeriod] = useState(currentPeriod);
  const [bpFilter, setBpFilter] = useState('');
  const [searchManual, setSearchManual] = useState('');
  const [markingId, setMarkingId] = useState(null);

  /* ── Queries ── */
  const { data: routeData, isLoading: recordsLoading } = useQuery({
    queryKey: ['route-attendance', selectedDate],
    queryFn: () => attendanceAPI.getRoute({ date: selectedDate }),
  });

  const { data: studentsData, isLoading: studentsLoading } = useQuery({
    queryKey: ['confirmed-students-incharge'],
    queryFn: () => applicationsAPI.getAll({ status: 'approved_final' }),
    enabled: activeTab === 'manual',
  });

  /* ── Derived data ── */
  const records = routeData?.records || [];
  const morningRecords = records.filter(r => r.period === 'morning');
  const eveningRecords = records.filter(r => r.period === 'evening');

  const confirmedStudents = studentsData?.data || [];
  const boardingPoints = [...new Set(confirmedStudents.map(s => s.boardingPointName).filter(Boolean))].sort();

  const filteredStudents = confirmedStudents.filter(s => {
    const matchBP = !bpFilter || s.boardingPointName === bpFilter;
    const matchSearch = !searchManual ||
      s.name.toLowerCase().includes(searchManual.toLowerCase()) ||
      (s.regNo || '').toLowerCase().includes(searchManual.toLowerCase());
    return matchBP && matchSearch;
  });

  const todayRecords = records.filter(r => r.date === today);
  const markedMorning = new Set(todayRecords.filter(r => r.period === 'morning').map(r => r.studentId));
  const markedEvening = new Set(todayRecords.filter(r => r.period === 'evening').map(r => r.studentId));
  const markedForPeriod = manualPeriod === 'morning' ? markedMorning : markedEvening;

  /* ── Mutations ── */
  const scanMutation = useMutation({
    mutationFn: (qrData) => attendanceAPI.scan(qrData),
    onSuccess: (data) => {
      playBeep(true);
      setScanInfo({ success: true, data });
      setScanState('success');
      queryClient.invalidateQueries({ queryKey: ['route-attendance'] });
    },
    onError: (err) => {
      playBeep(false);
      setScanInfo({ success: false, message: err.message });
      setScanState('error');
    },
  });

  const manualMutation = useMutation({
    mutationFn: ({ studentId, period }) => attendanceAPI.markManual({ studentId, period }),
    onSuccess: (data) => {
      toast.success(`Marked: ${data.studentName}`);
      queryClient.invalidateQueries({ queryKey: ['route-attendance'] });
      setMarkingId(null);
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to mark attendance');
      setMarkingId(null);
    },
  });

  const handleResult = useCallback((text, camError) => {
    if (camError) { setScanInfo({ success: false, message: camError }); setScanState('error'); return; }
    scanMutation.mutate(text);
  }, [scanMutation]);

  const startScanning = () => { setScanState('scanning'); setScanInfo(null); setScanKey(k => k + 1); };

  const handleMarkManual = (student) => {
    setMarkingId(student.studentId);
    manualMutation.mutate({ studentId: student.studentId, period: manualPeriod });
  };

  return (
    <Layout title="Attendance">
      <div className="max-w-lg mx-auto space-y-4 pb-10">

        {/* Period badge + date */}
        <div className="flex items-center justify-between">
          <span className={`inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full font-semibold ${
            currentPeriod === 'morning' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
          }`}>
            {currentPeriod === 'morning' ? <Sun size={14} /> : <Sunset size={14} />}
            {currentPeriod === 'morning' ? 'Morning' : 'Evening'} Session
          </span>
          <span className="text-xs text-gray-400 font-medium">{today}</span>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 text-center">
          {[
            { label: 'Morning', val: morningRecords.length, cls: 'bg-amber-50 text-amber-700' },
            { label: 'Evening', val: eveningRecords.length, cls: 'bg-blue-50 text-blue-700' },
            { label: 'Total', val: records.length, cls: 'bg-green-50 text-green-700' },
          ].map(({ label, val, cls }) => (
            <div key={label} className={`rounded-xl py-2.5 ${cls}`}>
              <p className="text-2xl font-bold leading-none">{val}</p>
              <p className="text-xs font-medium mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
          {[
            { key: 'scan', icon: ScanLine, label: 'QR Scan' },
            { key: 'manual', icon: Users, label: 'Manual Mark' },
          ].map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-lg transition-all ${
                activeTab === key ? 'bg-white shadow-sm text-primary-700' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon size={15} /> {label}
            </button>
          ))}
        </div>

        {/* ── QR Scan Tab ── */}
        {activeTab === 'scan' && (
          <div className="card p-4 space-y-3">
            {scanState === 'idle' && (
              <button onClick={startScanning} className="btn-primary w-full py-5 text-base flex items-center justify-center gap-2">
                <ScanLine size={22} /> Start Scanning
              </button>
            )}
            {scanState === 'scanning' && (
              <div className="space-y-3">
                <QrScanner key={scanKey} onResult={handleResult} />
                {scanMutation.isPending ? (
                  <div className="text-center text-sm text-gray-400 flex items-center justify-center gap-2">
                    <LoadingSpinner /> Verifying…
                  </div>
                ) : (
                  <p className="text-center text-sm text-gray-400">Point camera at QR code</p>
                )}
                <button onClick={() => setScanState('idle')} className="btn-secondary w-full text-sm flex items-center justify-center gap-1">
                  <CameraOff size={15} /> Stop Camera
                </button>
              </div>
            )}
            {scanState === 'success' && scanInfo && (
              <div className="space-y-3">
                <div className="flex flex-col items-center gap-2 py-5 bg-green-50 rounded-xl border border-green-200">
                  <CheckCircle2 size={52} className="text-green-500" />
                  <p className="font-bold text-green-800 text-xl">Attendance Marked!</p>
                  <p className="font-semibold text-green-700 text-base">{scanInfo.data.studentName}</p>
                  <p className="text-sm text-green-600">{scanInfo.data.regNo}</p>
                  <span className={`mt-1 text-xs px-3 py-1 rounded-full font-semibold ${
                    scanInfo.data.period === 'morning' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {scanInfo.data.period === 'morning' ? 'Morning' : 'Evening'} — {format(new Date(scanInfo.data.timestamp), 'hh:mm a')}
                  </span>
                </div>
                <button onClick={startScanning} className="btn-primary w-full flex items-center justify-center gap-2 py-3">
                  <ScanLine size={18} /> Scan Next Student
                </button>
              </div>
            )}
            {scanState === 'error' && scanInfo && (
              <div className="space-y-3">
                <div className="flex flex-col items-center gap-2 py-5 bg-red-50 rounded-xl border border-red-200">
                  <XCircle size={52} className="text-red-400" />
                  <p className="font-bold text-red-700 text-lg">Scan Failed</p>
                  <p className="text-sm text-red-600 text-center px-4">{scanInfo.message}</p>
                </div>
                <button onClick={startScanning} className="btn-primary w-full flex items-center justify-center gap-2 py-3">
                  <ScanLine size={18} /> Try Again
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Manual Mark Tab ── */}
        {activeTab === 'manual' && (
          <div className="card p-4 space-y-4">
            {/* Period selector */}
            <div className="flex gap-2">
              {[
                { key: 'morning', icon: Sun, label: 'Morning', count: markedMorning.size, cls: 'bg-amber-100 text-amber-700 border-amber-300', inactiveCls: 'bg-gray-50 text-gray-500 border-gray-200' },
                { key: 'evening', icon: Sunset, label: 'Evening', count: markedEvening.size, cls: 'bg-blue-100 text-blue-700 border-blue-300', inactiveCls: 'bg-gray-50 text-gray-500 border-gray-200' },
              ].map(({ key, icon: Icon, label, count, cls, inactiveCls }) => (
                <button
                  key={key}
                  onClick={() => setManualPeriod(key)}
                  className={`flex-1 flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                    manualPeriod === key ? cls : inactiveCls + ' hover:bg-gray-100'
                  }`}
                >
                  <span className="flex items-center gap-1.5"><Icon size={14} /> {label}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${manualPeriod === key ? 'bg-white/60' : 'bg-gray-200'}`}>
                    {count}
                  </span>
                </button>
              ))}
            </div>

            {/* Filters */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={searchManual}
                  onChange={e => setSearchManual(e.target.value)}
                  placeholder="Search name or reg no..."
                  className="input pl-8 text-sm py-2"
                />
              </div>
              <select
                value={bpFilter}
                onChange={e => setBpFilter(e.target.value)}
                className="input text-sm py-2 w-44"
              >
                <option value="">All Boarding Points</option>
                {boardingPoints.map(bp => <option key={bp} value={bp}>{bp}</option>)}
              </select>
            </div>

            {/* Summary line */}
            <p className="text-xs text-gray-500">
              {markedForPeriod.size} of {confirmedStudents.length} marked for {manualPeriod}
              {filteredStudents.length !== confirmedStudents.length && ` · showing ${filteredStudents.length}`}
            </p>

            {/* Student list */}
            {studentsLoading ? (
              <LoadingSpinner />
            ) : filteredStudents.length === 0 ? (
              <p className="text-center text-sm text-gray-400 py-6">No students found</p>
            ) : (
              <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                {filteredStudents.map(student => {
                  const isMarked = markedForPeriod.has(student.studentId);
                  const isMarking = markingId === student.studentId;
                  return (
                    <div
                      key={student.id}
                      className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                        isMarked
                          ? 'bg-green-50 border-green-200'
                          : 'bg-white border-gray-200 hover:border-primary-300 hover:bg-primary-50'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-gray-900 truncate">{student.name}</p>
                        <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                          <span>{student.regNo}</span>
                          <span>·</span>
                          <MapPin size={10} className="text-gray-300" />
                          <span>{student.boardingPointName}</span>
                        </p>
                      </div>

                      {isMarked ? (
                        <div className="flex items-center gap-1 text-green-600 text-xs font-semibold flex-shrink-0">
                          <CheckCircle2 size={16} />
                          <span>Present</span>
                        </div>
                      ) : (
                        <button
                          disabled={isMarking || !!markingId}
                          onClick={() => handleMarkManual(student)}
                          className="flex-shrink-0 px-3 py-1.5 text-xs font-semibold bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
                        >
                          {isMarking ? '…' : 'Mark'}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Records section (both tabs) ── */}
        <div className="card space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm text-gray-700 flex items-center gap-1.5">
              <Calendar size={14} className="text-gray-400" /> Records
            </h3>
            <input
              type="date"
              value={selectedDate}
              max={today}
              onChange={e => setSelectedDate(e.target.value)}
              className="input text-xs py-1 px-2 w-36"
            />
          </div>

          {recordsLoading ? <LoadingSpinner /> : records.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-6">No records for this date</p>
          ) : (
            ['morning', 'evening'].map(period => {
              const pr = records.filter(r => r.period === period);
              if (!pr.length) return null;
              return (
                <div key={period} className="space-y-1">
                  <p className={`text-xs font-bold uppercase tracking-wider px-2 py-1.5 rounded-lg ${
                    period === 'morning' ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'
                  }`}>
                    {period === 'morning' ? 'Morning' : 'Evening'} — {pr.length} present
                  </p>
                  {pr.map(r => (
                    <div key={r.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-50">
                      <div>
                        <p className="text-sm font-medium">{r.studentName}</p>
                        <p className="text-xs text-gray-400">{r.regNo} · {r.boardingPointName}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">{format(new Date(r.timestamp), 'hh:mm a')}</p>
                        {r.markedManually && (
                          <p className="text-xs text-blue-400">Manual</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })
          )}
        </div>

      </div>
    </Layout>
  );
}