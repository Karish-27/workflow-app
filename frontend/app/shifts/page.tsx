'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import AppShell from '../../components/layout/AppShell';
import { PageHeader } from '../../components/ui';
import { shiftsApi } from '../../lib/api';
import { useAuthStore } from '../../lib/store';
import type { Shift } from '../../types';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const EMPTY = {
  name: '',
  startTime: '09:00',
  endTime: '18:00',
  breakMinutes: 60,
  lateAfterMinutes: 15,
  overtimeAfterMinutes: 30,
  weeklyOffs: [0] as number[],
  isDefault: false,
  color: '#FF5C3A',
};

export default function ShiftsPage() {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const canEdit = user?.role === 'admin';
  const [editing, setEditing] = useState<Shift | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [showForm, setShowForm] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['shifts'],
    queryFn: () => shiftsApi.list().then((r) => r.data),
  });

  const createMut = useMutation({
    mutationFn: () => shiftsApi.create(form),
    onSuccess: () => {
      qc.refetchQueries({ queryKey: ['shifts'] });
      toast.success('Shift created');
      setShowForm(false);
      setForm(EMPTY);
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });
  const updateMut = useMutation({
    mutationFn: () => shiftsApi.update(editing!._id, form),
    onSuccess: () => {
      qc.refetchQueries({ queryKey: ['shifts'] });
      toast.success('Shift updated');
      setShowForm(false);
      setEditing(null);
      setForm(EMPTY);
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });
  const removeMut = useMutation({
    mutationFn: (id: string) => shiftsApi.remove(id),
    onSuccess: () => {
      qc.refetchQueries({ queryKey: ['shifts'] });
      toast.success('Shift archived');
    },
  });

  const toggleDay = (d: number) => {
    setForm((f) => ({
      ...f,
      weeklyOffs: f.weeklyOffs.includes(d) ? f.weeklyOffs.filter((x) => x !== d) : [...f.weeklyOffs, d],
    }));
  };

  const openEdit = (s: Shift) => {
    setEditing(s);
    setForm({
      name: s.name,
      startTime: s.startTime,
      endTime: s.endTime,
      breakMinutes: s.breakMinutes,
      lateAfterMinutes: s.lateAfterMinutes,
      overtimeAfterMinutes: s.overtimeAfterMinutes,
      weeklyOffs: s.weeklyOffs || [0],
      isDefault: s.isDefault,
      color: s.color || '#FF5C3A',
    });
    setShowForm(true);
  };

  const shifts: Shift[] = data?.shifts || [];

  return (
    <AppShell>
      <div style={{ padding: '28px 32px', maxWidth: 1000 }}>
        <PageHeader title="Shifts" sub="Define work schedules and late-policy rules">
          {canEdit && (
            <button className="btn btn-primary" onClick={() => { setEditing(null); setForm(EMPTY); setShowForm(true); }}>+ New shift</button>
          )}
        </PageHeader>

        {showForm && canEdit && (
          <div className="card" style={{ padding: 24, marginBottom: 24 }}>
            <h2 style={{ fontFamily: "'Syne',sans-serif", fontSize: 18, fontWeight: 800, marginBottom: 16 }}>
              {editing ? 'Edit shift' : 'New shift'}
            </h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                editing ? updateMut.mutate() : createMut.mutate();
              }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">Name</label>
                  <input className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Start time</label>
                  <input className="form-input" type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">End time</label>
                  <input className="form-input" type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Break (minutes)</label>
                  <input className="form-input" type="number" min={0} value={form.breakMinutes} onChange={(e) => setForm({ ...form, breakMinutes: Number(e.target.value) })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Mark late after</label>
                  <input className="form-input" type="number" min={0} value={form.lateAfterMinutes} onChange={(e) => setForm({ ...form, lateAfterMinutes: Number(e.target.value) })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Overtime after</label>
                  <input className="form-input" type="number" min={0} value={form.overtimeAfterMinutes} onChange={(e) => setForm({ ...form, overtimeAfterMinutes: Number(e.target.value) })} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Weekly offs</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  {DAYS.map((d, i) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => toggleDay(i)}
                      style={{
                        padding: '6px 10px',
                        border: '1px solid #E5E0D8',
                        borderRadius: 8,
                        background: form.weeklyOffs.includes(i) ? '#FF5C3A' : '#fff',
                        color: form.weeklyOffs.includes(i) ? '#fff' : '#1A1A1A',
                        fontSize: 12,
                        cursor: 'pointer',
                      }}
                    >{d}</button>
                  ))}
                </div>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, marginBottom: 16 }}>
                <input type="checkbox" checked={form.isDefault} onChange={(e) => setForm({ ...form, isDefault: e.target.checked })} />
                Set as default shift for new workers
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn" type="button" onClick={() => { setShowForm(false); setEditing(null); }}>Cancel</button>
                <button className="btn btn-primary" type="submit" disabled={createMut.isPending || updateMut.isPending}>{editing ? 'Save' : 'Create'}</button>
              </div>
            </form>
          </div>
        )}

        <div className="card" style={{ padding: 24 }}>
          {isLoading ? (
            <div style={{ color: '#6B6B6B', fontSize: 13 }}>Loading…</div>
          ) : shifts.length === 0 ? (
            <div style={{ color: '#6B6B6B', fontSize: 13 }}>No shifts yet. Create one to schedule workers.</div>
          ) : (
            <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', color: '#6B6B6B', borderBottom: '1px solid #E5E0D8' }}>
                  <th style={{ padding: '8px 0', fontWeight: 600 }}>Name</th>
                  <th style={{ padding: '8px 0', fontWeight: 600 }}>Hours</th>
                  <th style={{ padding: '8px 0', fontWeight: 600 }}>Late after</th>
                  <th style={{ padding: '8px 0', fontWeight: 600 }}>Weekly offs</th>
                  <th style={{ padding: '8px 0', fontWeight: 600 }}>Default</th>
                  {canEdit && <th></th>}
                </tr>
              </thead>
              <tbody>
                {shifts.map((s) => (
                  <tr key={s._id} style={{ borderBottom: '1px solid #F0EBE3' }}>
                    <td style={{ padding: '10px 0', fontWeight: 600 }}>
                      <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 4, background: s.color, marginRight: 8 }} />
                      {s.name}
                    </td>
                    <td style={{ padding: '10px 0' }}>{s.startTime} – {s.endTime}</td>
                    <td style={{ padding: '10px 0' }}>{s.lateAfterMinutes} min</td>
                    <td style={{ padding: '10px 0' }}>{(s.weeklyOffs || []).map((d) => DAYS[d]).join(', ') || '—'}</td>
                    <td style={{ padding: '10px 0' }}>{s.isDefault ? '✓' : ''}</td>
                    {canEdit && (
                      <td style={{ padding: '10px 0', textAlign: 'right' }}>
                        <button className="btn" style={{ fontSize: 12, marginRight: 8 }} onClick={() => openEdit(s)}>Edit</button>
                        <button className="btn" style={{ fontSize: 12, color: '#DC2626' }} onClick={() => { if (confirm('Archive shift?')) removeMut.mutate(s._id); }}>Archive</button>
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
