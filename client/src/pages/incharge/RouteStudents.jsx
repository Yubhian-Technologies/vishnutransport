import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Layout from '../../components/common/Layout';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import StatusBadge from '../../components/common/StatusBadge';
import Modal from '../../components/common/Modal';
import { applicationsAPI, routesAPI } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import { formatCurrency, exportToCSV } from '../../utils/helpers';
import { Search, Download, MapPin } from 'lucide-react';

export default function RouteStudents() {
  const { userProfile } = useAuth();
  const [search, setSearch] = useState('');
  const [bpFilter, setBpFilter] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);

  const { data: allRoutes = [] } = useQuery({
    queryKey: ['routes'],
    queryFn: () => routesAPI.getAll({ includeOccupancy: 'true' }),
  });

  const myRoute = allRoutes.find(r => r.inchargeId === userProfile?.uid);

  const { data: appsData, isLoading } = useQuery({
    queryKey: ['applications-incharge', myRoute?.id, 'approved_final'],
    queryFn: () => applicationsAPI.getAll({ status: 'approved_final' }),
    enabled: !!myRoute,
  });

  const allStudents = (appsData?.data || []).filter(a => a.routeId === myRoute?.id);
  const boardingPoints = [...new Set(allStudents.map(s => s.boardingPointName))];

  const filtered = allStudents.filter(s => {
    const matchesSearch = !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.regNo.toLowerCase().includes(search.toLowerCase());
    const matchesBP = !bpFilter || s.boardingPointName === bpFilter;
    return matchesSearch && matchesBP;
  });

  const handleExport = () => {
    exportToCSV(filtered.map(s => ({
      Name: s.name,
      'Reg No': s.regNo,
      Branch: s.branch,
      'Boarding Point': s.boardingPointName,
      'Payment Type': (() => { const c = (s.paymentType === 'partial' || s.paymentType === 'coordinator_partial') && s.dueStatus === 'verified'; return s.paymentType === 'full' || c ? 'Full' : 'Partial'; })(),
      Fare: s.fare,
    })), `students-${myRoute?.routeName || 'route'}`);
  };

  return (
    <Layout title="Route Students">
      <div className="space-y-4">
        {myRoute && (
          <div className="card bg-blue-50 border-blue-200">
            <p className="text-sm text-blue-600">Route: <span className="font-semibold text-blue-800">{myRoute.routeName}</span></p>
            <p className="text-xs text-blue-500 mt-0.5">{allStudents.length} confirmed students · {myRoute.availableSeats} seats available</p>
          </div>
        )}

        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or reg no..." className="input pl-9" />
          </div>
          <select value={bpFilter} onChange={e => setBpFilter(e.target.value)} className="input w-48">
            <option value="">All Boarding Points</option>
            {boardingPoints.map(bp => <option key={bp} value={bp}>{bp}</option>)}
          </select>
          <button onClick={handleExport} className="btn-outline text-xs ml-auto">
            <Download size={14} /> Export
          </button>
        </div>

        {isLoading ? <LoadingSpinner /> : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Boarding Point</th>
                  <th>Branch</th>
                  <th>Fare</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={4} className="text-center py-8 text-gray-400">No confirmed students found</td></tr>
                ) : filtered.map(student => (
                  <tr key={student.id} className="cursor-pointer hover:bg-gray-50" onClick={() => setSelectedStudent(student)}>
                    <td>
                      <p className="font-medium text-primary-700 hover:underline">{student.name}</p>
                      <p className="text-xs text-gray-400">{student.regNo}</p>
                    </td>
                    <td>
                      <div className="flex items-center gap-1 text-sm">
                        <MapPin size={13} className="text-gray-400" />
                        {student.boardingPointName}
                      </div>
                    </td>
                    <td className="text-sm">{student.branch}</td>
                    <td className="text-sm font-medium">{formatCurrency(student.fare)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal isOpen={!!selectedStudent} onClose={() => setSelectedStudent(null)} title="Student Details" size="lg">
        {selectedStudent && (
          <div className="space-y-4 text-sm">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Personal Details</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                ['Name', selectedStudent.name],
                ['Name as per SSC', selectedStudent.nameAsPerSSC || '—'],
                ['Type', selectedStudent.applicantRole === 'faculty' ? 'Faculty' : 'Student'],
                ['Gender', selectedStudent.gender ? selectedStudent.gender.charAt(0).toUpperCase() + selectedStudent.gender.slice(1) : '—'],
                ['Blood Group', selectedStudent.bloodGroup || '—'],
                [selectedStudent.applicantRole === 'faculty' ? 'Date of Joining' : 'Academic Year', selectedStudent.applicantRole === 'faculty' ? (selectedStudent.dateOfJoining || '—') : (selectedStudent.academicYear ? `Year ${selectedStudent.academicYear}` : '—')],
                ['Reg No', selectedStudent.regNo],
                ['Branch', selectedStudent.branch],
                ['College', selectedStudent.college || '—'],
              ].map(([label, value]) => (
                <div key={label} className="bg-gray-50 p-2.5 rounded-lg">
                  <p className="text-xs text-gray-500">{label}</p>
                  <p className="font-medium mt-0.5">{value}</p>
                </div>
              ))}
              <div className="col-span-2 bg-gray-50 p-2.5 rounded-lg">
                <p className="text-xs text-gray-500">Address</p>
                <p className="font-medium mt-0.5">{selectedStudent.address || '—'}</p>
              </div>
            </div>

            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Contact Details</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                ['Student Phone', selectedStudent.studentPhone || '—'],
                ['Emergency Contact', selectedStudent.emergencyContact || '—'],
                ['Parent / Guardian', selectedStudent.parentName || '—'],
                ['Parent Phone', selectedStudent.parentPhone || '—'],
              ].map(([label, value]) => (
                <div key={label} className="bg-gray-50 p-2.5 rounded-lg">
                  <p className="text-xs text-gray-500">{label}</p>
                  <p className="font-medium mt-0.5">{value}</p>
                </div>
              ))}
            </div>

            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Bus Details</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                ['Boarding Point', selectedStudent.boardingPointName],
                ['Fare', formatCurrency(selectedStudent.fare)],
                ['Payment Type', (() => { const c = (selectedStudent.paymentType === 'partial' || selectedStudent.paymentType === 'coordinator_partial') && selectedStudent.dueStatus === 'verified'; return selectedStudent.paymentType === 'full' || c ? 'Full' : 'Partial'; })()],
                ['Status', <StatusBadge key="s" status={selectedStudent.status} />],
              ].map(([label, value]) => (
                <div key={label} className="bg-gray-50 p-2.5 rounded-lg">
                  <p className="text-xs text-gray-500">{label}</p>
                  <p className="font-medium mt-0.5">{value}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </Layout>
  );
}
