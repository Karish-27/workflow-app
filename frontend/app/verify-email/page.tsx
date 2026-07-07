'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { authApi } from '../../lib/api';

function VerifyEmailInner() {
  const params = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const email = params.get('email');
    const token = params.get('token');
    if (!email || !token) {
      setStatus('error');
      setMessage('Missing token or email in the verification link.');
      return;
    }
    authApi
      .verifyEmail(email, token)
      .then((res) => {
        setStatus('success');
        setMessage(res.data?.message || 'Email verified.');
      })
      .catch((err) => {
        setStatus('error');
        setMessage(err.response?.data?.message || 'Verification failed.');
      });
  }, [params]);

  return (
    <div style={{ minHeight: '100vh', background: '#F7F4EF', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Link href="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: '#1A1A1A', borderRadius: 14, padding: '10px 20px', textDecoration: 'none' }}>
            <span style={{ fontFamily: "'Syne',sans-serif", fontSize: 20, fontWeight: 800, color: '#fff' }}>WorkFlow</span>
          </Link>
        </div>

        <div className="card" style={{ padding: 32, textAlign: 'center' }}>
          {status === 'loading' && (
            <>
              <div style={{ marginBottom: 16 }}><span className="spinner" /></div>
              <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Verifying your email…</h1>
            </>
          )}
          {status === 'success' && (
            <>
              <div style={{ fontSize: 48, marginBottom: 8 }}>✓</div>
              <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Email verified</h1>
              <p style={{ fontSize: 14, color: '#6B6B6B', marginBottom: 24 }}>{message}</p>
              <Link href="/dashboard" className="btn btn-primary" style={{ display: 'inline-flex', justifyContent: 'center', padding: '12px 22px', fontSize: 15 }}>
                Go to dashboard
              </Link>
            </>
          )}
          {status === 'error' && (
            <>
              <div style={{ fontSize: 40, marginBottom: 8 }}>⚠</div>
              <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Verification failed</h1>
              <p style={{ fontSize: 14, color: '#6B6B6B', marginBottom: 24 }}>{message}</p>
              <Link href="/login" className="btn btn-primary" style={{ display: 'inline-flex', justifyContent: 'center', padding: '12px 22px', fontSize: 15 }}>
                Back to login
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailInner />
    </Suspense>
  );
}
