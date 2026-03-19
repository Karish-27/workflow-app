import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5500/api',
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('wf_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Global error handling
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('wf_token');
      localStorage.removeItem('wf_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// ─── Auth ──────────────────────────────────────────────────────────
export const authApi = {
  register: (data: any) => api.post('/auth/register', data),
  login: (email: string, password: string) => api.post('/auth/login', { email, password }),
  me: () => api.get('/auth/me'),
  updateProfile: (data: any) => api.put('/auth/profile', data),
};

// ─── Workers ───────────────────────────────────────────────────────
export const workersApi = {
  getAll: (params?: any) => api.get('/workers', { params }),
  getById: (id: string) => api.get(`/workers/${id}`),
  create: (data: any) => api.post('/workers', data),
  update: (id: string, data: any) => api.put(`/workers/${id}`, data),
  delete: (id: string) => api.delete(`/workers/${id}`),
  getAttendanceSummary: (id: string, month: number, year: number) =>
    api.get(`/workers/${id}/attendance-summary`, { params: { month, year } }),
};

// ─── Attendance ────────────────────────────────────────────────────
export const attendanceApi = {
  getAll: (params?: any) => api.get('/attendance', { params }),
  getToday: () => api.get('/attendance/today'),
  mark: (data: any) => api.post('/attendance', data),
  bulkMark: (date: string, records: any[]) => api.post('/attendance/bulk', { date, records }),
  delete: (id: string) => api.delete(`/attendance/${id}`),
};

// ─── Salary ────────────────────────────────────────────────────────
export const salaryApi = {
  getWorkerSalary: (workerId: string, month: number, year: number) =>
    api.get(`/salary/${workerId}`, { params: { month, year } }),
  getAllSummary: (month: number, year: number) =>
    api.get('/salary/summary/all', { params: { month, year } }),
};

// ─── Payments ─────────────────────────────────────────────────────
export const paymentsApi = {
  getAll: (params?: any) => api.get('/payments', { params }),
  create: (data: any) => api.post('/payments', data),
  getById: (id: string) => api.get(`/payments/${id}`),
  getStats: (month: number, year: number) =>
    api.get('/payments/stats', { params: { month, year } }),
};

// ─── Dashboard ─────────────────────────────────────────────────────
export const dashboardApi = {
  get: () => api.get('/dashboard'),
};

export default api;
