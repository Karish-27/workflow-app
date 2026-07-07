'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import AppShell from '../../components/layout/AppShell';
import { PageHeader } from '../../components/ui';
import { sitesApi } from '../../lib/api';
import { useAuthStore } from '../../lib/store';
import type { Site } from '../../types';

const EMPTY = {
  name: '',
  address: '',
  lat: '' as string | number,
  lng: '' as string | number,
  radiusMeters: 100,
  geofenceEnabled: true,
};

export default function SitesPage() {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const canEdit = user?.role === 'admin';
  const [editing, setEditing] = useState<Site | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [showForm, setShowForm] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['sites'],
    queryFn: () => sitesApi.list().then((r) => r.data),
  });

  const save = useMutation({
    mutationFn: () => {
      const payload = {
        name: form.name,
        address: form.address,
        lat: form.lat === '' ? null : Number(form.lat),
        lng: form.lng === '' ? null : Number(form.lng),
        radiusMeters: Number(form.radiusMeters) || 100,
        geofenceEnabled: form.geofenceEnabled,
      };
      return editing ? sitesApi.update(editing._id, payload) : sitesApi.create(payload);
    },
    onSuccess: () => {
      qc.refetchQueries({ queryKey: ['sites'] });
      toast.success(editing ? 'Site updated' : 'Site created');
      setShowForm(false);
      setEditing(null);
      setForm(EMPTY);
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const remove = useMutation({
    mutationFn: (id: string) => sitesApi.remove(id),
    onSuccess: () => {
      qc.refetchQueries({ queryKey: ['sites'] });
      toast.success('Site archived');
    },
  });

  const rotate = useMutation({
    mutationFn: (id: string) => sitesApi.rotateToken(id),
    onSuccess: () => {
      qc.refetchQueries({ queryKey: ['sites'] });
      toast.success('Kiosk QR rotated — old QR no longer works.');
    },
  });

  const openEdit = (s: Site) => {
    setEditing(s);
    setForm({
      name: s.name,
      address: s.address || '',
      lat: s.lat ?? '',
      lng: s.lng ?? '',
      radiusMeters: s.radiusMeters,
      geofenceEnabled: s.geofenceEnabled,
    });
    setShowForm(true);
  };

  const kioskLink = (token: string) =>
    typeof window === 'undefined' ? '' : `${window.location.origin}/kiosk?token=${token}`;

  const sites: Site[] = data?.sites || [];

  return (
    <AppShell>
      <div style={{ padding: '28px 32px', maxWidth: 1100 }}>
        <PageHeader title="Sites" sub="Define work locations and geofencing rules">
          {canEdit && (
            <button className="btn btn-primary" onClick={() => { setEditing(null); setForm(EMPTY); setShowForm(true); }}>+ New site</button>
          )}
        </PageHeader>

        {showForm && canEdit && (
          <div className="card" style={{ padding: 24, marginBottom: 24 }}>
            <h2 style={{ fontFamily: "'Syne',sans-serif", fontSize: 18, fontWeight: 800, marginBottom: 16 }}>
              {editing ? 'Edit site' : 'New site'}
            </h2>
            <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 3fr', gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">Name</label>
                  <input className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Address</label>
                  <input className="form-input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Latitude</label>
                  <input className="form-input" type="number" step="any" value={form.lat} onChange={(e) => setForm({ ...form, lat: e.target.value })} placeholder="e.g. 18.5089" />
                </div>
                <div className="form-group">
                  <label className="form-label">Longitude</label>
                  <input className="form-input" type="number" step="any" value={form.lng} onChange={(e) => setForm({ ...form, lng: e.target.value })} placeholder="e.g. 73.9259" />
                </div>
                <div className="form-group">
                  <label className="form-label">Geofence radius (m)</label>
                  <input className="form-input" type="number" min={10} value={form.radiusMeters} onChange={(e) => setForm({ ...form, radiusMeters: Number(e.target.value) })} />
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, paddingTop: 26 }}>
                  <input type="checkbox" checked={form.geofenceEnabled} onChange={(e) => setForm({ ...form, geofenceEnabled: e.target.checked })} />
                  Enforce geofence on check-in
                </label>
              </div>
              <div style={{ fontSize: 12, color: '#6B6B6B', marginBottom: 12 }}>
                Tip: open Google Maps, right-click your site, click the lat/lng to copy.
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn" type="button" onClick={() => { setShowForm(false); setEditing(null); }}>Cancel</button>
                <button className="btn btn-primary" type="submit" disabled={save.isPending}>{editing ? 'Save' : 'Create'}</button>
              </div>
            </form>
          </div>
        )}

        <div className="card" style={{ padding: 24 }}>
          {isLoading ? (
            <div style={{ color: '#6B6B6B', fontSize: 13 }}>Loading…</div>
          ) : sites.length === 0 ? (
            <div style={{ color: '#6B6B6B', fontSize: 13 }}>No sites yet. Add one to enable geofencing and kiosk check-in.</div>
          ) : (
            <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', color: '#6B6B6B', borderBottom: '1px solid #E5E0D8' }}>
                  <th style={{ padding: '8px 0', fontWeight: 600 }}>Site</th>
                  <th style={{ padding: '8px 0', fontWeight: 600 }}>Coordinates</th>
                  <th style={{ padding: '8px 0', fontWeight: 600 }}>Radius</th>
                  <th style={{ padding: '8px 0', fontWeight: 600 }}>Geofence</th>
                  <th style={{ padding: '8px 0', fontWeight: 600 }}>Kiosk link</th>
                  {canEdit && <th></th>}
                </tr>
              </thead>
              <tbody>
                {sites.map((s) => (
                  <tr key={s._id} style={{ borderBottom: '1px solid #F0EBE3' }}>
                    <td style={{ padding: '10px 0' }}>
                      <div style={{ fontWeight: 600 }}>{s.name}</div>
                      <div style={{ fontSize: 11, color: '#6B6B6B' }}>{s.address || ''}</div>
                    </td>
                    <td style={{ padding: '10px 0', fontFamily: 'monospace', fontSize: 11 }}>
                      {s.lat != null && s.lng != null ? `${s.lat.toFixed(5)}, ${s.lng.toFixed(5)}` : '—'}
                    </td>
                    <td style={{ padding: '10px 0' }}>{s.radiusMeters}m</td>
                    <td style={{ padding: '10px 0' }}>{s.geofenceEnabled ? <span style={{ color: '#16A34A' }}>On</span> : <span style={{ color: '#6B6B6B' }}>Off</span>}</td>
                    <td style={{ padding: '10px 0' }}>
                      <a href={kioskLink(s.kioskToken)} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: '#FF5C3A', wordBreak: 'break-all' }}>
                        {kioskLink(s.kioskToken)}
                      </a>
                    </td>
                    {canEdit && (
                      <td style={{ padding: '10px 0', textAlign: 'right' }}>
                        <button className="btn" style={{ fontSize: 12, marginRight: 6 }} onClick={() => openEdit(s)}>Edit</button>
                        <button className="btn" style={{ fontSize: 12, marginRight: 6 }} onClick={() => { if (confirm('Rotate kiosk QR? Old links will stop working.')) rotate.mutate(s._id); }}>Rotate QR</button>
                        <button className="btn" style={{ fontSize: 12, color: '#DC2626' }} onClick={() => { if (confirm('Archive site?')) remove.mutate(s._id); }}>Archive</button>
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
