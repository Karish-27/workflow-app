'use client';
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, getDaysInMonth } from 'date-fns';
import toast from 'react-hot-toast';
import AppShell from '../../components/layout/AppShell';
import { Avatar, PageHeader, AttendanceDot } from '../../components/ui';
import { workersApi, attendanceApi } from '../../lib/api';
import { ATTENDANCE_CONFIG, ATT_CYCLE, nextStatus, formatCurrency } from '../../lib/utils';
import { AttendanceStatus, Worker } from '../../types';

export default function AttendancePage() {
  const qc = useQueryClient();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [pendingChanges, setPendingChanges] = useState<Record<string, Record<number, AttendanceStatus>>>({});
  const [saving, setSaving] = useState(false);

  const { data: workersData } = useQuery({
    queryKey: ['workers-active'],
    queryFn: () => workersApi.getAll({ status: 'active' }).then(r => r.data),
  });

  const { data: attData, refetch } = useQuery({
    queryKey: ['attendance', month, year],
    queryFn: () => attendanceApi.getAll({ month, year }).then(r => r.data),
  });

  const workers: Worker[] = workersData?.workers || [];
  const records = attData?.records || [];

  // Build a lookup: workerId -> day -> status
  const attMap: Record<string, Record<number, AttendanceStatus>> = {};
  records.forEach((r: any) => {
    const wId = typeof r.worker === 'string' ? r.worker : r.worker?._id;
    const day = new Date(r.date).getDate();
    if (!attMap[wId]) attMap[wId] = {};
    attMap[wId][day] = r.status;
  });

  // Merge pending
  const getStatus = (workerId: string, day: number): AttendanceStatus | null => {
    return pendingChanges[workerId]?.[day] ?? attMap[workerId]?.[day] ?? null;
  };

  const toggleStatus = (workerId: string, day: number) => {
    const current = getStatus(workerId, day) || 'absent';
    const next = nextStatus(current);
    setPendingChanges(prev => ({
      ...prev,
      [workerId]: { ...(prev[workerId] || {}), [day]: next },
    }));
  };

  const saveAll = async () => {
    setSaving(true);
    try {
      const ops: any[] = [];
      Object.entries(pendingChanges).forEach(([workerId, days]) => {
        Object.entries(days).forEach(([day, status]) => {
          const date = new Date(year, month - 1, parseInt(day));
          ops.push(attendanceApi.mark({ workerId, date: date.toISOString(), status }));
        });
      });
      await Promise.all(ops);
      setPendingChanges({});
      refetch();
      toast.success(`Saved ${ops.length} attendance records`);
    } catch { toast.error('Failed to save'); }
    finally { setSaving(false); }
  };

  const markAllPresent = () => {
    const days = getDaysInMonth(new Date(year, month - 1));
    const changes: Record<string, Record<number, AttendanceStatus>> = {};
    workers.forEach(w => {
      changes[w._id] = {};
      for (let d = 1; d <= Math.min(days, now.getDate()); d++) {
        changes[w._id][d] = 'present';
      }
    });
    setPendingChanges(changes);
    toast('All marked present – click Save to confirm', { icon: '📋' });
  };

  const daysInMonth = getDaysInMonth(new Date(year, month - 1));
  const today = now.getDate();
  const isCurrentMonth = month === now.getMonth() + 1 && year === now.getFullYear();
  const maxDay = isCurrentMonth ? today : daysInMonth;

  const hasPending = Object.keys(pendingChanges).length > 0;

  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: format(new Date(year, i, 1), 'MMMM'),
  }));

  const getSummary = (workerId: string) => {
    const present = Array.from({ length: maxDay }, (_, i) => i + 1).filter(d => getStatus(workerId, d) === 'present').length;
    const absent = Array.from({ length: maxDay }, (_, i) => i + 1).filter(d => getStatus(workerId, d) === 'absent').length;
    const half = Array.from({ length: maxDay }, (_, i) => i + 1).filter(d => getStatus(workerId, d) === 'halfday').length;
    const leave = Array.from({ length: maxDay }, (_, i) => i + 1).filter(d => getStatus(workerId, d) === 'leave').length;
    return { present, absent, half, leave };
  };

  const getEstPay = (worker: Worker, workerId: string) => {
    const { present, half } = getSummary(workerId);
    return Math.round(present * worker.wage + half * (worker.wage / 2));
  };

  return (
    <AppShell>
      <div style={{ padding: '28px 32px' }}>
        <PageHeader title="Attendance" sub={`${format(new Date(year, month - 1, 1), 'MMMM yyyy')}`}>
          <select className="form-input" style={{ width: 'auto', padding: '8px 12px', fontSize: 13 }} value={month} onChange={e => setMonth(+e.target.value)}>
            {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
          <select className="form-input" style={{ width: 'auto', padding: '8px 12px', fontSize: 13 }} value={year} onChange={e => setYear(+e.target.value)}>
            {[2024, 2025, 2026].map(y => <option key={y}>{y}</option>)}
          </select>
          <button className="btn btn-ghost btn-sm" onClick={markAllPresent}>Mark All Present</button>
          {hasPending && (
            <button className="btn btn-green btn-sm" onClick={saveAll} disabled={saving}>
              {saving ? <><span className="spinner" />Saving...</> : `Save Changes (${Object.values(pendingChanges).reduce((a, d) => a + Object.keys(d).length, 0)})`}
            </button>
          )}
        </PageHeader>

        {/* Legend */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
          {(Object.entries(ATTENDANCE_CONFIG) as any[]).map(([key, cfg]) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#6B6B6B' }}>
              <div style={{ width: 22, height: 22, borderRadius: 5, background: cfg.bg, color: cfg.text, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>{cfg.short}</div>
              {cfg.label}
            </div>
          ))}
          <div style={{ fontSize: 12, color: '#6B6B6B', marginLeft: 8 }}>· Click a dot to cycle status</div>
          {hasPending && <span className="badge badge-yellow">Unsaved changes</span>}
        </div>

        {workers.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: 48, color: '#6B6B6B' }}>No active workers. Add workers first.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <div className="table-wrap" style={{ minWidth: 900 }}>
              {/* Header row */}
              <div style={{ display: 'flex', alignItems: 'center', padding: '10px 16px', background: '#FAFAF8', borderBottom: '1px solid #E5E0D8' }}>
                <div style={{ minWidth: 160, fontSize: 11, fontWeight: 600, color: '#6B6B6B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Worker</div>
                <div style={{ display: 'flex', gap: 4, flex: 1 }}>
                  {Array.from({ length: maxDay }, (_, i) => i + 1).map(d => (
                    <div key={d} style={{ width: 28, textAlign: 'center', fontSize: 11, fontWeight: 700, color: d === today && isCurrentMonth ? '#FF5C3A' : '#6B6B6B' }}>{d}</div>
                  ))}
                </div>
                <div style={{ minWidth: 90, textAlign: 'center', fontSize: 11, fontWeight: 600, color: '#6B6B6B', textTransform: 'uppercase' }}>P/A/H/L</div>
                <div style={{ minWidth: 90, textAlign: 'right', fontSize: 11, fontWeight: 600, color: '#6B6B6B', textTransform: 'uppercase' }}>Est. Pay</div>
              </div>

              {/* Worker rows */}
              {workers.map((w, i) => {
                const summary = getSummary(w._id);
                const estPay = getEstPay(w, w._id);
                return (
                  <div key={w._id} style={{ display: 'flex', alignItems: 'center', padding: '10px 16px', borderBottom: '1px solid #E5E0D8', background: pendingChanges[w._id] ? '#FFFBF5' : '#fff' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 160 }}>
                      <Avatar name={w.name} size={30} index={i} />
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600 }}>{w.name.split(' ')[0]}</div>
                        <div style={{ fontSize: 10, color: '#6B6B6B' }}>{w.role}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 4, flex: 1 }}>
                      {Array.from({ length: maxDay }, (_, i) => i + 1).map(d => {
                        const st = getStatus(w._id, d);
                        const isPending = pendingChanges[w._id]?.[d] !== undefined;
                        return (
                          <button
                            key={d}
                            onClick={() => toggleStatus(w._id, d)}
                            title={st ? ATTENDANCE_CONFIG[st]?.label : 'Not marked'}
                            style={{
                              width: 28, height: 28, borderRadius: 6, border: isPending ? '2px solid #F59E0B' : 'none',
                              background: st ? ATTENDANCE_CONFIG[st]?.bg : '#F9F9F9',
                              color: st ? ATTENDANCE_CONFIG[st]?.text : '#CBD5E1',
                              fontSize: 10, fontWeight: 700, cursor: 'pointer', transition: 'transform 0.1s',
                            }}
                            onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.12)')}
                            onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
                          >
                            {st ? ATTENDANCE_CONFIG[st]?.short : '·'}
                          </button>
                        );
                      })}
                    </div>
                    <div style={{ minWidth: 90, textAlign: 'center', fontSize: 12, color: '#6B6B6B' }}>
                      {summary.present}/{summary.absent}/{summary.half}/{summary.leave}
                    </div>
                    <div style={{ minWidth: 90, textAlign: 'right', fontSize: 13, fontWeight: 700, color: '#10B981', fontFamily: "'Syne',sans-serif" }}>
                      {formatCurrency(estPay)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
