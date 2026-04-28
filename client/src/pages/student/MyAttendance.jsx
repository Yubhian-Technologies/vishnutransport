import React from 'react';
import { useQuery } from '@tanstack/react-query';
import Layout from '../../components/common/Layout';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { attendanceAPI } from '../../utils/api';
import { format, parseISO } from 'date-fns';
import { CheckCircle2, Sun, Sunset, CalendarDays } from 'lucide-react';

export default function MyAttendance() {
  const { data: records = [], isLoading } = useQuery({
    queryKey: ['my-attendance'],
    queryFn: attendanceAPI.getMy,
  });

  // Group by date
  const grouped = records.reduce((acc, r) => {
    if (!acc[r.date]) acc[r.date] = [];
    acc[r.date].push(r);
    return acc;
  }, {});

  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  const totalDays = sortedDates.length;
  const morningCount = records.filter(r => r.period === 'morning').length;
  const eveningCount = records.filter(r => r.period === 'evening').length;

  return (
    <Layout title="My Attendance">
      <div className="max-w-xl mx-auto space-y-5">
        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Days Present', value: totalDays, icon: CalendarDays, color: 'text-primary-600 bg-primary-50' },
            { label: 'Morning', value: morningCount, icon: Sun, color: 'text-amber-600 bg-amber-50' },
            { label: 'Evening', value: eveningCount, icon: Sunset, color: 'text-blue-600 bg-blue-50' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="card flex items-center gap-3 py-3">
              <div className={`p-2 rounded-lg ${color}`}><Icon size={16} /></div>
              <div>
                <p className="text-xs text-gray-500">{label}</p>
                <p className="font-bold text-gray-800">{value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Timeline */}
        <div className="card">
          <h3 className="font-semibold text-gray-800 mb-4">Attendance History</h3>

          {isLoading ? <LoadingSpinner /> : sortedDates.length === 0 ? (
            <div className="text-center py-10">
              <CalendarDays size={40} className="text-gray-300 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">No attendance records yet</p>
              <p className="text-gray-300 text-xs mt-1">Your attendance will appear here once the incharge scans your QR code</p>
            </div>
          ) : (
            <div className="space-y-4">
              {sortedDates.map(date => {
                const dayRecords = grouped[date];
                const hasMorning = dayRecords.some(r => r.period === 'morning');
                const hasEvening = dayRecords.some(r => r.period === 'evening');
                const morningRec = dayRecords.find(r => r.period === 'morning');
                const eveningRec = dayRecords.find(r => r.period === 'evening');

                return (
                  <div key={date} className="border border-gray-100 rounded-xl overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-100">
                      <p className="text-sm font-semibold text-gray-700">
                        {format(parseISO(date), 'EEEE, dd MMM yyyy')}
                      </p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        hasMorning && hasEvening ? 'bg-green-100 text-green-700'
                        : 'bg-amber-100 text-amber-700'
                      }`}>
                        {hasMorning && hasEvening ? 'Full Day' : 'Partial'}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 divide-x divide-gray-100">
                      {[
                        { period: 'morning', label: 'Morning', icon: Sun, rec: morningRec, present: hasMorning },
                        { period: 'evening', label: 'Evening', icon: Sunset, rec: eveningRec, present: hasEvening },
                      ].map(({ period, label, icon: Icon, rec, present }) => (
                        <div key={period} className={`px-4 py-3 flex items-center gap-2 ${present ? '' : 'opacity-40'}`}>
                          <Icon size={15} className={period === 'morning' ? 'text-amber-500' : 'text-blue-500'} />
                          <div className="min-w-0">
                            <p className="text-xs text-gray-500">{label}</p>
                            {present ? (
                              <div className="flex items-center gap-1">
                                <CheckCircle2 size={13} className="text-green-500" />
                                <p className="text-xs font-medium text-green-700">
                                  {rec ? format(new Date(rec.timestamp), 'hh:mm a') : 'Present'}
                                </p>
                              </div>
                            ) : (
                              <p className="text-xs text-gray-400">Absent</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
