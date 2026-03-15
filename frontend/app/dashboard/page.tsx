'use client';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import Link from 'next/link';
import AppShell from '../../components/layout/AppShell';
import { StatCard, SectionHeader, Avatar, LoadingRows } from '../../components/ui';
import { dashboardApi, attendanceApi, workersApi } from '../../lib/api';
import { formatCurrency, formatDate, ATTENDANCE_CONFIG } from '../../lib/utils';
import { useAuthStore } from '../../lib/store';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useState } from 'react';
import toast from 'react-hot-toast';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const today = format(new Date(), 'EEEE, dd MMMM yyyy');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => dashboardApi.get().then(r => r.data),
  });

  const { data: workersData } = useQuery({
    queryKey: ['workers-active'],
    queryFn: () => workersApi.getAll({ status: 'active' }).then(r => r.data),
  });

  const { data: todayData, refetch: refetchToday } = useQuery({
    queryKey: ['today-attendance'],
    queryFn: () => attendanceApi.getToday().then(r => r.data),
  });

  const [markingId, setMarkingId] = useState<string | null>(null);

  const markAttendance = async (workerId: string, status: string) => {
    setMarkingId(workerId);
    try {
      await attendanceApi.mark({ workerId, date: new Date().toISOString(), status });
      refetchToday();
      refetch();
      toast.success('Attendance marked');
    } catch { toast.error('Failed to mark attendance'); }
    finally { setMarkingId(null); }
  };

  const stats = data?.stats;
  const weekChartData = data?.weekChart
    ? Object.entries(data.weekChart).map(([date, counts]: any) => ({
        date: format(new Date(date), 'EEE'),
        present: counts.present || 0,
        absent: counts.absent || 0,
      }))
    : [];

  const activeWorkers = workersData?.workers || [];
  const todayRecords = todayData?.records || [];

  const getWorkerStatus = (workerId: string) =>
    todayRecords.find((r: any) => {
      const wId = typeof r.worker === 'string' ? r.worker : r.worker?._id;
      return wId === workerId;
    })?.status || null;

  return (
    <AppShell>
      <div style={{ padding: '28px 32px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontFamily: "'Raleway',sans-serif", fontSize: 26, fontWeight: 800, letterSpacing: '-0.5px' }}>
              Good morning, {user?.name?.split(' ')[0]} 👋
            </h1>
            <p style={{ fontSize: 13, color: '#6B6B6B', marginTop: 4 }}>{today}</p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <Link href="/workers" className="btn btn-ghost btn-sm">+ Add Worker</Link>
            <Link href="/attendance" className="btn btn-primary btn-sm">Mark Attendance</Link>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 28 }}>
          <StatCard label="Total Workers" value={isLoading ? '–' : stats?.totalWorkers ?? 0} sub={`${stats?.activeWorkers ?? 0} active`} color="#3B82F6" />
          <StatCard label="Present Today" value={isLoading ? '–' : stats?.presentToday ?? 0} sub={`${stats?.notMarked ?? 0} not yet marked`} color="#10B981" />
          <StatCard label="Absent Today" value={isLoading ? '–' : stats?.absentToday ?? 0} sub={`${stats?.leaveToday ?? 0} on leave`} color="#FF5C3A" />
          <StatCard label="Payable This Month" value={isLoading ? '–' : formatCurrency(stats?.totalPaidThisMonth ?? 0)} sub="Paid so far" color="#F59E0B" />
        </div>

        {/* Today's attendance quick-mark + week chart */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20, marginBottom: 24 }}>
          {/* Quick mark */}
          <div>
            <SectionHeader title="Today's Attendance">
              <Link href="/attendance" style={{ fontSize: 12, color: '#FF5C3A', textDecoration: 'none', fontWeight: 600 }}>View all →</Link>
            </SectionHeader>
            <div className="table-wrap">
              {activeWorkers.slice(0, 8).map((w: any, i: number) => {
                const currentStatus = getWorkerStatus(w._id);
                return (
                  <div key={w._id} style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid #E5E0D8', gap: 12 }}>
                    <Avatar name={w.name} size={34} index={i} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{w.name}</div>
                      <div style={{ fontSize: 11, color: '#6B6B6B' }}>{w.role}</div>
                    </div>
                    {currentStatus && (
                      <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99, background: ATTENDANCE_CONFIG[currentStatus as keyof typeof ATTENDANCE_CONFIG]?.bg, color: ATTENDANCE_CONFIG[currentStatus as keyof typeof ATTENDANCE_CONFIG]?.text }}>
                        {ATTENDANCE_CONFIG[currentStatus as keyof typeof ATTENDANCE_CONFIG]?.label}
                      </span>
                    )}
                    <div style={{ display: 'flex', gap: 4 }}>
                      {(['present','absent','halfday','leave'] as const).map(s => (
                        <button
                          key={s}
                          disabled={markingId === w._id}
                          onClick={() => markAttendance(w._id, s)}
                          style={{
                            width: 28, height: 28, borderRadius: 6, border: 'none', cursor: 'pointer',
                            background: currentStatus === s ? ATTENDANCE_CONFIG[s].bg : '#F3F4F6',
                            color: currentStatus === s ? ATTENDANCE_CONFIG[s].text : '#9CA3AF',
                            fontSize: 10, fontWeight: 700, transition: 'all .1s',
                          }}
                        >
                          {ATTENDANCE_CONFIG[s].short}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
              {activeWorkers.length === 0 && (
                <div style={{ padding: 24, textAlign: 'center', fontSize: 13, color: '#6B6B6B' }}>
                  No active workers yet. <Link href="/workers" style={{ color: '#FF5C3A' }}>Add one →</Link>
                </div>
              )}
            </div>
          </div>

          {/* Week chart */}
          <div>
            <SectionHeader title="This Week" />
            <div className="card" style={{ height: 'calc(100% - 34px)' }}>
              {weekChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={weekChartData} barSize={16} barGap={4}>
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#6B6B6B' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#6B6B6B' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E5E0D8' }} />
                    <Bar dataKey="present" fill="#10B981" radius={[4, 4, 0, 0]} name="Present" />
                    <Bar dataKey="absent" fill="#FEE2E2" radius={[4, 4, 0, 0]} name="Absent" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: '#6B6B6B', fontSize: 13 }}>
                  No data yet
                </div>
              )}
              <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#6B6B6B' }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: '#10B981' }} />Present
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#6B6B6B' }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: '#FEE2E2' }} />Absent
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent payments */}
        <SectionHeader title="Recent Payments">
          <Link href="/payments" style={{ fontSize: 12, color: '#FF5C3A', textDecoration: 'none', fontWeight: 600 }}>View all →</Link>
        </SectionHeader>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Worker</th><th>Period</th><th>Method</th><th>Date</th><th>Amount</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? <LoadingRows rows={4} cols={6} /> : data?.recentPayments?.length > 0 ? (
                data.recentPayments.map((p: any) => (
                  <tr key={p._id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Avatar name={typeof p.worker === 'object' ? p.worker.name : '?'} size={28} />
                        <span style={{ fontWeight: 600 }}>{typeof p.worker === 'object' ? p.worker.name : '—'}</span>
                      </div>
                    </td>
                    <td style={{ color: '#6B6B6B', fontSize: 12 }}>{formatDate(p.periodStart, 'MMM yyyy')}</td>
                    <td><span className="badge badge-blue">{p.paymentMethod?.replace('_',' ')}</span></td>
                    <td style={{ color: '#6B6B6B', fontSize: 12 }}>{formatDate(p.paymentDate)}</td>
                    <td><span style={{ fontFamily: "'Raleway',sans-serif", fontWeight: 800, color: '#10B981' }}>{formatCurrency(p.netAmount)}</span></td>
                    <td><span className="badge badge-green">Paid</span></td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: '#6B6B6B', padding: 24 }}>No payments yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
