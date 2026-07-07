const express = require('express');
const { body, validationResult } = require('express-validator');
const Payment = require('../models/Payment');
const Worker = require('../models/Worker');
const Organization = require('../models/Organization');
const { protect, requirePermission } = require('../middleware/auth');
const { recordAudit } = require('../utils/audit');
const { streamPayslip } = require('../utils/payslipPdf');

const router = express.Router();
router.use(protect);

// ─── GET /api/payments ────────────────────────────────────────────
router.get('/', requirePermission('payment.read'), async (req, res) => {
  try {
    const { workerId, month, year, page = 1, limit = 20 } = req.query;
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

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [payments, total] = await Promise.all([
      Payment.find(filter)
        .populate('worker', 'name role')
        .sort({ paymentDate: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Payment.countDocuments(filter),
    ]);

    res.json({ success: true, payments, total });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── POST /api/payments ───────────────────────────────────────────
router.post(
  '/',
  requirePermission('payment.write'),
  [
    body('workerId').notEmpty().withMessage('Worker ID required'),
    body('periodStart').isISO8601().withMessage('Valid period start required'),
    body('periodEnd').isISO8601().withMessage('Valid period end required'),
    body('netAmount').isNumeric().withMessage('Net amount required'),
    body('paymentMethod')
      .isIn(['cash', 'bank_transfer', 'upi', 'cheque'])
      .withMessage('Invalid payment method'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

    try {
      const {
        workerId,
        periodStart,
        periodEnd,
        totalWorkingDays,
        presentDays,
        absentDays,
        halfDays,
        leaveDays,
        overtimeHours,
        grossAmount,
        deductions,
        advance,
        netAmount,
        paymentMethod,
        paymentDate,
        transactionRef,
        notes,
      } = req.body;

      const worker = await Worker.findOne({
        _id: workerId,
        organization: req.user.organization,
        deletedAt: null,
      });
      if (!worker) return res.status(404).json({ success: false, message: 'Worker not found.' });

      const payment = await Payment.create({
        worker: workerId,
        owner: req.user._id,
        organization: req.user.organization,
        createdBy: req.user._id,
        periodStart,
        periodEnd,
        totalWorkingDays: totalWorkingDays || 0,
        presentDays: presentDays || 0,
        absentDays: absentDays || 0,
        halfDays: halfDays || 0,
        leaveDays: leaveDays || 0,
        overtimeHours: overtimeHours || 0,
        grossAmount: grossAmount || netAmount,
        deductions: deductions || 0,
        advance: advance || 0,
        netAmount,
        paymentMethod,
        paymentDate: paymentDate || new Date(),
        transactionRef: transactionRef || '',
        notes: notes || '',
        status: 'paid',
      });

      await payment.populate('worker', 'name role');

      await recordAudit(req, {
        action: 'payment.create',
        resource: 'Payment',
        resourceId: payment._id,
        metadata: {
          worker: workerId,
          netAmount,
          paymentMethod,
        },
      });

      res.status(201).json({ success: true, payment });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// ─── GET /api/payments/stats ──────────────────────────────────────
router.get('/stats', requirePermission('payment.read'), async (req, res) => {
  try {
    const { month, year } = req.query;
    const m = parseInt(month) || new Date().getMonth() + 1;
    const y = parseInt(year) || new Date().getFullYear();

    const start = new Date(y, m - 1, 1);
    const end = new Date(y, m, 0, 23, 59, 59);

    const payments = await Payment.find({
      organization: req.user.organization,
      deletedAt: null,
      paymentDate: { $gte: start, $lte: end },
    });

    const totalPaid = payments.reduce((acc, p) => acc + p.netAmount, 0);
    const byMethod = payments.reduce((acc, p) => {
      acc[p.paymentMethod] = (acc[p.paymentMethod] || 0) + p.netAmount;
      return acc;
    }, {});

    res.json({ success: true, totalPaid, count: payments.length, byMethod });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── GET /api/payments/:id ────────────────────────────────────────
router.get('/:id', requirePermission('payment.read'), async (req, res) => {
  try {
    const payment = await Payment.findOne({
      _id: req.params.id,
      organization: req.user.organization,
      deletedAt: null,
    }).populate('worker', 'name role');
    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found.' });
    res.json({ success: true, payment });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── GET /api/payments/:id/payslip.pdf ────────────────────────────
router.get('/:id/payslip.pdf', requirePermission('payment.read'), async (req, res) => {
  try {
    const payment = await Payment.findOne({
      _id: req.params.id,
      organization: req.user.organization,
      deletedAt: null,
    }).populate('worker', 'name role phone');
    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found.' });

    const organization = await Organization.findById(req.user.organization);

    streamPayslip(res, {
      payment,
      worker: payment.worker,
      organization,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── DELETE /api/payments/:id ─────────────────────────────────────
router.delete('/:id', requirePermission('payment.write'), async (req, res) => {
  try {
    const payment = await Payment.findOne({
      _id: req.params.id,
      organization: req.user.organization,
      deletedAt: null,
    });
    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found.' });
    payment.deletedAt = new Date();
    await payment.save();

    await recordAudit(req, {
      action: 'payment.delete',
      resource: 'Payment',
      resourceId: payment._id,
    });

    res.json({ success: true, message: 'Payment archived.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
