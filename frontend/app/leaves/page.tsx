'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import AppShell from '../../components/layout/AppShell';
import { PageHeader } from '../../components/ui';
import { leavesApi, workersApi } from '../../lib/api';
import { useAuthStore } from '../../lib/store';
import type { Leave } from '../../types';

const TYPES = ['casual', 'sick', 'paid', 'unpaid'] as const;
const TYPE_COLORS: Record<string, string> = {
  casual: '#3B82F6',
  sick: '#F59E0B',
  paid: '#16A34A',
  unpaid: '#6B6B6B',
};

export default function LeavesPage() {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const canApprove = user?.role === 'admin';

  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [form, setForm] = useState({
    workerId: '',
    type: 'casual',
    startDate: '',
    endDate: '',
    reason: '',
  });

  const leavesQ = useQuery({
    queryKey: ['leaves', filter],
    queryFn: () => leavesApi.list(filter === 'all' ? {} : { status: filter }).then((r) => r.data),
  });
  const workersQ = useQuery({
    queryKey: ['workers-min'],
    queryFn: () => workersApi.getAll({ limit: 200 }).then((r) => r.data),
  });

  const createMut = useMutation({
    mutationFn: () => leavesApi.create(form),
    onSuccess: () => {
      qc.refetchQueries({ queryKey: ['leaves'] });
      toast.success('Leave recorded');
      setForm({ workerId: '', type: 'casual', startDate: '', endDate: '', reason: '' });
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });
  const approveMut = useMutation({
    mutationFn: (id: string) => leavesApi.approve(id),
    onSuccess: () => {
      qc.refetchQueries({ queryKey: ['leaves'] });
      toast.success('Leave approved');
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });
  const rejectMut = useMutation({
    mutationFn: (id: string) => leavesApi.reject(id),
    onSuccess: () => {
      qc.refetchQueries({ queryKey: ['leaves'] });
      toast.success('Leave rejected');
    },
  });

  const leaves: Leave[] = leavesQ.data?.leaves || [];

  return (
    <AppShell>
      <div style={{ padding: '28px 32px', maxWidth: 1100 }}>
        <PageHeader title="Leaves" sub="Apply, approve, and track leave for your team">
          <select
            className="form-input"
            style={{ width: 'auto', padding: '8px 12px', fontSize: 13 }}
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
          >
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="all">All</option>
          </select>
        </PageHeader>

        <div className="card" style={{ padding: 20, marginBottom: 24 }}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!form.workerId || !form.startDate || !form.endDate) return;
              createMut.mutate();
            }}
            style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr 2fr auto', gap: 12, alignItems: 'end' }}
          >
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Worker</label>
              <select className="form-input" value={form.workerId} onChange={(e) => setForm({ ...form, workerId: e.target.value })} required>
                <option value="">Select worker…</option>
                {(workersQ.data?.workers || []).map((w: any) => (
                  <option key={w._id} value={w._id}>{w.name} — {w.role}</option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Type</label>
              <select className="form-input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">From</label>
              <input className="form-input" type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} required />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">To</label>
              <input className="form-input" type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} required />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Reason</label>
              <input className="form-input" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="Optional" />
            </div>
            <button className="btn btn-primary" type="submit" disabled={createMut.isPending}>Add leave</button>
          </form>
        </div>

        <div className="card" style={{ padding: 24 }}>
          {leavesQ.isLoading ? (
            <div style={{ color: '#6B6B6B', fontSize: 13 }}>Loading…</div>
          ) : leaves.length === 0 ? (
            <div style={{ color: '#6B6B6B', fontSize: 13 }}>No leaves to show.</div>
          ) : (
            <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', color: '#6B6B6B', borderBottom: '1px solid #E5E0D8' }}>
                  <th style={{ padding: '8px 0', fontWeight: 600 }}>Worker</th>
                  <th style={{ padding: '8px 0', fontWeight: 600 }}>Type</th>
                  <th style={{ padding: '8px 0', fontWeight: 600 }}>Period</th>
                  <th style={{ padding: '8px 0', fontWeight: 600 }}>Days</th>
                  <th style={{ padding: '8px 0', fontWeight: 600 }}>Status</th>
                  <th style={{ padding: '8px 0', fontWeight: 600 }}>Reason</th>
                  {canApprove && <th></th>}
                </tr>
              </thead>
              <tbody>
                {leaves.map((l) => (
                  <tr key={l._id} style={{ borderBottom: '1px solid #F0EBE3' }}>
                    <td style={{ padding: '10px 0', fontWeight: 600 }}>{(l.worker as any)?.name || '—'}</td>
                    <td style={{ padding: '10px 0', color: TYPE_COLORS[l.type], textTransform: 'capitalize', fontWeight: 600 }}>{l.type}</td>
                    <td style={{ padding: '10px 0' }}>
                      {new Date(l.startDate).toLocaleDateString()} – {new Date(l.endDate).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '10px 0' }}>{l.totalDays}</td>
                    <td style={{ padding: '10px 0', textTransform: 'capitalize' }}>
                      <span style={{
                        background: l.status === 'pending' ? '#FEF3C7' : l.status === 'approved' ? '#D1FAE5' : '#FEE2E2',
                        color: l.status === 'pending' ? '#92400E' : l.status === 'approved' ? '#065F46' : '#991B1B',
                        padding: '2px 8px',
                        borderRadius: 12,
                        fontSize: 11,
                        fontWeight: 600,
                      }}>{l.status}</span>
                    </td>
                    <td style={{ padding: '10px 0', color: '#6B6B6B' }}>{l.reason || '—'}</td>
                    {canApprove && (
                      <td style={{ padding: '10px 0', textAlign: 'right' }}>
                        {l.status === 'pending' && (
                          <>
                            <button className="btn" style={{ fontSize: 12, marginRight: 8 }} onClick={() => approveMut.mutate(l._id)}>Approve</button>
                            <button className="btn" style={{ fontSize: 12, color: '#DC2626' }} onClick={() => rejectMut.mutate(l._id)}>Reject</button>
                          </>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AppShell>
  );
}
