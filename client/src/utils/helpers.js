import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Papa from 'papaparse';

export const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount || 0);

export const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
};

export const formatDateTime = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

export const STATUS_LABELS = {
  pending_coordinator: 'Pending (Coordinator)',
  rejected_l1: 'Rejected (Level 1)',
  pending_accounts: 'Pending (Accounts)',
  rejected_l2: 'Rejected (Level 2)',
  approved_final: 'Seat Confirmed',
};

export const STATUS_COLORS = {
  pending_coordinator: 'bg-yellow-100 text-yellow-800',
  rejected_l1: 'bg-red-100 text-red-800',
  pending_accounts: 'bg-blue-100 text-blue-800',
  rejected_l2: 'bg-red-100 text-red-800',
  approved_final: 'bg-green-100 text-green-800',
};

export const ROLE_LABELS = {
  super_admin: 'Super Admin',
  bus_coordinator: 'Bus Coordinator',
  accounts: 'Accounts',
  bus_incharge: 'Bus Incharge',
  student: 'Student',
  faculty: 'Faculty',
};

export const exportToCSV = (data, filename = 'export') => {
  const csv = Papa.unparse(data);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(url);
};

export const exportToPDF = (columns, rows, title = 'Report', filename = 'report') => {
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text(title, 14, 15);
  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toLocaleString('en-IN')}`, 14, 22);

  autoTable(doc, {
    head: [columns],
    body: rows,
    startY: 28,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [37, 99, 235] },
  });

  doc.save(`${filename}.pdf`);
};

export const getOccupancyColor = (rate) => {
  if (rate >= 90) return 'text-red-600';
  if (rate >= 70) return 'text-yellow-600';
  return 'text-green-600';
};
