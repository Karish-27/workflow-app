const express = require('express');
const { body, validationResult, query } = require('express-validator');
const Worker = require('../models/Worker');
const Attendance = require('../models/Attendance');
const { protect, adminOnly } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

// ─── GET /api/workers ─────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { status, role, search, page = 1, limit = 50 } = req.query;
    const filter = { owner: req.user._id };

    if (status) filter.status = status;
    if (role) filter.role = role;
    if (search) filter.name = { $regex: search, $options: 'i' };

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [workers, total] = await Promise.all([
      Worker.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
      Worker.countDocuments(filter),
    ]);

    res.json({ success: true, workers, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── POST /api/workers ────────────────────────────────────────────
router.post(
  '/',
  adminOnly,
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('role').trim().notEmpty().withMessage('Role is required'),
    body('wageType').isIn(['daily', 'monthly']).withMessage('wageType must be daily or monthly'),
    body('wage').isNumeric().withMessage('Wage must be a number'),
    body('joiningDate').isISO8601().withMessage('Valid joining date required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

    try {
      const worker = await Worker.create({ ...req.body, owner: req.user._id });
      res.status(201).json({ success: true, worker });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// ─── GET /api/workers/:id ─────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const worker = await Worker.findOne({ _id: req.params.id, owner: req.user._id });
    if (!worker) return res.status(404).json({ success: false, message: 'Worker not found.' });
    res.json({ success: true, worker });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── PUT /api/workers/:id ─────────────────────────────────────────
router.put('/:id', adminOnly, async (req, res) => {
  try {
    const worker = await Worker.findOneAndUpdate(
      { _id: req.params.id, owner: req.user._id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!worker) return res.status(404).json({ success: false, message: 'Worker not found.' });
    res.json({ success: true, worker });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── DELETE /api/workers/:id ──────────────────────────────────────
router.delete('/:id', adminOnly, async (req, res) => {
  try {
    const worker = await Worker.findOneAndDelete({ _id: req.params.id, owner: req.user._id });
    if (!worker) return res.status(404).json({ success: false, message: 'Worker not found.' });

    // Also remove their attendance records
    await Attendance.deleteMany({ worker: req.params.id });

    res.json({ success: true, message: 'Worker deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── GET /api/workers/:id/attendance-summary ──────────────────────
router.get('/:id/attendance-summary', async (req, res) => {
  try {
    const { month, year } = req.query;
    const m = parseInt(month) || new Date().getMonth() + 1;
    const y = parseInt(year) || new Date().getFullYear();

    const start = new Date(y, m - 1, 1);
    const end = new Date(y, m, 0, 23, 59, 59);

    const records = await Attendance.find({
      worker: req.params.id,
      owner: req.user._id,
      date: { $gte: start, $lte: end },
    });

    const summary = {
      present: records.filter((r) => r.status === 'present').length,
      absent: records.filter((r) => r.status === 'absent').length,
      halfday: records.filter((r) => r.status === 'halfday').length,
      leave: records.filter((r) => r.status === 'leave').length,
      totalOvertimeHours: records.reduce((acc, r) => acc + (r.overtimeHours || 0), 0),
    };

    res.json({ success: true, summary, records });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
