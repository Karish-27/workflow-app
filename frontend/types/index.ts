// ─── Auth ──────────────────────────────────────────────────────────
export interface User {
  _id: string;
  name: string;
  email: string;
  role: 'admin' | 'supervisor';
  businessName?: string;
  phone?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  loadUser: () => Promise<void>;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  businessName?: string;
  phone?: string;
}

// ─── Worker ────────────────────────────────────────────────────────
export interface Worker {
  _id: string;
  name: string;
  phone?: string;
  role: string;
  wageType: 'daily' | 'monthly';
  wage: number;
  joiningDate: string;
  status: 'active' | 'inactive';
  overtimeRate?: number;
  notes?: string;
  createdAt: string;
}

export interface WorkerFormData {
  name: string;
  phone?: string;
  role: string;
  wageType: 'daily' | 'monthly';
  wage: number;
  joiningDate: string;
  status?: 'active' | 'inactive';
  overtimeRate?: number;
  notes?: string;
}

// ─── Attendance ────────────────────────────────────────────────────
export type AttendanceStatus = 'present' | 'absent' | 'halfday' | 'leave';

export interface AttendanceRecord {
  _id: string;
  worker: Worker | string;
  date: string;
  status: AttendanceStatus;
  overtimeHours?: number;
  notes?: string;
}

export interface BulkAttendanceItem {
  workerId: string;
  status: AttendanceStatus;
  overtimeHours?: number;
}

// ─── Salary ────────────────────────────────────────────────────────
export interface SalaryBreakdown {
  worker: {
    _id: string;
    name: string;
    role: string;
    wage: number;
    wageType: string;
  };
  totalWorkingDays: number;
  presentDays: number;
  absentDays: number;
  halfDays: number;
  leaveDays: number;
  dailyRate: number;
  grossAmount: number;
  overtimeHours: number;
  overtimePay: number;
  deductions: number;
  netAmount: number;
}

// ─── Payment ───────────────────────────────────────────────────────
export type PaymentMethod = 'cash' | 'bank_transfer' | 'upi' | 'cheque';

export interface Payment {
  _id: string;
  worker: Worker;
  periodStart: string;
  periodEnd: string;
  totalWorkingDays: number;
  presentDays: number;
  absentDays: number;
  halfDays: number;
  leaveDays: number;
  overtimeHours: number;
  grossAmount: number;
  deductions: number;
  advance: number;
  netAmount: number;
  paymentMethod: PaymentMethod;
  paymentDate: string;
  status: 'paid' | 'pending' | 'partial';
  transactionRef?: string;
  notes?: string;
}

export interface PaymentFormData {
  workerId: string;
  periodStart: string;
  periodEnd: string;
  totalWorkingDays: number;
  presentDays: number;
  absentDays: number;
  halfDays: number;
  leaveDays: number;
  overtimeHours: number;
  grossAmount: number;
  deductions: number;
  advance: number;
  netAmount: number;
  paymentMethod: PaymentMethod;
  paymentDate?: string;
  transactionRef?: string;
  notes?: string;
}

// ─── Dashboard ────────────────────────────────────────────────────
export interface DashboardStats {
  totalWorkers: number;
  activeWorkers: number;
  presentToday: number;
  absentToday: number;
  halfToday: number;
  leaveToday: number;
  notMarked: number;
  totalPaidThisMonth: number;
}

export interface DashboardData {
  stats: DashboardStats;
  todayAttendance: AttendanceRecord[];
  recentPayments: Payment[];
  weekChart: Record<string, { present: number; absent: number; halfday: number; leave: number }>;
}

// ─── API Response ─────────────────────────────────────────────────
export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}
