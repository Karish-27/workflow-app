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
  verifyEmail: (email: string, token: string) => api.post('/auth/verify-email', { email, token }),
  resendVerification: () => api.post('/auth/resend-verification'),
  forgotPassword: (email: string) => api.post('/auth/forgot-password', { email }),
  resetPassword: (email: string, token: string, password: string) =>
    api.post('/auth/reset-password', { email, token, password }),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.post('/auth/change-password', { currentPassword, newPassword }),
  acceptInvite: (data: { email: string; token: string; name: string; password: string }) =>
    api.post('/auth/accept-invite', data),
};

// ─── Organization ─────────────────────────────────────────────────
export const organizationApi = {
  get: () => api.get('/organization'),
  update: (data: any) => api.put('/organization', data),
  auditLogs: (params?: any) => api.get('/organization/audit-logs', { params }),
};

// ─── Team ─────────────────────────────────────────────────────────
export const teamApi = {
  listMembers: () => api.get('/team/members'),
  updateRole: (id: string, role: string) => api.put(`/team/members/${id}/role`, { role }),
  removeMember: (id: string) => api.delete(`/team/members/${id}`),
  listInvites: () => api.get('/team/invites'),
  createInvite: (email: string, role: string) => api.post('/team/invites', { email, role }),
  revokeInvite: (id: string) => api.delete(`/team/invites/${id}`),
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

// ─── Holidays ─────────────────────────────────────────────────────
export const holidaysApi = {
  list: (year?: number) => api.get('/holidays', { params: { year } }),
  upsert: (data: { name: string; date: string; paid?: boolean; region?: string; notes?: string }) =>
    api.post('/holidays', data),
  remove: (id: string) => api.delete(`/holidays/${id}`),
};

// ─── Leaves ───────────────────────────────────────────────────────
export const leavesApi = {
  list: (params?: { status?: string; workerId?: string }) => api.get('/leaves', { params }),
  create: (data: { workerId: string; type: string; startDate: string; endDate: string; reason?: string }) =>
    api.post('/leaves', data),
  approve: (id: string, note?: string) => api.post(`/leaves/${id}/approve`, { note }),
  reject: (id: string, note?: string) => api.post(`/leaves/${id}/reject`, { note }),
};

// ─── Advances ─────────────────────────────────────────────────────
export const advancesApi = {
  list: (params?: { workerId?: string; status?: string }) => api.get('/advances', { params }),
  outstanding: (workerId: string) => api.get(`/advances/worker/${workerId}/outstanding`),
  create: (data: {
    workerId: string;
    amount: number;
    type?: string;
    reason?: string;
    issuedOn?: string;
    installmentAmount?: number;
  }) => api.post('/advances', data),
  repay: (id: string, amount: number, note?: string) =>
    api.post(`/advances/${id}/repay`, { amount, note }),
};

// ─── Shifts ───────────────────────────────────────────────────────
export const shiftsApi = {
  list: () => api.get('/shifts'),
  create: (data: any) => api.post('/shifts', data),
  update: (id: string, data: any) => api.put(`/shifts/${id}`, data),
  remove: (id: string) => api.delete(`/shifts/${id}`),
};

// ─── Sites ────────────────────────────────────────────────────────
export const sitesApi = {
  list: () => api.get('/sites'),
  create: (data: any) => api.post('/sites', data),
  update: (id: string, data: any) => api.put(`/sites/${id}`, data),
  rotateToken: (id: string) => api.post(`/sites/${id}/rotate-token`),
  remove: (id: string) => api.delete(`/sites/${id}`),
};

// ─── Workers extras ───────────────────────────────────────────────
export const workerExtrasApi = {
  setPin: (id: string, pin: string | null) => api.post(`/workers/${id}/pin`, { pin }),
};

// ─── Exports ──────────────────────────────────────────────────────
function downloadUrl(path: string, params?: Record<string, any>) {
  const url = new URL((api.defaults.baseURL || '') + path, window.location.origin);
  const token = typeof window !== 'undefined' ? localStorage.getItem('wf_token') : null;
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
    });
  }
  if (token) url.searchParams.set('access_token', token);
  return url.toString();
}

export const exportsApi = {
  // Fetch with auth header, then trigger a browser download from the blob.
  download: async (path: string, params?: Record<string, any>) => {
    const res = await api.get(path, { params, responseType: 'blob' });
    const disposition = res.headers['content-disposition'] || '';
    const match = /filename="?([^"]+)"?/.exec(disposition);
    const filename = match ? match[1] : 'download.csv';
    const blob = new Blob([res.data], { type: res.headers['content-type'] || 'application/octet-stream' });
    const link = document.createElement('a');
    const objectUrl = URL.createObjectURL(blob);
    link.href = objectUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(objectUrl);
  },
  workers: () => exportsApi.download('/exports/workers.csv'),
  attendance: (month: number, year: number) =>
    exportsApi.download('/exports/attendance.csv', { month, year }),
  payments: (month?: number, year?: number) =>
    exportsApi.download('/exports/payments.csv', { month, year }),
  payslip: async (paymentId: string) =>
    exportsApi.download(`/payments/${paymentId}/payslip.pdf`),
};

// ─── Worker portal ────────────────────────────────────────────────
const workerToken = () => (typeof window !== 'undefined' ? localStorage.getItem('wf_worker_token') : null);

const workerApi = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5500/api',
  headers: { 'Content-Type': 'application/json' },
});
workerApi.interceptors.request.use((config) => {
  const t = workerToken();
  if (t) config.headers.Authorization = `Bearer ${t}`;
  return config;
});

export const workerPortalApi = {
  login: (orgSlug: string, phone: string, pin: string) =>
    workerApi.post('/worker-portal/login', { orgSlug, phone, pin }),
  me: () => workerApi.get('/worker-portal/me'),
  myAttendance: (month: number, year: number) =>
    workerApi.get('/worker-portal/my-attendance', { params: { month, year } }),
  myPayments: () => workerApi.get('/worker-portal/my-payments'),
  myLeaves: () => workerApi.get('/worker-portal/my-leaves'),
  applyLeave: (data: { startDate: string; endDate: string; type: string; reason?: string }) =>
    workerApi.post('/worker-portal/my-leaves', data),
  checkIn: (data: { lat?: number; lng?: number; accuracy?: number; photoUrl?: string; kioskToken?: string }) =>
    workerApi.post('/worker-portal/check-in', data),
  checkOut: (data: { lat?: number; lng?: number; accuracy?: number }) =>
    workerApi.post('/worker-portal/check-out', data),
  payslipUrl: (paymentId: string) => downloadUrl(`/worker-portal/payslip/${paymentId}`),
};

export const kioskApi = {
  resolve: (token: string) => api.get(`/kiosk/${token}`),
};

export default api;
