'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import AppShell from '../../components/layout/AppShell';
import { PageHeader } from '../../components/ui';
import { advancesApi, workersApi } from '../../lib/api';
import { useAuthStore } from '../../lib/store';
import { formatCurrency } from '../../lib/utils';
import type { Advance } from '../../types';

export default function AdvancesPage() {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const canManage = user?.role === 'admin' || user?.role === 'accountant';

  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'cleared'>('active');
  const [form, setForm] = useState({
    workerId: '',
    amount: 0,
    type: 'advance',
    reason: '',
    installmentAmount: 0,
  });
  const [repayId, setRepayId] = useState<string | null>(null);
  const [repayAmount, setRepayAmount] = useState(0);

  const advancesQ = useQuery({
    queryKey: ['advances', statusFilter],
    queryFn: () =>
      advancesApi.list(statusFilter === 'all' ? {} : { status: statusFilter }).then((r) => r.data),
  });
  const workersQ = useQuery({
    queryKey: ['workers-min'],
    queryFn: () => workersApi.getAll({ limit: 200 }).then((r) => r.data),
  });

  const createMut = useMutation({
    mutationFn: () => advancesApi.create(form),
    onSuccess: () => {
      qc.refetchQueries({ queryKey: ['advances'] });
      toast.success('Advance issued');
      setForm({ workerId: '', amount: 0, type: 'advance', reason: '', installmentAmount: 0 });
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const repayMut = useMutation({
    mutationFn: () => advancesApi.repay(repayId!, repayAmount),
    onSuccess: () => {
      qc.refetchQueries({ queryKey: ['advances'] });
      toast.success('Repayment recorded');
      setRepayId(null);
      setRepayAmount(0);
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const advances: Advance[] = advancesQ.data?.advances || [];

  return (
    <AppShell>
      <div style={{ padding: '28px 32px', maxWidth: 1100 }}>
        <PageHeader title="Advances & loans" sub="Issue and track repayment of worker advances">
          <select
            className="form-input"
            style={{ width: 'auto', padding: '8px 12px', fontSize: 13 }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
          >
            <option value="active">Active</option>
            <option value="cleared">Cleared</option>
            <option value="all">All</option>
          </select>
        </PageHeader>

        {canManage && (
          <div className="card" style={{ padding: 20, marginBottom: 24 }}>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!form.workerId || !form.amount) return;
                createMut.mutate();
              }}
              style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr 1.5fr auto', gap: 12, alignItems: 'end' }}
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
                  <option value="advance">Advance</option>
                  <option value="loan">Loan</option>
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Amount</label>
                <input className="form-input" type="number" min={1} value={form.amount || ''} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} required />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Per-month deduction</label>
                <input className="form-input" type="number" min={0} value={form.installmentAmount || ''} onChange={(e) => setForm({ ...form, installmentAmount: Number(e.target.value) })} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Reason</label>
                <input className="form-input" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="Optional" />
              </div>
              <button className="btn btn-primary" type="submit" disabled={createMut.isPending}>Issue</button>
            </form>
          </div>
        )}

        <div className="card" style={{ padding: 24 }}>
          {advancesQ.isLoading ? (
            <div style={{ color: '#6B6B6B', fontSize: 13 }}>Loading…</div>
          ) : advances.length === 0 ? (
            <div style={{ color: '#6B6B6B', fontSize: 13 }}>No advances to show.</div>
          ) : (
            <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', color: '#6B6B6B', borderBottom: '1px solid #E5E0D8' }}>
                  <th style={{ padding: '8px 0', fontWeight: 600 }}>Worker</th>
                  <th style={{ padding: '8px 0', fontWeight: 600 }}>Type</th>
                  <th style={{ padding: '8px 0', fontWeight: 600 }}>Issued</th>
                  <th style={{ padding: '8px 0', fontWeight: 600 }}>Amount</th>
                  <th style={{ padding: '8px 0', fontWeight: 600 }}>Repaid</th>
                  <th style={{ padding: '8px 0', fontWeight: 600 }}>Remaining</th>
                  <th style={{ padding: '8px 0', fontWeight: 600 }}>Status</th>
                  {canManage && <th></th>}
                </tr>
              </thead>
              <tbody>
                {advances.map((a) => (
                  <tr key={a._id} style={{ borderBottom: '1px solid #F0EBE3' }}>
                    <td style={{ padding: '10px 0', fontWeight: 600 }}>{(a.worker as any)?.name || '—'}</td>
                    <td style={{ padding: '10px 0', textTransform: 'capitalize' }}>{a.type}</td>
                    <td style={{ padding: '10px 0' }}>{new Date(a.issuedOn).toLocaleDateString()}</td>
                    <td style={{ padding: '10px 0', fontWeight: 600 }}>{formatCurrency(a.amount)}</td>
                    <td style={{ padding: '10px 0', color: '#16A34A' }}>{formatCurrency(a.repaid)}</td>
                    <td style={{ padding: '10px 0', color: '#DC2626' }}>{formatCurrency(a.remaining)}</td>
                    <td style={{ padding: '10px 0', textTransform: 'capitalize' }}>{a.status.replace('_', ' ')}</td>
                    {canManage && a.status === 'active' && (
                      <td style={{ padding: '10px 0', textAlign: 'right' }}>
                        <button className="btn" style={{ fontSize: 12 }} onClick={() => { setRepayId(a._id); setRepayAmount(Math.min(a.installmentAmount || a.remaining, a.remaining)); }}>
                          Record repayment
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {repayId && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }} onClick={() => setRepayId(null)}>
            <div className="card" style={{ padding: 24, width: 380 }} onClick={(e) => e.stopPropagation()}>
              <h2 style={{ fontFamily: "'Syne',sans-serif", fontSize: 18, fontWeight: 800, marginBottom: 12 }}>Record repayment</h2>
              <form onSubmit={(e) => { e.preventDefault(); if (repayAmount > 0) repayMut.mutate(); }}>
                <div className="form-group">
                  <label className="form-label">Amount</label>
                  <input className="form-input" type="number" min={1} value={repayAmount || ''} onChange={(e) => setRepayAmount(Number(e.target.value))} required />
                </div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button className="btn" type="button" onClick={() => setRepayId(null)}>Cancel</button>
                  <button className="btn btn-primary" type="submit" disabled={repayMut.isPending}>Record</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
