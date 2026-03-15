'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../lib/store';

export default function HomePage() {
  const router = useRouter();
  const { loadUser, isAuthenticated, isLoading } = useAuthStore();

  useEffect(() => {
    loadUser().then(() => {
      const auth = useAuthStore.getState();
      if (auth.isAuthenticated) router.replace('/dashboard');
      else router.replace('/login');
    });
  }, []);

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#F7F4EF' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 28, fontWeight: 800, marginBottom: 12 }}>WorkFlow</div>
        <div className="spinner spinner-dark" style={{ margin: '0 auto' }} />
      </div>
    </div>
  );
}
