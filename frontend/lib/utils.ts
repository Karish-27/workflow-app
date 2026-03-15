import { format, parseISO } from 'date-fns';
import { AttendanceStatus } from '../types';

export const WORKER_COLORS = [
  '#FF5C3A', '#3B82F6', '#10B981', '#8B5CF6',
  '#F59E0B', '#EC4899', '#14B8A6', '#F97316',
  '#6366F1', '#84CC16', '#EF4444', '#06B6D4',
];

export function getWorkerColor(index: number): string {
  return WORKER_COLORS[index % WORKER_COLORS.length];
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: string | Date, fmt = 'dd MMM yyyy'): string {
  try {
    const d = typeof date === 'string' ? parseISO(date) : date;
    return format(d, fmt);
  } catch {
    return '';
  }
}

export function formatDateShort(date: string | Date): string {
  return formatDate(date, 'dd MMM');
}

export const ATTENDANCE_CONFIG: Record<
  AttendanceStatus,
  { label: string; short: string; bg: string; text: string; border: string }
> = {
  present: {
    label: 'Present',
    short: 'P',
    bg: '#D1FAE5',
    text: '#065F46',
    border: '#6EE7B7',
  },
  absent: {
    label: 'Absent',
    short: 'A',
    bg: '#FEE2E2',
    text: '#991B1B',
    border: '#FCA5A5',
  },
  halfday: {
    label: 'Half Day',
    short: 'H',
    bg: '#FEF3C7',
    text: '#92400E',
    border: '#FCD34D',
  },
  leave: {
    label: 'Leave',
    short: 'L',
    bg: '#DBEAFE',
    text: '#1E40AF',
    border: '#93C5FD',
  },
};

export const ATT_CYCLE: AttendanceStatus[] = ['present', 'absent', 'halfday', 'leave'];

export function nextStatus(current: AttendanceStatus): AttendanceStatus {
  const idx = ATT_CYCLE.indexOf(current);
  return ATT_CYCLE[(idx + 1) % ATT_CYCLE.length];
}

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: 'Cash',
  bank_transfer: 'Bank Transfer',
  upi: 'UPI',
  cheque: 'Cheque',
};

export const ROLES = [
  'Mason', 'Carpenter', 'Electrician', 'Plumber',
  'Helper', 'Supervisor', 'Painter', 'Welder', 'Driver', 'Security',
];

export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export function getMonthOptions(): { label: string; value: string }[] {
  const months = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(2026, i, 1);
    months.push({
      label: format(d, 'MMMM yyyy'),
      value: `${i + 1}-2026`,
    });
  }
  return months.reverse();
}
