'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';
import { workerPortalApi } from '../../../lib/api';
import { formatCurrency } from '../../../lib/utils';

interface MyPayment {
  _id: string;
  periodStart: string;
  periodEnd: string;
  netAmount: number;
  grossAmount: number;
  paymentMethod: string;
  paymentDate: string;
  status: string;
}

export default function MyPaymentsPage() {
  const router = useRouter();
  const [payments, setPayments] = useState<MyPayment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('wf_worker_token') : null;
    if (!token) {
      router.replace('/worker-portal/login');
      return;
    }
    workerPortalApi
      .myPayments()
      .then((r) => setPayments(r.data.payments || []))
      .catch(() => {
        localStorage.removeItem('wf_worker_token');
        router.replace('/worker-portal/login');
      })
      .finally(() => setLoading(false));
  }, [router]);

  const download = async (id: string) => {
    const token = localStorage.getItem('wf_worker_token');
    const res = await axios.get(
      (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5500/api') + `/worker-portal/payslip/${id}`,
      { responseType: 'blob', headers: { Authorization: `Bearer ${token}` } }
    );
    const blob = new Blob([res.data], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payslip-${id.slice(-6)}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#F7F4EF', padding: 16 }}>
      <div style={{ maxWidth: 480, margin: '0 auto' }}>
        <Link href="/worker-portal" style={{ fontSize: 13, color: '#FF5C3A', textDecoration: 'none' }}>
          ← Back
        </Link>
        <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 24, fontWeight: 800, margin: '12px 0 20px' }}>My payslips</h1>

        {loading ? (
          <div style={{ color: '#6B6B6B', fontSize: 13 }}>Loading…</div>
        ) : payments.length === 0 ? (
          <div className="card" style={{ padding: 20, color: '#6B6B6B', fontSize: 13 }}>No payments yet.</div>
        ) : (
          payments.map((p) => (
            <div key={p._id} className="card" style={{ padding: 18, marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 12, color: '#6B6B6B' }}>Period</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>
                    {new Date(p.periodStart).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} —
                    {' '}
                    {new Date(p.periodEnd).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </div>
                  <div style={{ fontSize: 11, color: '#6B6B6B', marginTop: 4 }}>
                    Paid {new Date(p.paymentDate).toLocaleDateString('en-IN')} · {p.paymentMethod}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 20, fontWeight: 800, color: '#16A34A' }}>
                    {formatCurrency(p.netAmount)}
                  </div>
                  <button
                    onClick={() => download(p._id)}
                    style={{ marginTop: 6, background: '#1A1A1A', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 12, cursor: 'pointer' }}
                  >
                    Download PDF
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
