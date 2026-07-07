const express = require('express');
const { body, validationResult } = require('express-validator');
const Leave = require('../models/Leave');
const Worker = require('../models/Worker');
const Attendance = require('../models/Attendance');
const { protect, requirePermission } = require('../middleware/auth');
const { recordAudit } = require('../utils/audit');

const router = express.Router();
router.use(protect);

function daysBetween(start, end) {
  const a = new Date(start);
  const b = new Date(end);
  a.setHours(0, 0, 0, 0);
  b.setHours(0, 0, 0, 0);
  return Math.floor((b - a) / (24 * 60 * 60 * 1000)) + 1;
}

// ─── GET /api/leaves ──────────────────────────────────────────────
router.get('/', requirePermission('leave.read'), async (req, res) => {
  try {
    const { status, workerId } = req.query;
    const filter = { organization: req.user.organization };
    if (status) filter.status = status;
    if (workerId) filter.worker = workerId;

    const leaves = await Leave.find(filter)
      .populate('worker', 'name role photoUrl')
      .populate('reviewedBy', 'name email')
      .sort({ startDate: -1 });
    res.json({ success: true, leaves });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── POST /api/leaves ─────────────────────────────────────────────
// Admin/supervisor creates on behalf of a worker.
router.post(
  '/',
  requirePermission('leave.write'),
  [
    body('workerId').notEmpty(),
    body('startDate').isISO8601(),
    body('endDate').isISO8601(),
    body('type').isIn(['casual', 'sick', 'paid', 'unpaid']),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
    try {
      const { workerId, startDate, endDate, type, reason = '' } = req.body;
      const worker = await Worker.findOne({
        _id: workerId,
        organization: req.user.organization,
        deletedAt: null,
      });
      if (!worker) return res.status(404).json({ success: false, message: 'Worker not found.' });

      const totalDays = daysBetween(startDate, endDate);
      if (totalDays < 1) return res.status(400).json({ success: false, message: 'Invalid date range.' });

      const leave = await Leave.create({
        organization: req.user.organization,
        worker: workerId,
        type,
        startDate,
        endDate,
        totalDays,
        reason,
        status: 'pending',
        requestedBy: req.user._id,
      });

      await recordAudit(req, {
        action: 'leave.request',
        resource: 'Leave',
        resourceId: leave._id,
        metadata: { worker: workerId, type, totalDays },
      });

      res.status(201).json({ success: true, leave });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// ─── POST /api/leaves/:id/approve ─────────────────────────────────
router.post('/:id/approve', requirePermission('*'), async (req, res) => {
  try {
    const leave = await Leave.findOne({
      _id: req.params.id,
      organization: req.user.organization,
    });
    if (!leave) return res.status(404).json({ success: false, message: 'Leave not found.' });
    if (leave.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Only pending leaves can be approved.' });
    }

    leave.status = 'approved';
    leave.reviewedBy = req.user._id;
    leave.reviewedAt = new Date();
    leave.reviewNote = req.body.note || '';
    await leave.save();

    // Auto-mark attendance for the leave period
    const worker = leave.worker;
    const start = new Date(leave.startDate);
    const end = new Date(leave.endDate);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    const ops = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const date = new Date(d);
      ops.push({
        updateOne: {
          filter: { worker, date },
          update: {
            $set: {
              worker,
              owner: req.user._id,
              organization: req.user.organization,
              date,
              status: 'leave',
              notes: `Auto-marked from approved ${leave.type} leave`,
              markedBy: req.user._id,
              source: 'admin',
            },
          },
          upsert: true,
        },
      });
    }
    if (ops.length > 0) await Attendance.bulkWrite(ops);

    // Decrement leave balance if paid type
    if (['casual', 'sick', 'paid'].includes(leave.type)) {
      const balanceKey = `leaveBalance.${leave.type}`;
      await Worker.updateOne(
        { _id: worker, organization: req.user.organization },
        { $inc: { [balanceKey]: -leave.totalDays } }
      );
    }

    await recordAudit(req, {
      action: 'leave.approve',
      resource: 'Leave',
      resourceId: leave._id,
    });

    res.json({ success: true, leave });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── POST /api/leaves/:id/reject ──────────────────────────────────
router.post('/:id/reject', requirePermission('*'), async (req, res) => {
  try {
    const leave = await Leave.findOne({
      _id: req.params.id,
      organization: req.user.organization,
    });
    if (!leave) return res.status(404).json({ success: false, message: 'Leave not found.' });
    if (leave.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Only pending leaves can be rejected.' });
    }
    leave.status = 'rejected';
    leave.reviewedBy = req.user._id;
    leave.reviewedAt = new Date();
    leave.reviewNote = req.body.note || '';
    await leave.save();

    await recordAudit(req, {
      action: 'leave.reject',
      resource: 'Leave',
      resourceId: leave._id,
    });

    res.json({ success: true, leave });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
