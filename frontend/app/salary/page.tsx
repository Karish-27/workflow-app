'use client';
export const dynamic = 'force-dynamic';
import { Suspense, useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import AppShell from '../../components/layout/AppShell';
import { Avatar, Modal, PageHeader, StatCard } from '../../components/ui';
import { workersApi, salaryApi, paymentsApi } from '../../lib/api';
import { formatCurrency, formatDate, PAYMENT_METHOD_LABELS } from '../../lib/utils';
import { Worker, SalaryBreakdown } from '../../types';

function SalaryContent() {
  const searchParams = useSearchParams();
  const qc = useQueryClient();
  const now = new Date();
  const [selectedWorker, setSelectedWorker] = useState<string>(searchParams.get('worker') || '');
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [payModal, setPayModal] = useState(false);
  const [payMethod, setPayMethod] = useState<'cash' | 'bank_transfer' | 'upi' | 'cheque'>('cash');
  const [payNote, setPayNote] = useState('');
  const [advance, setAdvance] = useState(0);

  const { data: workersData } = useQuery({
    queryKey: ['workers-active'],
    queryFn: () => workersApi.getAll({ status: 'active' }).then(r => r.data),
  });
  const workers: Worker[] = workersData?.workers || [];

  useEffect(() => {
    if (!selectedWorker && workers.length > 0) setSelectedWorker(workers[0]._id);
  }, [workers]);

  const { data: salaryData, isLoading } = useQuery({
    queryKey: ['salary', selectedWorker, month, year],
    queryFn: () => salaryApi.getWorkerSalary(selectedWorker, month, year).then(r => r.data),
    enabled: !!selectedWorker,
  });

  const { data: summaryData } = useQuery({
    queryKey: ['salary-summary', month, year],
    queryFn: () => salaryApi.getAllSummary(month, year).then(r => r.data),
  });

  const payMut = useMutation({
    mutationFn: (data: any) => paymentsApi.create(data),
    onSuccess: () => {
      toast.success('Payment recorded!');
      setPayModal(false);
      qc.invalidateQueries({ queryKey: ['payments'] });
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Payment failed'),
  });

  const breakdown: SalaryBreakdown | null = salaryData?.breakdown || null;
  const period = salaryData?.period;

  const handlePay = () => {
    if (!breakdown || !period) return;
    const finalNet = Math.max(0, breakdown.netAmount - advance);
    payMut.mutate({
      workerId: selectedWorker,
      periodStart: period.start,
      periodEnd: period.end,
      totalWorkingDays: breakdown.totalWorkingDays,
      presentDays: breakdown.presentDays,
      absentDays: breakdown.absentDays,
      halfDays: breakdown.halfDays,
      leaveDays: breakdown.leaveDays,
      overtimeHours: breakdown.overtimeHours,
      grossAmount: breakdown.grossAmount,
      deductions: breakdown.deductions,
      advance,
      netAmount: finalNet,
      paymentMethod: payMethod,
      notes: payNote,
    });
  };

  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  return (
    <AppShell>
      <div style={{ padding: '28px 32px' }}>
        <PageHeader title="Salary Calculator" sub="Automatic breakdown based on attendance">
          <select className="form-input" style={{ width: 'auto', padding: '8px 12px', fontSize: 13 }} value={selectedWorker} onChange={e => setSelectedWorker(e.target.value)}>
            <option value="">Select Worker</option>
            {workers.map(w => <option key={w._id} value={w._id}>{w.name}</option>)}
          </select>
          <select className="form-input" style={{ width: 'auto', padding: '8px 12px', fontSize: 13 }} value={month} onChange={e => setMonth(+e.target.value)}>
            {months.map((m, i) => <option key={i+1} value={i+1}>{m} {year}</option>)}
          </select>
          <select className="form-input" style={{ width: 'auto', padding: '8px 12px', fontSize: 13 }} value={year} onChange={e => setYear(+e.target.value)}>
            {[2024, 2025, 2026].map(y => <option key={y}>{y}</option>)}
          </select>
        </PageHeader>

        {/* All workers summary */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <h3 style={{ fontFamily: "'Syne',sans-serif", fontSize: 15, fontWeight: 700 }}>All Workers Summary</h3>
            <span style={{ fontSize: 13, color: '#6B6B6B' }}>Total payable: <strong style={{ color: '#10B981', fontFamily: "'Syne',sans-serif" }}>{formatCurrency(summaryData?.totalPayable || 0)}</strong></span>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Worker</th><th>Role</th><th>Wage</th><th>Present</th><th>Absent</th><th>Half</th><th>Deductions</th><th>Net Pay</th><th></th></tr>
              </thead>
              <tbody>
                {summaryData?.summaries?.map((s: SalaryBreakdown, i: number) => (
                  <tr key={s.worker._id} style={{ background: selectedWorker === s.worker._id ? '#FFF8F5' : undefined }}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Avatar name={s.worker.name} size={28} index={i} />
                        <span style={{ fontWeight: 600 }}>{s.worker.name}</span>
                      </div>
                    </td>
                    <td style={{ color: '#6B6B6B' }}>{s.worker.role}</td>
                    <td>{formatCurrency(s.worker.wage)}/{s.worker.wageType === 'daily' ? 'd' : 'mo'}</td>
                    <td><span className="badge badge-green">{s.presentDays}</span></td>
                    <td><span className="badge badge-red">{s.absentDays}</span></td>
                    <td><span className="badge badge-yellow">{s.halfDays}</span></td>
                    <td style={{ color: '#EF4444' }}>−{formatCurrency(s.deductions)}</td>
                    <td><span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, color: '#10B981', fontSize: 14 }}>{formatCurrency(s.netAmount)}</span></td>
                    <td>
                      <button className="btn btn-primary btn-xs" onClick={() => { setSelectedWorker(s.worker._id); setPayModal(true); }}>Pay</button>
                    </td>
                  </tr>
                )) || <tr><td colSpan={9} style={{ textAlign: 'center', color: '#6B6B6B', padding: 24 }}>No data</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        {/* Selected worker breakdown */}
        {selectedWorker && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <h3 style={{ fontFamily: "'Syne',sans-serif", fontSize: 15, fontWeight: 700 }}>
                Detailed Breakdown {breakdown ? `— ${breakdown.worker.name}` : ''}
              </h3>
              {breakdown && (
                <div style={{ display: 'flex', gap: 10 }}>
                  <button className="btn btn-green btn-sm" onClick={() => setPayModal(true)}>✓ Mark as Paid</button>
                  <button className="btn btn-primary btn-sm" onClick={() => setPayModal(true)}>Pay Now</button>
                </div>
              )}
            </div>

            {isLoading ? (
              <div className="card animate-pulse" style={{ height: 320 }} />
            ) : breakdown ? (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 20 }}>
                  <StatCard label="Present Days" value={breakdown.presentDays} sub={`of ${breakdown.totalWorkingDays} days`} color="#10B981" />
                  <StatCard label="Absent Days" value={breakdown.absentDays} color="#EF4444" />
                  <StatCard label="Gross Amount" value={formatCurrency(breakdown.grossAmount)} color="#3B82F6" />
                  <StatCard label="Net Payable" value={formatCurrency(breakdown.netAmount)} color="#FF5C3A" />
                </div>

                <div className="card" style={{ padding: 28 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingBottom: 16, marginBottom: 16, borderBottom: '1px solid #E5E0D8' }}>
                    <Avatar name={breakdown.worker.name} size={48} index={workers.findIndex(w => w._id === selectedWorker)} />
                    <div>
                      <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 18, fontWeight: 800 }}>{breakdown.worker.name}</div>
                      <div style={{ fontSize: 13, color: '#6B6B6B' }}>{breakdown.worker.role} · {formatCurrency(breakdown.worker.wage)}/{breakdown.worker.wageType === 'daily' ? 'day' : 'month'} · {months[month-1]} {year}</div>
                    </div>
                  </div>

                  {[
                    ['Base Rate', `${formatCurrency(breakdown.dailyRate)}/day`],
                    ['Total Days Tracked', `${breakdown.totalWorkingDays} days`],
                    ['Present Days', `${breakdown.presentDays} days`],
                    ['Gross Earnings', formatCurrency(breakdown.grossAmount), '#3B82F6'],
                    ['Absent Days Deduction', `${breakdown.absentDays} days (−${formatCurrency(breakdown.deductions)})`, '#EF4444'],
                    ['Half Days', `${breakdown.halfDays} days`],
                    ['Leave Days', `${breakdown.leaveDays} days (approved)`],
                    breakdown.overtimeHours > 0 ? ['Overtime', `${breakdown.overtimeHours} hrs (+${formatCurrency(breakdown.overtimePay)})`, '#10B981'] : null,
                  ].filter(Boolean).map(([label, val, color]: any, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #F0ECE8' }}>
                      <span style={{ fontSize: 13, color: '#6B6B6B' }}>{label}</span>
                      <span style={{ fontSize: 14, fontWeight: 600, color: color || '#1A1A1A' }}>{val}</span>
                    </div>
                  ))}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 16, marginTop: 4 }}>
                    <span style={{ fontFamily: "'Syne',sans-serif", fontSize: 17, fontWeight: 800 }}>Net Payable</span>
                    <span style={{ fontFamily: "'Syne',sans-serif", fontSize: 26, fontWeight: 800, color: '#FF5C3A' }}>{formatCurrency(breakdown.netAmount)}</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="card" style={{ textAlign: 'center', padding: 40, color: '#6B6B6B' }}>
                No attendance data found for this period.
              </div>
            )}
          </>
        )}
      </div>

      {/* Payment Modal */}
      <Modal open={payModal} onClose={() => setPayModal(false)} title="Process Payment">
        {breakdown && (
          <>
            <div style={{ background: '#F7F4EF', borderRadius: 12, padding: 16, marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: '#6B6B6B', marginBottom: 4 }}>Paying to</div>
              <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 18, fontWeight: 800 }}>{breakdown.worker.name}</div>
              <div style={{ fontSize: 12, color: '#6B6B6B' }}>{breakdown.worker.role} · {months[month-1]} {year}</div>
              <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 30, fontWeight: 800, color: '#10B981', marginTop: 8 }}>
                {formatCurrency(Math.max(0, breakdown.netAmount - advance))}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Payment Method</label>
              <select className="form-input" value={payMethod} onChange={e => setPayMethod(e.target.value as any)}>
                <option value="cash">Cash</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="upi">UPI</option>
                <option value="cheque">Cheque</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Advance Deduction (₹)</label>
              <input className="form-input" type="number" min={0} max={breakdown.netAmount} value={advance} onChange={e => setAdvance(+e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Notes (Optional)</label>
              <input className="form-input" value={payNote} onChange={e => setPayNote(e.target.value)} placeholder="e.g. March salary" />
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setPayModal(false)}>Cancel</button>
              <button className="btn btn-green" disabled={payMut.isPending} onClick={handlePay}>
                {payMut.isPending ? <><span className="spinner" />Processing...</> : 'Confirm Payment'}
              </button>
            </div>
          </>
        )}
      </Modal>
    </AppShell>
  );
}

export default function SalaryPage() {
  return (
    <Suspense>
      <SalaryContent />
    </Suspense>
  );
}
