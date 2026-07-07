const express = require('express');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const Site = require('../models/Site');
const Worker = require('../models/Worker');
const { protect, requirePermission } = require('../middleware/auth');
const { recordAudit } = require('../utils/audit');

const router = express.Router();
router.use(protect);

// ─── GET /api/sites ───────────────────────────────────────────────
router.get('/', requirePermission('site.read'), async (req, res) => {
  try {
    const sites = await Site.find({
      organization: req.user.organization,
      deletedAt: null,
    }).sort({ name: 1 });
    res.json({ success: true, sites });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── POST /api/sites ──────────────────────────────────────────────
router.post(
  '/',
  requirePermission('*'),
  [body('name').trim().notEmpty()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
    try {
      const site = await Site.create({
        ...req.body,
        organization: req.user.organization,
      });
      await recordAudit(req, {
        action: 'site.create',
        resource: 'Site',
        resourceId: site._id,
        metadata: { name: site.name },
      });
      res.status(201).json({ success: true, site });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// ─── PUT /api/sites/:id ───────────────────────────────────────────
router.put('/:id', requirePermission('*'), async (req, res) => {
  try {
    const site = await Site.findOneAndUpdate(
      { _id: req.params.id, organization: req.user.organization, deletedAt: null },
      req.body,
      { new: true, runValidators: true }
    );
    if (!site) return res.status(404).json({ success: false, message: 'Site not found.' });
    await recordAudit(req, {
      action: 'site.update',
      resource: 'Site',
      resourceId: site._id,
    });
    res.json({ success: true, site });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── POST /api/sites/:id/rotate-token ─────────────────────────────
router.post('/:id/rotate-token', requirePermission('*'), async (req, res) => {
  try {
    const site = await Site.findOne({
      _id: req.params.id,
      organization: req.user.organization,
      deletedAt: null,
    });
    if (!site) return res.status(404).json({ success: false, message: 'Site not found.' });
    site.kioskToken = crypto.randomBytes(16).toString('hex');
    await site.save();
    await recordAudit(req, {
      action: 'site.rotate_token',
      resource: 'Site',
      resourceId: site._id,
    });
    res.json({ success: true, site });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── DELETE /api/sites/:id ────────────────────────────────────────
router.delete('/:id', requirePermission('*'), async (req, res) => {
  try {
    const site = await Site.findOne({
      _id: req.params.id,
      organization: req.user.organization,
      deletedAt: null,
    });
    if (!site) return res.status(404).json({ success: false, message: 'Site not found.' });
    site.deletedAt = new Date();
    await site.save();
    await Worker.updateMany(
      { organization: req.user.organization, site: site._id },
      { $set: { site: null } }
    );
    await recordAudit(req, {
      action: 'site.delete',
      resource: 'Site',
      resourceId: site._id,
    });
    res.json({ success: true, message: 'Site archived.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
