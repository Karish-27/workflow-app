const express = require('express');
const { body, validationResult } = require('express-validator');
const Shift = require('../models/Shift');
const Worker = require('../models/Worker');
const { protect, requirePermission } = require('../middleware/auth');
const { recordAudit } = require('../utils/audit');

const router = express.Router();
router.use(protect);

// ─── GET /api/shifts ──────────────────────────────────────────────
router.get('/', requirePermission('shift.read'), async (req, res) => {
  try {
    const shifts = await Shift.find({
      organization: req.user.organization,
      deletedAt: null,
    }).sort({ startTime: 1 });
    res.json({ success: true, shifts });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── POST /api/shifts ─────────────────────────────────────────────
router.post(
  '/',
  requirePermission('*'),
  [
    body('name').trim().notEmpty(),
    body('startTime').matches(/^\d{2}:\d{2}$/),
    body('endTime').matches(/^\d{2}:\d{2}$/),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
    try {
      if (req.body.isDefault) {
        await Shift.updateMany(
          { organization: req.user.organization, isDefault: true },
          { $set: { isDefault: false } }
        );
      }
      const shift = await Shift.create({
        ...req.body,
        organization: req.user.organization,
      });
      await recordAudit(req, {
        action: 'shift.create',
        resource: 'Shift',
        resourceId: shift._id,
        metadata: { name: shift.name },
      });
      res.status(201).json({ success: true, shift });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// ─── PUT /api/shifts/:id ──────────────────────────────────────────
router.put('/:id', requirePermission('*'), async (req, res) => {
  try {
    if (req.body.isDefault) {
      await Shift.updateMany(
        { organization: req.user.organization, _id: { $ne: req.params.id }, isDefault: true },
        { $set: { isDefault: false } }
      );
    }
    const shift = await Shift.findOneAndUpdate(
      { _id: req.params.id, organization: req.user.organization, deletedAt: null },
      req.body,
      { new: true, runValidators: true }
    );
    if (!shift) return res.status(404).json({ success: false, message: 'Shift not found.' });
    await recordAudit(req, {
      action: 'shift.update',
      resource: 'Shift',
      resourceId: shift._id,
    });
    res.json({ success: true, shift });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── DELETE /api/shifts/:id ───────────────────────────────────────
router.delete('/:id', requirePermission('*'), async (req, res) => {
  try {
    const shift = await Shift.findOne({
      _id: req.params.id,
      organization: req.user.organization,
      deletedAt: null,
    });
    if (!shift) return res.status(404).json({ success: false, message: 'Shift not found.' });
    shift.deletedAt = new Date();
    await shift.save();

    // Unassign from workers
    await Worker.updateMany(
      { organization: req.user.organization, shift: shift._id },
      { $set: { shift: null } }
    );

    await recordAudit(req, {
      action: 'shift.delete',
      resource: 'Shift',
      resourceId: shift._id,
    });
    res.json({ success: true, message: 'Shift archived.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
