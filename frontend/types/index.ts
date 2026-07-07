// ─── Auth ──────────────────────────────────────────────────────────
export type Role = 'admin' | 'supervisor' | 'accountant' | 'viewer';

export interface Organization {
  _id: string;
  name: string;
  slug: string;
  plan: 'free' | 'pro' | 'business';
  currency: string;
  timezone: string;
  country: string;
  industry?: string;
  phone?: string;
  address?: string;
  logoUrl?: string;
  seatLimit?: number;
  workerLimit?: number;
  trialEndsAt?: string | null;
}

export interface User {
  _id: string;
  name: string;
  email: string;
  role: Role;
  isOwner?: boolean;
  emailVerified?: boolean;
  businessName?: string;
  phone?: string;
  organization?: Organization | null;
  permissions?: string[];
}

export interface Member {
  _id: string;
  name: string;
  email: string;
  role: Role;
  isOwner: boolean;
  emailVerified: boolean;
  lastLoginAt?: string | null;
  createdAt: string;
}

export interface Invite {
  _id: string;
  email: string;
  role: Role;
  status: 'pending' | 'accepted' | 'revoked' | 'expired';
  invitedBy?: { _id: string; name: string; email: string } | null;
  expiresAt: string;
  acceptedAt?: string | null;
  createdAt: string;
}

export interface AuditLogEntry {
  _id: string;
  action: string;
  resource: string;
  resourceId: string;
  actor?: { _id: string; name: string; email: string } | null;
  actorEmail: string;
  metadata?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
  createdAt: string;
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

// ─── Holidays / Leaves / Advances / Shifts / Sites ────────────────
export interface Holiday {
  _id: string;
  name: string;
  date: string;
  paid: boolean;
  region?: string;
  notes?: string;
}

export type LeaveType = 'casual' | 'sick' | 'paid' | 'unpaid';
export type LeaveStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface Leave {
  _id: string;
  worker: { _id: string; name: string; role: string; photoUrl?: string } | string;
  type: LeaveType;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason?: string;
  status: LeaveStatus;
  reviewedBy?: { _id: string; name: string; email: string } | null;
  reviewedAt?: string | null;
  reviewNote?: string;
  createdAt: string;
}

export type AdvanceType = 'advance' | 'loan';
export type AdvanceStatus = 'active' | 'cleared' | 'written_off';

export interface Advance {
  _id: string;
  worker: { _id: string; name: string; role: string; photoUrl?: string } | string;
  type: AdvanceType;
  amount: number;
  repaid: number;
  remaining: number;
  installmentAmount?: number;
  issuedOn: string;
  status: AdvanceStatus;
  reason?: string;
  repayments?: Array<{ amount: number; date: string; note?: string }>;
}

export interface Shift {
  _id: string;
  name: string;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  lateAfterMinutes: number;
  overtimeAfterMinutes: number;
  weeklyOffs: number[];
  color: string;
  isDefault: boolean;
}

export interface Site {
  _id: string;
  name: string;
  address?: string;
  lat?: number | null;
  lng?: number | null;
  radiusMeters: number;
  geofenceEnabled: boolean;
  kioskToken: string;
}

// ─── Worker portal ────────────────────────────────────────────────
export interface WorkerSession {
  _id: string;
  name: string;
  role: string;
  phone: string;
  photoUrl?: string;
  organization: { _id: string; name: string; slug: string; currency?: string };
  site?: Site | null;
  shift?: Shift | null;
  leaveBalance?: { casual: number; sick: number; paid: number };
}
