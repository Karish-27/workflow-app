'use client';
import { useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { authApi } from '../../lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authApi.forgotPassword(email);
      setSent(true);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Could not send reset link');
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
          {sent ? (
            <>
              <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Check your email</h1>
              <p style={{ fontSize: 14, color: '#6B6B6B', marginBottom: 24 }}>
                If an account exists for <b>{email}</b>, a password reset link has been sent. The link expires in 1 hour.
              </p>
              <Link href="/login" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '12px 18px', fontSize: 15 }}>
                Back to login
              </Link>
            </>
          ) : (
            <>
              <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Reset your password</h1>
              <p style={{ fontSize: 14, color: '#6B6B6B', marginBottom: 24 }}>
                Enter the email associated with your account and we'll send you a link to reset your password.
              </p>
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input
                    className="form-input"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                  />
                </div>
                <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center', padding: '12px 18px', fontSize: 15, marginTop: 4 }}>
                  {loading ? <><span className="spinner" />Sending...</> : 'Send reset link'}
                </button>
              </form>
            </>
          )}
        </div>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: '#6B6B6B' }}>
          Remember it?{' '}
          <Link href="/login" style={{ color: '#FF5C3A', fontWeight: 600, textDecoration: 'none' }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
