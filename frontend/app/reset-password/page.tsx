'use client';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { authApi } from '../../lib/api';

function ResetPasswordInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setEmail(params.get('email') || '');
    setToken(params.get('token') || '');
  }, [params]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      toast.error('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      await authApi.resetPassword(email, token, password);
      toast.success('Password reset successful. Please sign in.');
      router.replace('/login');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Reset failed. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#F7F4EF', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Link href="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: '#1A1A1A', borderRadius: 14, padding: '10px 20px', textDecoration: 'none' }}>
            <span style={{ fontFamily: "'Syne',sans-serif", fontSize: 20, fontWeight: 800, color: '#fff' }}>WorkFlow</span>
          </Link>
        </div>

        <div className="card" style={{ padding: 32 }}>
          <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Set a new password</h1>
          <p style={{ fontSize: 14, color: '#6B6B6B', marginBottom: 24 }}>
            Choose a strong password for <b>{email || 'your account'}</b>.
          </p>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">New password</label>
              <input className="form-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
            </div>
            <div className="form-group">
              <label className="form-label">Confirm password</label>
              <input className="form-input" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={6} />
            </div>
            <button className="btn btn-primary" type="submit" disabled={loading || !email || !token} style={{ width: '100%', justifyContent: 'center', padding: '12px 18px', fontSize: 15, marginTop: 4 }}>
              {loading ? <><span className="spinner" />Updating...</> : 'Reset password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordInner />
    </Suspense>
  );
}
