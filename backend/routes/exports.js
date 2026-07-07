const express = require('express');
const Worker = require('../models/Worker');
const Attendance = require('../models/Attendance');
const Payment = require('../models/Payment');
const { protect, requirePermission } = require('../middleware/auth');
const { sendCsv } = require('../utils/csv');

const router = express.Router();
router.use(protect);

function formatDate(d) {
  if (!d) return '';
  return new Date(d).toISOString().slice(0, 10);
}

// ─── GET /api/exports/workers.csv ─────────────────────────────────
router.get('/workers.csv', requirePermission('export.read'), async (req, res) => {
  try {
    const workers = await Worker.find({
      organization: req.user.organization,
      deletedAt: null,
    }).sort({ name: 1 });

    const headers = ['Name', 'Phone', 'Role', 'Wage Type', 'Wage', 'Overtime Rate', 'Joining Date', 'Status'];
    const rows = workers.map((w) => [
      w.name,
      w.phone || '',
      w.role,
      w.wageType,
      w.wage,
      w.overtimeRate || 0,
      formatDate(w.joiningDate),
      w.status,
    ]);
    sendCsv(res, `workers-${formatDate(new Date())}.csv`, headers, rows);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── GET /api/exports/attendance.csv?month=3&year=2026 ────────────
router.get('/attendance.csv', requirePermission('export.read'), async (req, res) => {
  try {
    const { month, year, workerId } = req.query;
    const m = parseInt(month) || new Date().getMonth() + 1;
    const y = parseInt(year) || new Date().getFullYear();
    const start = new Date(y, m - 1, 1);
    const end = new Date(y, m, 0, 23, 59, 59);

    const filter = {
      organization: req.user.organization,
      date: { $gte: start, $lte: end },
    };
    if (workerId) filter.worker = workerId;

    const records = await Attendance.find(filter)
      .populate('worker', 'name role')
      .sort({ date: 1 });

    const headers = ['Date', 'Worker', 'Role', 'Status', 'Overtime Hours', 'Check-in', 'Check-out', 'Source', 'Notes'];
    const rows = records.map((r) => [
      formatDate(r.date),
      r.worker?.name || '',
      r.worker?.role || '',
      r.status,
      r.overtimeHours || 0,
      r.checkInAt ? new Date(r.checkInAt).toISOString() : '',
      r.checkOutAt ? new Date(r.checkOutAt).toISOString() : '',
      r.source || '',
      r.notes || '',
    ]);
    sendCsv(res, `attendance-${y}-${String(m).padStart(2, '0')}.csv`, headers, rows);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── GET /api/exports/payments.csv?month=3&year=2026 ──────────────
router.get('/payments.csv', requirePermission('export.read'), async (req, res) => {
  try {
    const { month, year, workerId } = req.query;
    const filter = { organization: req.user.organization, deletedAt: null };
    if (workerId) filter.worker = workerId;
    if (month && year) {
      const m = parseInt(month);
      const y = parseInt(year);
      filter.paymentDate = {
        $gte: new Date(y, m - 1, 1),
        $lte: new Date(y, m, 0, 23, 59, 59),
      };
    }

    const payments = await Payment.find(filter)
      .populate('worker', 'name role')
      .sort({ paymentDate: -1 });

    const headers = [
      'Payment Date',
      'Worker',
      'Role',
      'Period Start',
      'Period End',
      'Present',
      'Half',
      'Leave',
      'OT Hours',
      'Gross',
      'Deductions',
      'Advance',
      'Net',
      'Method',
      'Reference',
      'Notes',
    ];
    const rows = payments.map((p) => [
      formatDate(p.paymentDate),
      p.worker?.name || '',
      p.worker?.role || '',
      formatDate(p.periodStart),
      formatDate(p.periodEnd),
      p.presentDays,
      p.halfDays,
      p.leaveDays,
      p.overtimeHours,
      p.grossAmount,
      p.deductions,
      p.advance,
      p.netAmount,
      p.paymentMethod,
      p.transactionRef || '',
      p.notes || '',
    ]);
    sendCsv(res, `payments-${formatDate(new Date())}.csv`, headers, rows);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
