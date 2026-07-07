const express = require('express');
const { body, validationResult } = require('express-validator');
const Advance = require('../models/Advance');
const Worker = require('../models/Worker');
const { protect, requirePermission } = require('../middleware/auth');
const { recordAudit } = require('../utils/audit');

const router = express.Router();
router.use(protect);

// ─── GET /api/advances ────────────────────────────────────────────
router.get('/', requirePermission('advance.read'), async (req, res) => {
  try {
    const { workerId, status } = req.query;
    const filter = { organization: req.user.organization };
    if (workerId) filter.worker = workerId;
    if (status) filter.status = status;

    const advances = await Advance.find(filter)
      .populate('worker', 'name role photoUrl')
      .populate('issuedBy', 'name email')
      .sort({ issuedOn: -1 });

    res.json({ success: true, advances });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── GET /api/advances/worker/:id/outstanding ─────────────────────
router.get('/worker/:id/outstanding', requirePermission('advance.read'), async (req, res) => {
  try {
    const advances = await Advance.find({
      organization: req.user.organization,
      worker: req.params.id,
      status: 'active',
    });
    const outstanding = advances.reduce((acc, a) => acc + Math.max(0, a.amount - a.repaid), 0);
    res.json({ success: true, outstanding, advances });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── POST /api/advances ───────────────────────────────────────────
router.post(
  '/',
  requirePermission('advance.write'),
  [
    body('workerId').notEmpty(),
    body('amount').isFloat({ gt: 0 }),
    body('type').optional().isIn(['advance', 'loan']),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
    try {
      const { workerId, amount, type = 'advance', reason = '', issuedOn, installmentAmount = 0 } = req.body;
      const worker = await Worker.findOne({
        _id: workerId,
        organization: req.user.organization,
        deletedAt: null,
      });
      if (!worker) return res.status(404).json({ success: false, message: 'Worker not found.' });

      const advance = await Advance.create({
        organization: req.user.organization,
        worker: workerId,
        type,
        amount,
        reason,
        issuedOn: issuedOn || new Date(),
        installmentAmount,
        issuedBy: req.user._id,
      });

      await recordAudit(req, {
        action: 'advance.create',
        resource: 'Advance',
        resourceId: advance._id,
        metadata: { worker: workerId, amount, type },
      });

      res.status(201).json({ success: true, advance });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// ─── POST /api/advances/:id/repay ─────────────────────────────────
router.post(
  '/:id/repay',
  requirePermission('advance.write'),
  [body('amount').isFloat({ gt: 0 })],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
    try {
      const advance = await Advance.findOne({
        _id: req.params.id,
        organization: req.user.organization,
      });
      if (!advance) return res.status(404).json({ success: false, message: 'Advance not found.' });

      const { amount, note = '' } = req.body;
      advance.repayments.push({ amount, date: new Date(), note });
      advance.repaid = (advance.repaid || 0) + amount;
      if (advance.repaid >= advance.amount) {
        advance.status = 'cleared';
      }
      await advance.save();

      await recordAudit(req, {
        action: 'advance.repay',
        resource: 'Advance',
        resourceId: advance._id,
        metadata: { amount },
      });

      res.json({ success: true, advance });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

module.exports = router;
