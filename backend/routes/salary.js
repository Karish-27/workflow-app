const express = require('express');
const Worker = require('../models/Worker');
const Attendance = require('../models/Attendance');
const Payment = require('../models/Payment');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

// Helper: calculate salary from attendance records
function calculateSalary(worker, records, totalWorkingDays) {
  const presentDays = records.filter((r) => r.status === 'present').length;
  const absentDays = records.filter((r) => r.status === 'absent').length;
  const halfDays = records.filter((r) => r.status === 'halfday').length;
  const leaveDays = records.filter((r) => r.status === 'leave').length;
  const totalOvertimeHours = records.reduce((acc, r) => acc + (r.overtimeHours || 0), 0);

  let grossAmount = 0;
  let dailyRate = 0;

  if (worker.wageType === 'daily') {
    dailyRate = worker.wage;
    grossAmount = (presentDays + halfDays * 0.5) * dailyRate;
  } else {
    // Monthly: prorate based on working days
    dailyRate = totalWorkingDays > 0 ? worker.wage / totalWorkingDays : 0;
    grossAmount = (presentDays + halfDays * 0.5) * dailyRate;
  }

  const overtimePay = totalOvertimeHours * (worker.overtimeRate || 0);
  const deductions = absentDays * dailyRate;
  const netAmount = Math.max(0, grossAmount + overtimePay);

  return {
    worker: {
      _id: worker._id,
      name: worker.name,
      role: worker.role,
      wage: worker.wage,
      wageType: worker.wageType,
    },
    totalWorkingDays,
    presentDays,
    absentDays,
    halfDays,
    leaveDays,
    dailyRate: Math.round(dailyRate * 100) / 100,
    grossAmount: Math.round(grossAmount * 100) / 100,
    overtimeHours: totalOvertimeHours,
    overtimePay: Math.round(overtimePay * 100) / 100,
    deductions: Math.round(deductions * 100) / 100,
    netAmount: Math.round(netAmount * 100) / 100,
  };
}

// ─── GET /api/salary/:workerId?month=3&year=2026 ──────────────────
router.get('/:workerId', async (req, res) => {
  try {
    const { month, year } = req.query;
    const m = parseInt(month) || new Date().getMonth() + 1;
    const y = parseInt(year) || new Date().getFullYear();

    const worker = await Worker.findOne({ _id: req.params.workerId, owner: req.user._id });
    if (!worker) return res.status(404).json({ success: false, message: 'Worker not found.' });

    const start = new Date(y, m - 1, 1);
    const end = new Date(y, m, 0, 23, 59, 59);

    // Total calendar days in month minus Sundays (approx working days)
    const daysInMonth = new Date(y, m, 0).getDate();

    const records = await Attendance.find({
      worker: worker._id,
      owner: req.user._id,
      date: { $gte: start, $lte: end },
    });

    const breakdown = calculateSalary(worker, records, daysInMonth);

    const payments = await Payment.find({
      worker: worker._id,
      owner: req.user._id,
      periodStart: { $gte: start },
      periodEnd: { $lte: end },
      status: 'paid',
    });

    const totalPaid = payments.reduce((acc, p) => acc + p.netAmount, 0);
    breakdown.isPaid = payments.length > 0;
    breakdown.paidAmount = Math.round(totalPaid * 100) / 100;
    breakdown.paymentMethod = payments.length > 0 ? payments[payments.length - 1].paymentMethod : null;

    res.json({ success: true, breakdown, records, period: { month: m, year: y, start, end } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── GET /api/salary/summary/all?month=3&year=2026 ────────────────
router.get('/summary/all', async (req, res) => {
  try {
    const { month, year } = req.query;
    const m = parseInt(month) || new Date().getMonth() + 1;
    const y = parseInt(year) || new Date().getFullYear();

    const start = new Date(y, m - 1, 1);
    const end = new Date(y, m, 0, 23, 59, 59);
    const daysInMonth = new Date(y, m, 0).getDate();

    const workers = await Worker.find({ owner: req.user._id, status: 'active' });
    const allRecords = await Attendance.find({
      owner: req.user._id,
      date: { $gte: start, $lte: end },
    });

    const allPayments = await Payment.find({
      owner: req.user._id,
      periodStart: { $gte: start },
      periodEnd: { $lte: end },
      status: 'paid',
    });

    const summaries = workers.map((w) => {
      const workerRecords = allRecords.filter((r) => r.worker.toString() === w._id.toString());
      const breakdown = calculateSalary(w, workerRecords, daysInMonth);
      const workerPayments = allPayments.filter((p) => p.worker.toString() === w._id.toString());
      const totalPaid = workerPayments.reduce((acc, p) => acc + p.netAmount, 0);
      breakdown.isPaid = workerPayments.length > 0;
      breakdown.paidAmount = Math.round(totalPaid * 100) / 100;
      return breakdown;
    });

    const totalPayable = summaries.filter(s => !s.isPaid).reduce((acc, s) => acc + s.netAmount, 0);

    res.json({
      success: true,
      summaries,
      totalPayable: Math.round(totalPayable * 100) / 100,
      period: { month: m, year: y },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
