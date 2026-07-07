const express = require('express');
const { body, validationResult } = require('express-validator');
const Worker = require('../models/Worker');
const Attendance = require('../models/Attendance');
const Organization = require('../models/Organization');
const { protect, requirePermission } = require('../middleware/auth');
const { recordAudit } = require('../utils/audit');

const router = express.Router();
router.use(protect);

// ─── GET /api/workers ─────────────────────────────────────────────
router.get('/', requirePermission('worker.read'), async (req, res) => {
  try {
    const { status, role, search, page = 1, limit = 50, includeDeleted } = req.query;
    const filter = { organization: req.user.organization };
    if (!includeDeleted) filter.deletedAt = null;

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
  requirePermission('*'),
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
      // Enforce worker limit
      const org = await Organization.findById(req.user.organization);
      const count = await Worker.countDocuments({
        organization: req.user.organization,
        deletedAt: null,
      });
      if (org && count >= org.workerLimit) {
        return res.status(402).json({
          success: false,
          message: `Worker limit (${org.workerLimit}) reached for plan ${org.plan}. Upgrade to add more workers.`,
        });
      }

      const worker = await Worker.create({
        ...req.body,
        owner: req.user._id,
        organization: req.user.organization,
      });

      await recordAudit(req, {
        action: 'worker.create',
        resource: 'Worker',
        resourceId: worker._id,
        metadata: { name: worker.name, role: worker.role },
      });

      res.status(201).json({ success: true, worker });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// ─── GET /api/workers/:id ─────────────────────────────────────────
router.get('/:id', requirePermission('worker.read'), async (req, res) => {
  try {
    const worker = await Worker.findOne({
      _id: req.params.id,
      organization: req.user.organization,
      deletedAt: null,
    });
    if (!worker) return res.status(404).json({ success: false, message: 'Worker not found.' });
    res.json({ success: true, worker });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── PUT /api/workers/:id ─────────────────────────────────────────
router.put('/:id', requirePermission('*'), async (req, res) => {
  try {
    const worker = await Worker.findOneAndUpdate(
      { _id: req.params.id, organization: req.user.organization, deletedAt: null },
      req.body,
      { new: true, runValidators: true }
    );
    if (!worker) return res.status(404).json({ success: false, message: 'Worker not found.' });

    await recordAudit(req, {
      action: 'worker.update',
      resource: 'Worker',
      resourceId: worker._id,
      metadata: { fields: Object.keys(req.body) },
    });

    res.json({ success: true, worker });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── DELETE /api/workers/:id ──────────────────────────────────────
// Soft delete: keeps history but excludes from active queries.
router.delete('/:id', requirePermission('*'), async (req, res) => {
  try {
    const worker = await Worker.findOne({
      _id: req.params.id,
      organization: req.user.organization,
      deletedAt: null,
    });
    if (!worker) return res.status(404).json({ success: false, message: 'Worker not found.' });
    worker.deletedAt = new Date();
    worker.status = 'inactive';
    await worker.save();

    await recordAudit(req, {
      action: 'worker.delete',
      resource: 'Worker',
      resourceId: worker._id,
      metadata: { name: worker.name },
    });

    res.json({ success: true, message: 'Worker archived.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── POST /api/workers/:id/pin ────────────────────────────────────
// Set or clear a worker's self-service PIN (4-6 digits).
router.post('/:id/pin', requirePermission('*'), async (req, res) => {
  try {
    const { pin } = req.body;
    const worker = await Worker.findOne({
      _id: req.params.id,
      organization: req.user.organization,
      deletedAt: null,
    });
    if (!worker) return res.status(404).json({ success: false, message: 'Worker not found.' });

    if (pin) {
      if (!/^\d{4,6}$/.test(String(pin))) {
        return res.status(400).json({ success: false, message: 'PIN must be 4–6 digits.' });
      }
      await worker.setPin(pin);
    } else {
      await worker.setPin(null);
    }
    await worker.save();

    await recordAudit(req, {
      action: pin ? 'worker.pin.set' : 'worker.pin.clear',
      resource: 'Worker',
      resourceId: worker._id,
    });

    res.json({ success: true, selfServiceEnabled: worker.selfServiceEnabled });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── POST /api/workers/:id/restore ────────────────────────────────
router.post('/:id/restore', requirePermission('*'), async (req, res) => {
  try {
    const worker = await Worker.findOne({
      _id: req.params.id,
      organization: req.user.organization,
    });
    if (!worker) return res.status(404).json({ success: false, message: 'Worker not found.' });
    if (!worker.deletedAt) {
      return res.status(400).json({ success: false, message: 'Worker is not archived.' });
    }
    worker.deletedAt = null;
    worker.status = 'active';
    await worker.save();

    await recordAudit(req, {
      action: 'worker.restore',
      resource: 'Worker',
      resourceId: worker._id,
    });

    res.json({ success: true, worker });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── GET /api/workers/:id/attendance-summary ──────────────────────
router.get('/:id/attendance-summary', requirePermission('worker.read'), async (req, res) => {
  try {
    const { month, year } = req.query;
    const m = parseInt(month) || new Date().getMonth() + 1;
    const y = parseInt(year) || new Date().getFullYear();

    const start = new Date(y, m - 1, 1);
    const end = new Date(y, m, 0, 23, 59, 59);

    const records = await Attendance.find({
      worker: req.params.id,
      organization: req.user.organization,
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
