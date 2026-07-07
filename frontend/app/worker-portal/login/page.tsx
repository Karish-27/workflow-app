'use client';
import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { workerPortalApi } from '../../../lib/api';

function WorkerLoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [orgSlug, setOrgSlug] = useState(params.get('org') || '');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgSlug || !phone || pin.length < 4) {
      toast.error('Fill all fields');
      return;
    }
    setLoading(true);
    try {
      const res = await workerPortalApi.login(orgSlug, phone, pin);
      const { token, worker } = res.data;
      localStorage.setItem('wf_worker_token', token);
      localStorage.setItem('wf_worker', JSON.stringify(worker));
      router.replace('/worker-portal');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#1A1A1A', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ width: '100%', maxWidth: 380 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 56, height: 56, background: '#FF5C3A', borderRadius: 14, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="28" height="28" fill="none" stroke="#fff" strokeWidth="2.5" viewBox="0 0 24 24">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
            </svg>
          </div>
          <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 26, fontWeight: 800, color: '#fff', marginTop: 16 }}>WorkFlow</h1>
          <p style={{ fontSize: 13, color: '#999', marginTop: 6 }}>Worker self-service</p>
        </div>

        <div style={{ background: '#262626', borderRadius: 16, padding: 28 }}>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label style={{ fontSize: 12, color: '#999', fontWeight: 600, marginBottom: 6, display: 'block' }}>Company code</label>
              <input
                value={orgSlug}
                onChange={(e) => setOrgSlug(e.target.value)}
                placeholder="e.g. kumar-construction"
                style={{ width: '100%', background: '#1A1A1A', border: '1px solid #333', borderRadius: 10, padding: '12px 14px', color: '#fff', fontSize: 14, fontFamily: "'DM Sans',sans-serif" }}
                required
              />
            </div>
            <div className="form-group">
              <label style={{ fontSize: 12, color: '#999', fontWeight: 600, marginBottom: 6, display: 'block' }}>Phone number</label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Your registered phone"
                inputMode="tel"
                style={{ width: '100%', background: '#1A1A1A', border: '1px solid #333', borderRadius: 10, padding: '12px 14px', color: '#fff', fontSize: 14, fontFamily: "'DM Sans',sans-serif" }}
                required
              />
            </div>
            <div className="form-group">
              <label style={{ fontSize: 12, color: '#999', fontWeight: 600, marginBottom: 6, display: 'block' }}>PIN</label>
              <input
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="4-6 digit PIN"
                inputMode="numeric"
                type="password"
                style={{ width: '100%', background: '#1A1A1A', border: '1px solid #333', borderRadius: 10, padding: '12px 14px', color: '#fff', fontSize: 18, letterSpacing: 4, fontFamily: "'DM Sans',sans-serif", textAlign: 'center' }}
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', background: '#FF5C3A', border: 'none', borderRadius: 10,
                padding: '14px', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer',
                opacity: loading ? 0.7 : 1, marginTop: 8,
              }}
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
          <p style={{ fontSize: 11, color: '#666', marginTop: 18, textAlign: 'center' }}>
            Don't know your PIN? Ask your supervisor to enable self-service for your account.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function WorkerLoginPage() {
  return (
    <Suspense fallback={null}>
      <WorkerLoginInner />
    </Suspense>
  );
}
