const express = require('express');
const { body, validationResult } = require('express-validator');
const Organization = require('../models/Organization');
const AuditLog = require('../models/AuditLog');
const { protect, requirePermission } = require('../middleware/auth');
const { recordAudit } = require('../utils/audit');

const router = express.Router();
router.use(protect);

// ─── GET /api/organization ────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const org = await Organization.findById(req.user.organization);
    if (!org) return res.status(404).json({ success: false, message: 'Organization not found.' });
    res.json({ success: true, organization: org });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── PUT /api/organization ────────────────────────────────────────
router.put(
  '/',
  requirePermission('*'),
  [
    body('name').optional().trim().notEmpty(),
    body('industry').optional().trim(),
    body('phone').optional().trim(),
    body('address').optional().trim(),
    body('country').optional().trim(),
    body('currency').optional().trim(),
    body('timezone').optional().trim(),
    body('logoUrl').optional().trim(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    try {
      const updates = {};
      ['name', 'industry', 'phone', 'address', 'country', 'currency', 'timezone', 'logoUrl'].forEach(
        (k) => {
          if (req.body[k] !== undefined) updates[k] = req.body[k];
        }
      );

      const org = await Organization.findByIdAndUpdate(req.user.organization, updates, {
        new: true,
        runValidators: true,
      });

      await recordAudit(req, {
        action: 'org.update',
        resource: 'Organization',
        resourceId: org._id,
        metadata: updates,
      });

      res.json({ success: true, organization: org });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// ─── GET /api/organization/audit-logs ─────────────────────────────
router.get('/audit-logs', requirePermission('*'), async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 25);
    const skip = (page - 1) * limit;

    const filter = { organization: req.user.organization };
    if (req.query.resource) filter.resource = req.query.resource;
    if (req.query.action) filter.action = req.query.action;

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .populate('actor', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      AuditLog.countDocuments(filter),
    ]);

    res.json({ success: true, logs, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
