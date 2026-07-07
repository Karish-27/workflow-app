const express = require('express');
const { body, validationResult } = require('express-validator');
const Holiday = require('../models/Holiday');
const { protect, requirePermission } = require('../middleware/auth');
const { recordAudit } = require('../utils/audit');

const router = express.Router();
router.use(protect);

// ─── GET /api/holidays ────────────────────────────────────────────
router.get('/', requirePermission('holiday.read'), async (req, res) => {
  try {
    const { year } = req.query;
    const filter = { organization: req.user.organization };
    if (year) {
      const y = parseInt(year);
      filter.date = { $gte: new Date(y, 0, 1), $lte: new Date(y, 11, 31, 23, 59, 59) };
    }
    const holidays = await Holiday.find(filter).sort({ date: 1 });
    res.json({ success: true, holidays });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── POST /api/holidays ───────────────────────────────────────────
router.post(
  '/',
  requirePermission('*'),
  [
    body('name').trim().notEmpty(),
    body('date').isISO8601(),
    body('paid').optional().isBoolean(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
    try {
      const { name, date, paid = true, region = '', notes = '' } = req.body;
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);

      const holiday = await Holiday.findOneAndUpdate(
        { organization: req.user.organization, date: d },
        {
          organization: req.user.organization,
          name,
          date: d,
          paid,
          region,
          notes,
          createdBy: req.user._id,
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      await recordAudit(req, {
        action: 'holiday.upsert',
        resource: 'Holiday',
        resourceId: holiday._id,
        metadata: { name, date: d },
      });

      res.status(201).json({ success: true, holiday });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// ─── DELETE /api/holidays/:id ─────────────────────────────────────
router.delete('/:id', requirePermission('*'), async (req, res) => {
  try {
    const deleted = await Holiday.findOneAndDelete({
      _id: req.params.id,
      organization: req.user.organization,
    });
    if (!deleted) return res.status(404).json({ success: false, message: 'Holiday not found.' });
    await recordAudit(req, {
      action: 'holiday.delete',
      resource: 'Holiday',
      resourceId: req.params.id,
    });
    res.json({ success: true, message: 'Holiday removed.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
