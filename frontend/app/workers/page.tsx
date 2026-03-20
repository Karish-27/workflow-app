'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import AppShell from '../../components/layout/AppShell';
import { Avatar, Modal, EmptyState, PageHeader } from '../../components/ui';
import { workersApi } from '../../lib/api';
import { formatCurrency, formatDate, ROLES, getWorkerColor } from '../../lib/utils';
import { Worker, WorkerFormData } from '../../types';
import Link from 'next/link';

const EMPTY_FORM: WorkerFormData = {
  name: '', phone: '', role: 'Mason', wageType: 'daily',
  wage: 600, joiningDate: new Date().toISOString().split('T')[0],
  status: 'active', overtimeRate: 0, notes: '',
};

export default function WorkersPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editWorker, setEditWorker] = useState<Worker | null>(null);
  const [form, setForm] = useState<WorkerFormData>(EMPTY_FORM);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['workers', search, roleFilter, statusFilter],
    queryFn: () => workersApi.getAll({ search, role: roleFilter, status: statusFilter }).then(r => r.data),
  });

  const createMut = useMutation({
    mutationFn: (d: WorkerFormData) => workersApi.create(d),
    onSuccess: () => { qc.refetchQueries({ queryKey: ['workers'] }); toast.success('Worker added!'); setShowModal(false); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: WorkerFormData }) => workersApi.update(id, data),
    onSuccess: () => { qc.refetchQueries({ queryKey: ['workers'] }); toast.success('Worker updated!'); setShowModal(false); setEditWorker(null); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => workersApi.delete(id),
    onSuccess: () => { qc.refetchQueries({ queryKey: ['workers'] }); toast.success('Worker deleted'); setDeleteId(null); },
  });

  const openAdd = () => { setForm(EMPTY_FORM); setEditWorker(null); setShowModal(true); };
  const openEdit = (w: Worker) => {
    setForm({ name: w.name, phone: w.phone||'', role: w.role, wageType: w.wageType, wage: w.wage, joiningDate: w.joiningDate.split('T')[0], status: w.status, overtimeRate: w.overtimeRate||0, notes: w.notes||'' });
    setEditWorker(w);
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editWorker) updateMut.mutate({ id: editWorker._id, data: form });
    else createMut.mutate(form);
  };

  const workers: Worker[] = data?.workers || [];

  return (
    <AppShell>
      <div style={{ padding: '28px 32px' }}>
        <PageHeader title="Workers" sub={`${data?.total ?? 0} total workers`}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fff', border: '1px solid #E5E0D8', borderRadius: 8, padding: '7px 12px' }}>
            <svg width="14" height="14" fill="none" stroke="#6B6B6B" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input style={{ border: 'none', outline: 'none', fontSize: 13, width: 180, fontFamily: "'DM Sans',sans-serif", background: 'transparent', color: '#1A1A1A' }} placeholder="Search workers..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="form-input" style={{ width: 'auto', padding: '8px 12px', fontSize: 13 }} value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
            <option value="">All Roles</option>
            {ROLES.map(r => <option key={r}>{r}</option>)}
          </select>
          <select className="form-input" style={{ width: 'auto', padding: '8px 12px', fontSize: 13 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <button className="btn btn-primary" onClick={openAdd}>+ Add Worker</button>
        </PageHeader>

        {isLoading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="card animate-pulse" style={{ height: 200 }} />
            ))}
          </div>
        ) : workers.length === 0 ? (
          <EmptyState title="No workers found" sub="Add your first worker to get started" action={<button className="btn btn-primary" onClick={openAdd}>+ Add Worker</button>} />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
            {workers.map((w, i) => (
              <div key={w._id} className="card" style={{ cursor: 'default', transition: 'all .15s' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Avatar name={w.name} size={44} index={i} />
                    <div>
                      <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 15, fontWeight: 700 }}>{w.name}</div>
                      <div style={{ fontSize: 12, color: '#6B6B6B' }}>{w.role} · {w.wageType === 'daily' ? 'Daily' : 'Monthly'}</div>
                    </div>
                  </div>
                  <span className={`badge ${w.status === 'active' ? 'badge-green' : 'badge-gray'}`}>{w.status}</span>
                </div>
                {w.phone && <div style={{ fontSize: 12, color: '#6B6B6B', marginBottom: 12 }}>📞 {w.phone}</div>}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14, padding: '12px 0', borderTop: '1px solid #E5E0D8', borderBottom: '1px solid #E5E0D8' }}>
                  <div>
                    <div style={{ fontSize: 11, color: '#6B6B6B' }}>Wage</div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{formatCurrency(w.wage)}/{w.wageType === 'daily' ? 'day' : 'mo'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: '#6B6B6B' }}>Joined</div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{formatDate(w.joiningDate)}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Link href={`/salary?worker=${w._id}`} className="btn btn-ghost btn-sm" style={{ flex: 1, justifyContent: 'center' }}>View Salary</Link>
                  <button className="btn btn-ghost btn-sm btn-icon" onClick={() => openEdit(w)}>
                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </button>
                  <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setDeleteId(w._id)} style={{ color: '#EF4444' }}>
                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal open={showModal} onClose={() => { setShowModal(false); setEditWorker(null); }} title={editWorker ? 'Edit Worker' : 'Add New Worker'} maxWidth={520}>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Full Name *</label>
              <input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Suresh Patel" required />
            </div>
            <div className="form-group">
              <label className="form-label">Phone Number</label>
              <input className="form-input" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+91 XXXXX XXXXX" />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Job Role *</label>
              <select className="form-input" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                {ROLES.map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-input" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as any }))}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Wage Type *</label>
              <select className="form-input" value={form.wageType} onChange={e => setForm(f => ({ ...f, wageType: e.target.value as any }))}>
                <option value="daily">Daily</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Wage Amount (₹) *</label>
              <input className="form-input" type="number" value={form.wage} onChange={e => setForm(f => ({ ...f, wage: +e.target.value }))} min={0} required />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Joining Date *</label>
              <input className="form-input" type="date" value={form.joiningDate} onChange={e => setForm(f => ({ ...f, joiningDate: e.target.value }))} required />
            </div>
            <div className="form-group">
              <label className="form-label">Overtime Rate (₹/hr)</label>
              <input className="form-input" type="number" value={form.overtimeRate} onChange={e => setForm(f => ({ ...f, overtimeRate: +e.target.value }))} min={0} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Notes</label>
            <input className="form-input" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional notes..." />
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={() => { setShowModal(false); setEditWorker(null); }}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={createMut.isPending || updateMut.isPending}>
              {(createMut.isPending || updateMut.isPending) ? <><span className="spinner" />Saving...</> : editWorker ? 'Update Worker' : 'Add Worker'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete confirm */}
      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Delete Worker" maxWidth={400}>
        <p style={{ fontSize: 14, color: '#6B6B6B', marginBottom: 8 }}>This will permanently delete the worker and all their attendance records. This cannot be undone.</p>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={() => setDeleteId(null)}>Cancel</button>
          <button className="btn btn-danger" disabled={deleteMut.isPending} onClick={() => deleteId && deleteMut.mutate(deleteId)}>
            {deleteMut.isPending ? <><span className="spinner" />Deleting...</> : 'Yes, Delete'}
          </button>
        </div>
      </Modal>
    </AppShell>
  );
}
