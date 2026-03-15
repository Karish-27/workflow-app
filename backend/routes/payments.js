const express = require('express');
const { body, validationResult } = require('express-validator');
const Payment = require('../models/Payment');
const Worker = require('../models/Worker');
const { protect, adminOnly } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

// ─── GET /api/payments ────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { workerId, month, year, page = 1, limit = 20 } = req.query;
    const filter = { owner: req.user._id };

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
  adminOnly,
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

      const worker = await Worker.findOne({ _id: workerId, owner: req.user._id });
      if (!worker) return res.status(404).json({ success: false, message: 'Worker not found.' });

      const payment = await Payment.create({
        worker: workerId,
        owner: req.user._id,
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
      res.status(201).json({ success: true, payment });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// ─── GET /api/payments/stats ──────────────────────────────────────
router.get('/stats', async (req, res) => {
  try {
    const { month, year } = req.query;
    const m = parseInt(month) || new Date().getMonth() + 1;
    const y = parseInt(year) || new Date().getFullYear();

    const start = new Date(y, m - 1, 1);
    const end = new Date(y, m, 0, 23, 59, 59);

    const payments = await Payment.find({
      owner: req.user._id,
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
router.get('/:id', async (req, res) => {
  try {
    const payment = await Payment.findOne({ _id: req.params.id, owner: req.user._id }).populate(
      'worker',
      'name role'
    );
    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found.' });
    res.json({ success: true, payment });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
