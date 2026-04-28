import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Layout from '../../components/common/Layout';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { analyticsAPI, collegesAPI } from '../../utils/api';
import { formatCurrency, exportToCSV, exportToPDF } from '../../utils/helpers';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Download, Filter } from 'lucide-react';

export default function FinancialReports() {
  const [collegeFilter, setCollegeFilter] = useState('');

  const { data: colleges = [] } = useQuery({ queryKey: ['colleges'], queryFn: collegesAPI.getAll });
  const { data: revenue, isLoading } = useQuery({
    queryKey: ['revenue', collegeFilter],
    queryFn: () => analyticsAPI.getRevenue({ collegeId: collegeFilter || undefined }),
  });

  const handleExportCSV = () => {
    if (!revenue) return;
    exportToCSV([
      ...revenue.byRoute.map(r => ({ Type: 'Route', Name: r.routeName, Students: r.count, Revenue: r.revenue })),
      ...revenue.byCollege.map(c => ({ Type: 'College', Name: c.collegeName, Students: c.count, Revenue: c.revenue })),
    ], 'financial-report');
  };

  const handleExportPDF = () => {
    if (!revenue) return;
    exportToPDF(
      ['Route', 'Students', 'Revenue'],
      revenue.byRoute.map(r => [r.routeName, r.count, formatCurrency(r.revenue)]),
      'Financial Report',
      'financial-report'
    );
  };

  return (
    <Layout title="Financial Reports">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-gray-400" />
            <select value={collegeFilter} onChange={e => setCollegeFilter(e.target.value)} className="input w-48">
              <option value="">All Colleges</option>
              {colleges.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="flex gap-2 ml-auto">
            <button onClick={handleExportCSV} className="btn-outline text-xs"><Download size={14} /> CSV</button>
            <button onClick={handleExportPDF} className="btn-outline text-xs"><Download size={14} /> PDF</button>
          </div>
        </div>

        {isLoading ? <LoadingSpinner /> : revenue && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="stat-card bg-green-50 border-green-200">
                <p className="text-sm text-green-600 font-medium">Total Revenue</p>
                <p className="text-3xl font-bold text-green-800 mt-1">{formatCurrency(revenue.totalRevenue)}</p>
              </div>
              <div className="stat-card bg-blue-50 border-blue-200">
                <p className="text-sm text-blue-600 font-medium">Total Students Confirmed</p>
                <p className="text-3xl font-bold text-blue-800 mt-1">{revenue.totalStudents}</p>
              </div>
            </div>

            {revenue.byRoute.length > 0 && (
              <div className="card">
                <h2 className="mb-4">Revenue by Route</h2>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={revenue.byRoute} margin={{ bottom: 35, left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="routeName" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" interval={0} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={v => formatCurrency(v)} />
                    <Bar dataKey="revenue" name="Revenue" fill="#16a34a" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>

                <div className="mt-4 table-wrapper">
                  <table className="table">
                    <thead>
                      <tr><th>Route</th><th>Students</th><th>Revenue</th></tr>
                    </thead>
                    <tbody>
                      {revenue.byRoute.map(r => (
                        <tr key={r.id}>
                          <td className="font-medium">{r.routeName}</td>
                          <td>{r.count}</td>
                          <td className="font-semibold text-green-700">{formatCurrency(r.revenue)}</td>
                        </tr>
                      ))}
                      <tr className="bg-gray-50 font-bold">
                        <td>Total</td>
                        <td>{revenue.totalStudents}</td>
                        <td className="text-green-700">{formatCurrency(revenue.totalRevenue)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {revenue.byCollege.length > 0 && (
              <div className="card">
                <h2 className="mb-4">Revenue by College</h2>
                <div className="table-wrapper">
                  <table className="table">
                    <thead>
                      <tr><th>College</th><th>Students</th><th>Revenue</th></tr>
                    </thead>
                    <tbody>
                      {revenue.byCollege.map(c => (
                        <tr key={c.id}>
                          <td className="font-medium">{c.collegeName}</td>
                          <td>{c.count}</td>
                          <td className="font-semibold text-green-700">{formatCurrency(c.revenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
