'use client';
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import AppShell from '../../../components/layout/AppShell';
import SettingsNav from '../../../components/layout/SettingsNav';
import { PageHeader } from '../../../components/ui';
import { organizationApi, authApi } from '../../../lib/api';
import { useAuthStore } from '../../../lib/store';

const EMPTY = {
  name: '',
  industry: '',
  phone: '',
  address: '',
  country: 'IN',
  currency: 'INR',
  timezone: 'Asia/Kolkata',
  logoUrl: '',
};

export default function OrganizationSettingsPage() {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const [form, setForm] = useState(EMPTY);

  const { data, isLoading } = useQuery({
    queryKey: ['organization'],
    queryFn: () => organizationApi.get().then((r) => r.data),
  });

  useEffect(() => {
    if (data?.organization) {
      const o = data.organization;
      setForm({
        name: o.name || '',
        industry: o.industry || '',
        phone: o.phone || '',
        address: o.address || '',
        country: o.country || 'IN',
        currency: o.currency || 'INR',
        timezone: o.timezone || 'Asia/Kolkata',
        logoUrl: o.logoUrl || '',
      });
    }
  }, [data]);

  const updateMut = useMutation({
    mutationFn: () => organizationApi.update(form),
    onSuccess: () => {
      qc.refetchQueries({ queryKey: ['organization'] });
      toast.success('Organization updated');
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Update failed'),
  });

  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwForm.next.length < 6) return toast.error('Password too short');
    if (pwForm.next !== pwForm.confirm) return toast.error('Passwords do not match');
    try {
      await authApi.changePassword(pwForm.current, pwForm.next);
      toast.success('Password updated');
      setPwForm({ current: '', next: '', confirm: '' });
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Could not update password');
    }
  };

  const handleResendVerification = async () => {
    try {
      await authApi.resendVerification();
      toast.success('Verification email sent');
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Could not send email');
    }
  };

  const org = data?.organization;
  const canEdit = user?.role === 'admin';

  return (
    <AppShell>
      <div style={{ padding: '28px 32px', maxWidth: 880 }}>
        <PageHeader title="Settings" sub="Manage your organization, team and security" />
        <SettingsNav />

        {!user?.emailVerified && (
          <div className="card" style={{ padding: 16, marginBottom: 20, borderLeft: '3px solid #F59E0B', background: '#FFFBEB' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <div style={{ fontSize: 13 }}>
                <b>Your email is not verified.</b> Verify to receive payroll-related notifications and reset links.
              </div>
              <button className="btn" onClick={handleResendVerification} style={{ fontSize: 12 }}>
                Resend verification
              </button>
            </div>
          </div>
        )}

        <div className="card" style={{ padding: 24, marginBottom: 24 }}>
          <h2 style={{ fontFamily: "'Syne',sans-serif", fontSize: 18, fontWeight: 800, marginBottom: 4 }}>Organization profile</h2>
          <p style={{ fontSize: 13, color: '#6B6B6B', marginBottom: 20 }}>
            This information appears on payslips, invoices and emails.
          </p>

          {isLoading ? (
            <div style={{ color: '#6B6B6B', fontSize: 13 }}>Loading…</div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                updateMut.mutate();
              }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">Name</label>
                  <input className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required disabled={!canEdit} />
                </div>
                <div className="form-group">
                  <label className="form-label">Industry</label>
                  <input className="form-input" value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} placeholder="Construction, Manufacturing…" disabled={!canEdit} />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input className="form-input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} disabled={!canEdit} />
                </div>
                <div className="form-group">
                  <label className="form-label">Country</label>
                  <input className="form-input" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} disabled={!canEdit} />
                </div>
                <div className="form-group">
                  <label className="form-label">Currency</label>
                  <input className="form-input" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} disabled={!canEdit} />
                </div>
                <div className="form-group">
                  <label className="form-label">Timezone</label>
                  <input className="form-input" value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })} disabled={!canEdit} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Address</label>
                <textarea className="form-input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} rows={2} disabled={!canEdit} />
              </div>
              <div className="form-group">
                <label className="form-label">Logo URL</label>
                <input className="form-input" value={form.logoUrl} onChange={(e) => setForm({ ...form, logoUrl: e.target.value })} placeholder="https://…" disabled={!canEdit} />
              </div>
              {canEdit && (
                <button className="btn btn-primary" type="submit" disabled={updateMut.isPending}>
                  {updateMut.isPending ? 'Saving…' : 'Save changes'}
                </button>
              )}
            </form>
          )}

          {org && (
            <div style={{ marginTop: 20, padding: 14, background: '#F7F4EF', borderRadius: 8, fontSize: 12, color: '#6B6B6B' }}>
              <div><b>Plan:</b> {org.plan} · <b>Seats:</b> {org.seatLimit} · <b>Worker limit:</b> {org.workerLimit}</div>
              {org.trialEndsAt && <div style={{ marginTop: 4 }}><b>Trial ends:</b> {new Date(org.trialEndsAt).toLocaleDateString()}</div>}
            </div>
          )}
        </div>

        <div className="card" style={{ padding: 24 }}>
          <h2 style={{ fontFamily: "'Syne',sans-serif", fontSize: 18, fontWeight: 800, marginBottom: 4 }}>Change password</h2>
          <p style={{ fontSize: 13, color: '#6B6B6B', marginBottom: 20 }}>
            Use a strong, unique password. You'll stay signed in on this device after updating.
          </p>
          <form onSubmit={handleChangePassword} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, alignItems: 'end' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Current password</label>
              <input className="form-input" type="password" value={pwForm.current} onChange={(e) => setPwForm({ ...pwForm, current: e.target.value })} required />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">New password</label>
              <input className="form-input" type="password" value={pwForm.next} onChange={(e) => setPwForm({ ...pwForm, next: e.target.value })} required minLength={6} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Confirm</label>
              <input className="form-input" type="password" value={pwForm.confirm} onChange={(e) => setPwForm({ ...pwForm, confirm: e.target.value })} required minLength={6} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <button className="btn btn-primary" type="submit">Update password</button>
            </div>
          </form>
        </div>
      </div>
    </AppShell>
  );
}
