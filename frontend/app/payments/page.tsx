'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import AppShell from '../../components/layout/AppShell';
import { Avatar, PageHeader, StatCard, EmptyState, LoadingRows } from '../../components/ui';
import { paymentsApi } from '../../lib/api';
import { formatCurrency, formatDate, PAYMENT_METHOD_LABELS } from '../../lib/utils';
import { Payment } from '../../types';

const METHOD_BADGE: Record<string, string> = {
  cash: 'badge-green',
  bank_transfer: 'badge-blue',
  upi: 'badge-purple',
  cheque: 'badge-gray',
};

export default function PaymentsPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [search, setSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['payments', month, year, page],
    queryFn: () => paymentsApi.getAll({ month, year, page, limit: 20 }).then(r => r.data),
  });

  const { data: statsData } = useQuery({
    queryKey: ['payment-stats', month, year],
    queryFn: () => paymentsApi.getStats(month, year).then(r => r.data),
  });

  const payments: Payment[] = data?.payments || [];
  const filtered = payments.filter(p => {
    const name = typeof p.worker === 'object' ? p.worker.name : '';
    const matchSearch = !search || name.toLowerCase().includes(search.toLowerCase());
    const matchMethod = !methodFilter || p.paymentMethod === methodFilter;
    return matchSearch && matchMethod;
  });

  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  return (
    <AppShell>
      <div style={{ padding: '28px 32px' }}>
        <PageHeader title="Payment History" sub="All salary payments and transactions">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fff', border: '1px solid #E5E0D8', borderRadius: 8, padding: '7px 12px' }}>
            <svg width="14" height="14" fill="none" stroke="#6B6B6B" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input style={{ border: 'none', outline: 'none', fontSize: 13, width: 160, fontFamily: "'DM Sans',sans-serif", background: 'transparent', color: '#1A1A1A' }} placeholder="Search worker..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="form-input" style={{ width: 'auto', padding: '8px 12px', fontSize: 13 }} value={methodFilter} onChange={e => setMethodFilter(e.target.value)}>
            <option value="">All Methods</option>
            <option value="cash">Cash</option>
            <option value="bank_transfer">Bank Transfer</option>
            <option value="upi">UPI</option>
            <option value="cheque">Cheque</option>
          </select>
          <select className="form-input" style={{ width: 'auto', padding: '8px 12px', fontSize: 13 }} value={month} onChange={e => setMonth(+e.target.value)}>
            {months.map((m, i) => <option key={i+1} value={i+1}>{m} {year}</option>)}
          </select>
          <select className="form-input" style={{ width: 'auto', padding: '8px 12px', fontSize: 13 }} value={year} onChange={e => setYear(+e.target.value)}>
            {[2024,2025,2026].map(y => <option key={y}>{y}</option>)}
          </select>
        </PageHeader>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 24 }}>
          <StatCard label="Total Paid" value={formatCurrency(statsData?.totalPaid || 0)} sub={`${statsData?.count || 0} transactions`} color="#10B981" />
          <StatCard label="Via Cash" value={formatCurrency(statsData?.byMethod?.cash || 0)} color="#F59E0B" />
          <StatCard label="Via Bank / UPI" value={formatCurrency((statsData?.byMethod?.bank_transfer || 0) + (statsData?.byMethod?.upi || 0))} color="#3B82F6" />
        </div>

        {/* Table */}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Worker</th>
                <th>Period</th>
                <th>Present/Absent</th>
                <th>Gross</th>
                <th>Deductions</th>
                <th>Net Paid</th>
                <th>Method</th>
                <th>Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <LoadingRows rows={6} cols={9} />
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={9}>
                    <EmptyState title="No payments found" sub="Payments will appear here once you process salary" />
                  </td>
                </tr>
              ) : (
                filtered.map((p, i) => {
                  const workerName = typeof p.worker === 'object' ? p.worker.name : '—';
                  const workerRole = typeof p.worker === 'object' ? p.worker.role : '';
                  return (
                    <tr key={p._id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Avatar name={workerName} size={30} index={i} />
                          <div>
                            <div style={{ fontWeight: 600 }}>{workerName}</div>
                            <div style={{ fontSize: 11, color: '#6B6B6B' }}>{workerRole}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ fontSize: 12, color: '#6B6B6B' }}>
                        {formatDate(p.periodStart, 'dd MMM')} – {formatDate(p.periodEnd, 'dd MMM yyyy')}
                      </td>
                      <td>
                        <span style={{ fontSize: 12 }}>
                          <span style={{ color: '#065F46', fontWeight: 600 }}>{p.presentDays}P</span>
                          {' / '}
                          <span style={{ color: '#991B1B', fontWeight: 600 }}>{p.absentDays}A</span>
                        </span>
                      </td>
                      <td style={{ fontWeight: 600 }}>{formatCurrency(p.grossAmount)}</td>
                      <td style={{ color: '#EF4444' }}>−{formatCurrency(p.deductions + p.advance)}</td>
                      <td>
                        <span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 15, color: '#10B981' }}>
                          {formatCurrency(p.netAmount)}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${METHOD_BADGE[p.paymentMethod] || 'badge-gray'}`}>
                          {PAYMENT_METHOD_LABELS[p.paymentMethod] || p.paymentMethod}
                        </span>
                      </td>
                      <td style={{ fontSize: 12, color: '#6B6B6B' }}>{formatDate(p.paymentDate)}</td>
                      <td>
                        <span className={`badge ${p.status === 'paid' ? 'badge-green' : p.status === 'pending' ? 'badge-yellow' : 'badge-orange'}`}>
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data?.total > 20 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 }}>
            <button className="btn btn-ghost btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
            <span style={{ fontSize: 13, color: '#6B6B6B', alignSelf: 'center' }}>Page {page}</span>
            <button className="btn btn-ghost btn-sm" disabled={payments.length < 20} onClick={() => setPage(p => p + 1)}>Next →</button>
          </div>
        )}
      </div>
    </AppShell>
  );
}
