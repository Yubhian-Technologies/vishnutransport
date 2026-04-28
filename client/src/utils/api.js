import axios from 'axios';
import { auth } from '../config/firebase';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  timeout: 30000,
});

api.interceptors.request.use(async (config) => {
  const user = auth.currentUser;
  if (user) {
    const token = await user.getIdToken();
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message = error.response?.data?.error || error.message || 'Something went wrong';
    return Promise.reject(new Error(message));
  }
);

export default api;

export const collegesAPI = {
  getAll: () => api.get('/colleges'),
  get: (id) => api.get(`/colleges/${id}`),
  create: (data) => api.post('/colleges', data),
  update: (id, data) => api.put(`/colleges/${id}`, data),
  uploadQR: (id, file) => {
    const form = new FormData();
    form.append('qrCode', file);
    return api.post(`/colleges/${id}/qr-code`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  updateBank: (id, data) => api.put(`/colleges/${id}/bank-details`, data),
  delete: (id) => api.delete(`/colleges/${id}`),
};

export const routesAPI = {
  getAll: (params) => api.get('/bus-routes', { params }),
  get: (id) => api.get(`/bus-routes/${id}`),
  create: (data) => api.post('/bus-routes', data),
  update: (id, data) => api.put(`/bus-routes/${id}`, data),
  assignIncharge: (id, inchargeId) => api.patch(`/bus-routes/${id}/assign-incharge`, { inchargeId }),
  delete: (id) => api.delete(`/bus-routes/${id}`),
};

export const boardingPointsAPI = {
  getByRoute: (routeId) => api.get(`/boarding-points/route/${routeId}`),
  create: (data) => api.post('/boarding-points', data),
  update: (id, data) => api.put(`/boarding-points/${id}`, data),
  delete: (id) => api.delete(`/boarding-points/${id}`),
};

export const applicationsAPI = {
  submit: (formData) => api.post('/applications', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  getMy: () => api.get('/applications/my'),
  getAll: (params) => api.get('/applications', { params }),
  get: (id) => api.get(`/applications/${id}`),
  coordinatorReview: (id, data) => api.patch(`/applications/${id}/coordinator-review`, data),
  accountsReview: (id, data) => api.patch(`/applications/${id}/accounts-review`, data),
  uploadProof: (id, file) => {
    const form = new FormData();
    form.append('paymentProof', file);
    return api.post(`/applications/${id}/payment-proof`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  submitDuePayment: (id, file) => {
    const form = new FormData();
    form.append('paymentProof', file);
    return api.post(`/applications/${id}/due-payment`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  dueReview: (id, data) => api.patch(`/applications/${id}/due-review`, data),
};

export const profileAPI = {
  updateMe: (data) => api.put('/users/me', data),
  uploadPhoto: (file) => {
    const form = new FormData();
    form.append('photo', file);
    return api.post('/users/me/photo', form, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
};

export const usersAPI = {
  getAll: (params) => api.get('/users', { params }),
  get: (id) => api.get(`/users/${id}`),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
  getIncharges: () => api.get('/users/incharges'),
};

export const analyticsAPI = {
  getDashboard: () => api.get('/analytics/dashboard'),
  getRoutes: () => api.get('/analytics/routes'),
  getRevenue: (params) => api.get('/analytics/revenue', { params }),
};

export const attendanceAPI = {
  scan: (qrData) => api.post('/attendance/scan', { qrData }),
  getMy: () => api.get('/attendance/my'),
  getRoute: (params) => api.get('/attendance/route', { params }),
  getAll: (params) => api.get('/attendance', { params }),
};

export const partialPermissionsAPI = {
  getAll: () => api.get('/partial-permissions'),
  grant: (data) => api.post('/partial-permissions', data),
  revoke: (id) => api.delete(`/partial-permissions/${id}`),
  checkMy: () => api.get('/partial-permissions/my'),
};

export const paymentsAPI = {
  getAll: (params) => api.get('/payments', { params }),
  getSummary: () => api.get('/payments/summary'),
};
