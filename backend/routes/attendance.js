const express = require('express');
const { body, validationResult } = require('express-validator');
const Attendance = require('../models/Attendance');
const Worker = require('../models/Worker');
const { protect, requirePermission } = require('../middleware/auth');
const { recordAudit } = require('../utils/audit');

const router = express.Router();
router.use(protect);

// ─── GET /api/attendance?month=3&year=2026 ────────────────────────
router.get('/', requirePermission('attendance.read'), async (req, res) => {
  try {
    const { month, year, workerId } = req.query;
    const m = parseInt(month) || new Date().getMonth() + 1;
    const y = parseInt(year) || new Date().getFullYear();

    const start = new Date(y, m - 1, 1);
    const end = new Date(y, m, 0, 23, 59, 59);

    const filter = { organization: req.user.organization, date: { $gte: start, $lte: end } };
    if (workerId) filter.worker = workerId;

    const records = await Attendance.find(filter)
      .populate('worker', 'name role wage wageType')
      .sort({ date: 1 });

    res.json({ success: true, records });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── POST /api/attendance ─────────────────────────────────────────
router.post(
  '/',
  requirePermission('attendance.write'),
  [
    body('workerId').notEmpty().withMessage('Worker ID required'),
    body('date').isISO8601().withMessage('Valid date required'),
    body('status').isIn(['present', 'absent', 'halfday', 'leave']).withMessage('Invalid status'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

    try {
      const { workerId, date, status, overtimeHours, notes } = req.body;

      const worker = await Worker.findOne({
        _id: workerId,
        organization: req.user.organization,
        deletedAt: null,
      });
      if (!worker) return res.status(404).json({ success: false, message: 'Worker not found.' });

      const dateObj = new Date(date);
      dateObj.setHours(0, 0, 0, 0);

      const record = await Attendance.findOneAndUpdate(
        { worker: workerId, date: dateObj },
        {
          worker: workerId,
          owner: req.user._id,
          organization: req.user.organization,
          date: dateObj,
          status,
          overtimeHours: overtimeHours || 0,
          notes: notes || '',
          markedBy: req.user._id,
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      await recordAudit(req, {
        action: 'attendance.mark',
        resource: 'Attendance',
        resourceId: record._id,
        metadata: { worker: workerId, status, date: dateObj },
      });

      res.json({ success: true, record });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// ─── POST /api/attendance/bulk ────────────────────────────────────
router.post('/bulk', requirePermission('attendance.write'), async (req, res) => {
  try {
    const { date, records } = req.body;

    if (!date || !Array.isArray(records)) {
      return res.status(400).json({ success: false, message: 'date and records array required.' });
    }

    const dateObj = new Date(date);
    dateObj.setHours(0, 0, 0, 0);

    const workerIds = records.map((r) => r.workerId);
    const workers = await Worker.find({
      _id: { $in: workerIds },
      organization: req.user.organization,
      deletedAt: null,
    });
    if (workers.length !== workerIds.length) {
      return res.status(400).json({ success: false, message: 'Some workers not found.' });
    }

    const ops = records.map((r) => ({
      updateOne: {
        filter: { worker: r.workerId, date: dateObj },
        update: {
          $set: {
            worker: r.workerId,
            owner: req.user._id,
            organization: req.user.organization,
            date: dateObj,
            status: r.status,
            overtimeHours: r.overtimeHours || 0,
            notes: r.notes || '',
            markedBy: req.user._id,
          },
        },
        upsert: true,
      },
    }));

    await Attendance.bulkWrite(ops);

    await recordAudit(req, {
      action: 'attendance.bulk_mark',
      resource: 'Attendance',
      metadata: { count: records.length, date: dateObj },
    });

    res.json({ success: true, message: `${records.length} records saved.` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── GET /api/attendance/today ────────────────────────────────────
router.get('/today', requirePermission('attendance.read'), async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const records = await Attendance.find({
      organization: req.user.organization,
      date: { $gte: today, $lt: tomorrow },
    }).populate('worker', 'name role');

    res.json({ success: true, records });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── DELETE /api/attendance/:id ───────────────────────────────────
router.delete('/:id', requirePermission('attendance.write'), async (req, res) => {
  try {
    const deleted = await Attendance.findOneAndDelete({
      _id: req.params.id,
      organization: req.user.organization,
    });
    if (!deleted) return res.status(404).json({ success: false, message: 'Record not found.' });

    await recordAudit(req, {
      action: 'attendance.delete',
      resource: 'Attendance',
      resourceId: req.params.id,
    });

    res.json({ success: true, message: 'Record deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
