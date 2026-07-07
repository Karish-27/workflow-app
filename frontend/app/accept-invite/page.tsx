'use client';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { authApi } from '../../lib/api';

function AcceptInviteInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setEmail(params.get('email') || '');
    setToken(params.get('token') || '');
  }, [params]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      const res = await authApi.acceptInvite({ email, token, name, password });
      const { token: jwt, user } = res.data;
      localStorage.setItem('wf_token', jwt);
      localStorage.setItem('wf_user', JSON.stringify(user));
      toast.success(`Welcome to ${user.organization?.name || 'WorkFlow'}!`);
      router.replace('/dashboard');
      router.refresh();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Could not accept invite');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#F7F4EF', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ width: '100%', maxWidth: 460 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Link href="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: '#1A1A1A', borderRadius: 14, padding: '10px 20px', textDecoration: 'none' }}>
            <span style={{ fontFamily: "'Syne',sans-serif", fontSize: 20, fontWeight: 800, color: '#fff' }}>WorkFlow</span>
          </Link>
        </div>

        <div className="card" style={{ padding: 32 }}>
          <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Accept your invitation</h1>
          <p style={{ fontSize: 14, color: '#6B6B6B', marginBottom: 24 }}>
            You're joining as <b>{email || 'a teammate'}</b>. Set up your profile to continue.
          </p>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Your name</label>
              <input className="form-input" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" required />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input className="form-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} placeholder="At least 6 characters" />
            </div>
            <button className="btn btn-primary" type="submit" disabled={loading || !email || !token} style={{ width: '100%', justifyContent: 'center', padding: '12px 18px', fontSize: 15, marginTop: 4 }}>
              {loading ? <><span className="spinner" />Setting up...</> : 'Accept & continue'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={null}>
      <AcceptInviteInner />
    </Suspense>
  );
}
