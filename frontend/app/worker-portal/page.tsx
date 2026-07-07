'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { workerPortalApi } from '../../lib/api';
import type { WorkerSession } from '../../types';

interface AttendanceRecord {
  _id: string;
  date: string;
  status: string;
  checkInAt?: string | null;
  checkOutAt?: string | null;
  isLate?: boolean;
  lateByMinutes?: number;
}

function getLocation(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('Geolocation not supported by this browser.'));
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
    });
  });
}

export default function WorkerPortalHome() {
  const router = useRouter();
  const [me, setMe] = useState<WorkerSession | null>(null);
  const [today, setToday] = useState<AttendanceRecord | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('wf_worker_token') : null;
    if (!token) {
      router.replace('/worker-portal/login');
      return;
    }
    Promise.all([
      workerPortalApi.me(),
      workerPortalApi.myAttendance(new Date().getMonth() + 1, new Date().getFullYear()),
    ])
      .then(([meRes, attRes]) => {
        setMe(meRes.data.worker);
        const todayStr = new Date().toISOString().slice(0, 10);
        const t = (attRes.data.records || []).find((r: any) => r.date.slice(0, 10) === todayStr);
        setToday(t || null);
      })
      .catch(() => {
        localStorage.removeItem('wf_worker_token');
        localStorage.removeItem('wf_worker');
        router.replace('/worker-portal/login');
      });
  }, [router]);

  const checkIn = async () => {
    setBusy(true);
    try {
      let coords: { lat?: number; lng?: number; accuracy?: number } = {};
      try {
        const pos = await getLocation();
        coords = { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy };
      } catch (geoErr: any) {
        if (me?.site?.geofenceEnabled) {
          toast.error('Location access is required to check in at this site.');
          setBusy(false);
          return;
        }
      }
      const res = await workerPortalApi.checkIn(coords);
      setToday(res.data.record);
      if (res.data.isLate) {
        toast.error(`Checked in — ${res.data.lateByMinutes} min late.`);
      } else {
        toast.success('Checked in!');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Check-in failed');
    } finally {
      setBusy(false);
    }
  };

  const checkOut = async () => {
    setBusy(true);
    try {
      let coords: { lat?: number; lng?: number; accuracy?: number } = {};
      try {
        const pos = await getLocation();
        coords = { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy };
      } catch {
        // checkout works without location
      }
      const res = await workerPortalApi.checkOut(coords);
      setToday(res.data.record);
      toast.success('Checked out!');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Check-out failed');
    } finally {
      setBusy(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('wf_worker_token');
    localStorage.removeItem('wf_worker');
    router.replace('/worker-portal/login');
  };

  if (!me) {
    return (
      <div style={{ minHeight: '100vh', background: '#F7F4EF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B6B6B' }}>
        Loading…
      </div>
    );
  }

  const checkedIn = !!today?.checkInAt;
  const checkedOut = !!today?.checkOutAt;

  return (
    <div style={{ minHeight: '100vh', background: '#F7F4EF', padding: 16, paddingBottom: 100 }}>
      <div style={{ maxWidth: 480, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 12, color: '#6B6B6B' }}>{me.organization.name}</div>
            <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 22, fontWeight: 800 }}>Hi, {me.name.split(' ')[0]}</div>
          </div>
          <button onClick={logout} style={{ background: 'transparent', border: '1px solid #E5E0D8', borderRadius: 8, padding: '6px 12px', fontSize: 12, color: '#6B6B6B', cursor: 'pointer' }}>
            Sign out
          </button>
        </div>

        {/* Today card */}
        <div className="card" style={{ padding: 24, marginBottom: 16, background: '#1A1A1A', color: '#fff' }}>
          <div style={{ fontSize: 11, color: '#999', textTransform: 'uppercase', letterSpacing: 1 }}>Today</div>
          <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 24, fontWeight: 800, marginTop: 4 }}>
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
          </div>
          {me.shift && (
            <div style={{ fontSize: 12, color: '#bbb', marginTop: 6 }}>
              Shift: {me.shift.name} ({me.shift.startTime} – {me.shift.endTime})
            </div>
          )}
          {me.site && (
            <div style={{ fontSize: 12, color: '#bbb', marginTop: 2 }}>
              Site: {me.site.name}{me.site.geofenceEnabled ? ' · geofence on' : ''}
            </div>
          )}

          <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ background: '#262626', borderRadius: 10, padding: 12 }}>
              <div style={{ fontSize: 11, color: '#999' }}>Check-in</div>
              <div style={{ fontSize: 18, fontWeight: 700, marginTop: 2 }}>
                {today?.checkInAt ? new Date(today.checkInAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'}
              </div>
              {today?.isLate && <div style={{ fontSize: 10, color: '#F87171', marginTop: 2 }}>{today.lateByMinutes} min late</div>}
            </div>
            <div style={{ background: '#262626', borderRadius: 10, padding: 12 }}>
              <div style={{ fontSize: 11, color: '#999' }}>Check-out</div>
              <div style={{ fontSize: 18, fontWeight: 700, marginTop: 2 }}>
                {today?.checkOutAt ? new Date(today.checkOutAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'}
              </div>
            </div>
          </div>

          {!checkedIn && (
            <button onClick={checkIn} disabled={busy} style={{ width: '100%', marginTop: 16, background: '#FF5C3A', border: 'none', borderRadius: 10, padding: '16px', color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer' }}>
              {busy ? 'Working…' : 'Check in'}
            </button>
          )}
          {checkedIn && !checkedOut && (
            <button onClick={checkOut} disabled={busy} style={{ width: '100%', marginTop: 16, background: '#16A34A', border: 'none', borderRadius: 10, padding: '16px', color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer' }}>
              {busy ? 'Working…' : 'Check out'}
            </button>
          )}
          {checkedIn && checkedOut && (
            <div style={{ marginTop: 16, padding: 12, background: '#262626', borderRadius: 10, textAlign: 'center', fontSize: 13, color: '#999' }}>
              You've completed your shift today. ✓
            </div>
          )}
        </div>

        {/* Leave balance + quick actions */}
        {me.leaveBalance && (
          <div className="card" style={{ padding: 18, marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: '#6B6B6B', marginBottom: 10 }}>Leave balance</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, textAlign: 'center' }}>
              <div>
                <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 20, fontWeight: 800, color: '#3B82F6' }}>{me.leaveBalance.casual}</div>
                <div style={{ fontSize: 11, color: '#6B6B6B' }}>Casual</div>
              </div>
              <div>
                <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 20, fontWeight: 800, color: '#F59E0B' }}>{me.leaveBalance.sick}</div>
                <div style={{ fontSize: 11, color: '#6B6B6B' }}>Sick</div>
              </div>
              <div>
                <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 20, fontWeight: 800, color: '#16A34A' }}>{me.leaveBalance.paid}</div>
                <div style={{ fontSize: 11, color: '#6B6B6B' }}>Paid</div>
              </div>
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Link href="/worker-portal/leaves" className="card" style={{ padding: 16, textDecoration: 'none', color: '#1A1A1A' }}>
            <div style={{ fontSize: 12, color: '#6B6B6B' }}>My leaves</div>
            <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 16, fontWeight: 700, marginTop: 4 }}>Apply / view →</div>
          </Link>
          <Link href="/worker-portal/payments" className="card" style={{ padding: 16, textDecoration: 'none', color: '#1A1A1A' }}>
            <div style={{ fontSize: 12, color: '#6B6B6B' }}>My payslips</div>
            <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 16, fontWeight: 700, marginTop: 4 }}>Download →</div>
          </Link>
        </div>
      </div>
    </div>
  );
}
