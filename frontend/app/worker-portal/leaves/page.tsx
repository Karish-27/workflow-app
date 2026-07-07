'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { workerPortalApi } from '../../../lib/api';
import type { Leave } from '../../../types';

export default function MyLeavesPage() {
  const router = useRouter();
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [form, setForm] = useState({ type: 'casual', startDate: '', endDate: '', reason: '' });
  const [submitting, setSubmitting] = useState(false);

  const load = () => workerPortalApi.myLeaves().then((r) => setLeaves(r.data.leaves || []));

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('wf_worker_token') : null;
    if (!token) {
      router.replace('/worker-portal/login');
      return;
    }
    load();
  }, [router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.startDate || !form.endDate) return;
    setSubmitting(true);
    try {
      await workerPortalApi.applyLeave(form);
      toast.success('Leave request submitted');
      setForm({ type: 'casual', startDate: '', endDate: '', reason: '' });
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#F7F4EF', padding: 16 }}>
      <div style={{ maxWidth: 480, margin: '0 auto' }}>
        <Link href="/worker-portal" style={{ fontSize: 13, color: '#FF5C3A', textDecoration: 'none' }}>
          ← Back
        </Link>
        <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 24, fontWeight: 800, margin: '12px 0 20px' }}>Leaves</h1>

        <div className="card" style={{ padding: 20, marginBottom: 20 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Apply for leave</h2>
          <form onSubmit={submit}>
            <div className="form-group">
              <label className="form-label">Type</label>
              <select className="form-input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                <option value="casual">Casual</option>
                <option value="sick">Sick</option>
                <option value="paid">Paid</option>
                <option value="unpaid">Unpaid</option>
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div className="form-group">
                <label className="form-label">From</label>
                <input className="form-input" type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">To</label>
                <input className="form-input" type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} required />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Reason (optional)</label>
              <textarea className="form-input" rows={2} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
            </div>
            <button className="btn btn-primary" type="submit" disabled={submitting} style={{ width: '100%' }}>
              {submitting ? 'Submitting…' : 'Submit request'}
            </button>
          </form>
        </div>

        <h2 style={{ fontSize: 14, fontWeight: 700, color: '#6B6B6B', marginBottom: 10 }}>My requests</h2>
        {leaves.length === 0 ? (
          <div className="card" style={{ padding: 16, color: '#6B6B6B', fontSize: 13 }}>No leave requests yet.</div>
        ) : (
          leaves.map((l) => (
            <div key={l._id} className="card" style={{ padding: 14, marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontWeight: 600, textTransform: 'capitalize' }}>{l.type} leave</div>
                  <div style={{ fontSize: 12, color: '#6B6B6B' }}>
                    {new Date(l.startDate).toLocaleDateString()} – {new Date(l.endDate).toLocaleDateString()} · {l.totalDays} day(s)
                  </div>
                  {l.reason && <div style={{ fontSize: 11, color: '#6B6B6B', marginTop: 4 }}>{l.reason}</div>}
                </div>
                <span style={{
                  background: l.status === 'pending' ? '#FEF3C7' : l.status === 'approved' ? '#D1FAE5' : '#FEE2E2',
                  color: l.status === 'pending' ? '#92400E' : l.status === 'approved' ? '#065F46' : '#991B1B',
                  padding: '2px 8px',
                  borderRadius: 12,
                  fontSize: 11,
                  fontWeight: 600,
                  textTransform: 'capitalize',
                  alignSelf: 'flex-start',
                }}>{l.status}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
