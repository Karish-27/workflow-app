'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import AppShell from '../../components/layout/AppShell';
import { PageHeader } from '../../components/ui';
import { holidaysApi } from '../../lib/api';
import { useAuthStore } from '../../lib/store';
import type { Holiday } from '../../types';

export default function HolidaysPage() {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const canEdit = user?.role === 'admin';

  const [year, setYear] = useState(new Date().getFullYear());
  const [form, setForm] = useState({ name: '', date: '', paid: true });

  const { data, isLoading } = useQuery({
    queryKey: ['holidays', year],
    queryFn: () => holidaysApi.list(year).then((r) => r.data),
  });

  const upsertMut = useMutation({
    mutationFn: () => holidaysApi.upsert(form),
    onSuccess: () => {
      qc.refetchQueries({ queryKey: ['holidays'] });
      toast.success('Holiday saved');
      setForm({ name: '', date: '', paid: true });
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const removeMut = useMutation({
    mutationFn: (id: string) => holidaysApi.remove(id),
    onSuccess: () => {
      qc.refetchQueries({ queryKey: ['holidays'] });
      toast.success('Holiday removed');
    },
  });

  const holidays: Holiday[] = data?.holidays || [];

  return (
    <AppShell>
      <div style={{ padding: '28px 32px', maxWidth: 960 }}>
        <PageHeader title="Holidays" sub="Public & company holidays — exclude these from absence calculations.">
          <select
            className="form-input"
            style={{ width: 'auto', padding: '8px 12px', fontSize: 13 }}
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value))}
          >
            {[2024, 2025, 2026, 2027].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </PageHeader>

        {canEdit && (
          <div className="card" style={{ padding: 20, marginBottom: 24 }}>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!form.name || !form.date) return;
                upsertMut.mutate();
              }}
              style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto auto', gap: 12, alignItems: 'end' }}
            >
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Holiday name</label>
                <input className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Diwali" required />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Date</label>
                <input className="form-input" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
              </div>
              <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 13, paddingBottom: 8 }}>
                <input type="checkbox" checked={form.paid} onChange={(e) => setForm({ ...form, paid: e.target.checked })} /> Paid
              </label>
              <button className="btn btn-primary" type="submit" disabled={upsertMut.isPending}>Add</button>
            </form>
          </div>
        )}

        <div className="card" style={{ padding: 24 }}>
          {isLoading ? (
            <div style={{ color: '#6B6B6B', fontSize: 13 }}>Loading…</div>
          ) : holidays.length === 0 ? (
            <div style={{ color: '#6B6B6B', fontSize: 13 }}>No holidays for {year} yet.</div>
          ) : (
            <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', color: '#6B6B6B', borderBottom: '1px solid #E5E0D8' }}>
                  <th style={{ padding: '8px 0', fontWeight: 600 }}>Date</th>
                  <th style={{ padding: '8px 0', fontWeight: 600 }}>Name</th>
                  <th style={{ padding: '8px 0', fontWeight: 600 }}>Type</th>
                  {canEdit && <th></th>}
                </tr>
              </thead>
              <tbody>
                {holidays.map((h) => (
                  <tr key={h._id} style={{ borderBottom: '1px solid #F0EBE3' }}>
                    <td style={{ padding: '10px 0' }}>{new Date(h.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                    <td style={{ padding: '10px 0', fontWeight: 600 }}>{h.name}</td>
                    <td style={{ padding: '10px 0' }}>{h.paid ? <span style={{ color: '#16A34A' }}>Paid</span> : <span style={{ color: '#6B6B6B' }}>Unpaid</span>}</td>
                    {canEdit && (
                      <td style={{ padding: '10px 0', textAlign: 'right' }}>
                        <button className="btn" style={{ fontSize: 12, color: '#DC2626' }} onClick={() => removeMut.mutate(h._id)}>Remove</button>
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
