'use client';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { kioskApi, workerPortalApi } from '../../lib/api';

function getLocation(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('Geolocation not supported.'));
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
    });
  });
}

function KioskInner() {
  const params = useSearchParams();
  const token = params.get('token') || '';
  const [site, setSite] = useState<any>(null);
  const [organization, setOrganization] = useState<any>(null);
  const [error, setError] = useState('');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [lastSuccess, setLastSuccess] = useState<{ name: string; time: string } | null>(null);

  useEffect(() => {
    if (!token) {
      setError('No kiosk token in URL.');
      return;
    }
    kioskApi
      .resolve(token)
      .then((res) => {
        setSite(res.data.site);
        setOrganization(res.data.organization);
      })
      .catch((err) => setError(err.response?.data?.message || 'Invalid kiosk link.'));
  }, [token]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization || !site) return;
    setBusy(true);
    try {
      const loginRes = await workerPortalApi.login(organization.slug, phone, pin);
      const workerName = loginRes.data.worker?.name || 'Worker';
      // Use the just-issued worker token for the check-in
      const issuedToken = loginRes.data.token;
      localStorage.setItem('wf_worker_token', issuedToken);

      let coords: { lat?: number; lng?: number; accuracy?: number } = {};
      if (site.geofenceEnabled) {
        try {
          const pos = await getLocation();
          coords = { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy };
        } catch {
          toast.error('Allow location to check in at this site.');
          setBusy(false);
          return;
        }
      }

      const res = await workerPortalApi.checkIn({ ...coords, kioskToken: site.kioskToken });
      setLastSuccess({ name: workerName, time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) });
      // Clear inputs for next worker
      setPhone('');
      setPin('');
      // Drop the kiosk's stored token so the next worker doesn't inherit a session
      localStorage.removeItem('wf_worker_token');
      localStorage.removeItem('wf_worker');
      if (res.data.isLate) {
        toast(`${workerName} — ${res.data.lateByMinutes} min late`, { icon: '⚠️' });
      } else {
        toast.success(`${workerName} checked in`);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Check-in failed');
    } finally {
      setBusy(false);
    }
  };

  if (error) {
    return (
      <div style={{ minHeight: '100vh', background: '#1A1A1A', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 40 }}>⚠</div>
          <div style={{ fontSize: 18, marginTop: 8 }}>{error}</div>
        </div>
      </div>
    );
  }

  if (!site) {
    return (
      <div style={{ minHeight: '100vh', background: '#1A1A1A', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        Loading site…
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#1A1A1A', color: '#fff', padding: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: 460 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 12, color: '#999', textTransform: 'uppercase', letterSpacing: 2 }}>{organization?.name}</div>
          <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 28, fontWeight: 800, marginTop: 6 }}>
            Check in at {site.name}
          </h1>
          {site.geofenceEnabled && (
            <div style={{ fontSize: 12, color: '#bbb', marginTop: 6 }}>
              Geofence enforced ({site.radiusMeters}m radius)
            </div>
          )}
        </div>

        {lastSuccess && (
          <div style={{ background: '#16A34A', color: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, textAlign: 'center' }}>
            <div style={{ fontSize: 13 }}>Last check-in</div>
            <div style={{ fontSize: 20, fontWeight: 700, marginTop: 2 }}>{lastSuccess.name} · {lastSuccess.time}</div>
          </div>
        )}

        <form onSubmit={submit} style={{ background: '#262626', borderRadius: 16, padding: 28 }}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, color: '#999', fontWeight: 600, marginBottom: 6, display: 'block' }}>Phone</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Your registered phone"
              inputMode="tel"
              autoComplete="off"
              style={{ width: '100%', background: '#1A1A1A', border: '1px solid #333', borderRadius: 10, padding: '14px 16px', color: '#fff', fontSize: 16 }}
              required
            />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 12, color: '#999', fontWeight: 600, marginBottom: 6, display: 'block' }}>PIN</label>
            <input
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="••••"
              inputMode="numeric"
              type="password"
              autoComplete="off"
              style={{ width: '100%', background: '#1A1A1A', border: '1px solid #333', borderRadius: 10, padding: '14px 16px', color: '#fff', fontSize: 24, letterSpacing: 8, textAlign: 'center' }}
              required
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            style={{ width: '100%', background: '#FF5C3A', border: 'none', borderRadius: 10, padding: '18px', color: '#fff', fontSize: 18, fontWeight: 700, cursor: 'pointer', opacity: busy ? 0.7 : 1 }}
          >
            {busy ? 'Checking in…' : 'Check in'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function KioskPage() {
  return (
    <Suspense fallback={null}>
      <KioskInner />
    </Suspense>
  );
}
