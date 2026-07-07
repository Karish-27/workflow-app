const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Organization = require('../models/Organization');
const Invite = require('../models/Invite');
const { protect, requirePermission } = require('../middleware/auth');
const { generateToken, hashToken } = require('../utils/tokens');
const { sendInviteEmail } = require('../utils/email');
const { recordAudit } = require('../utils/audit');

const router = express.Router();
router.use(protect);

const ROLE_VALUES = ['admin', 'supervisor', 'accountant', 'viewer'];

// ─── GET /api/team/members ────────────────────────────────────────
router.get('/members', async (req, res) => {
  try {
    const members = await User.find({
      organization: req.user.organization,
      deletedAt: null,
    }).select('name email role isOwner emailVerified lastLoginAt createdAt');
    res.json({ success: true, members });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── PUT /api/team/members/:id/role ───────────────────────────────
router.put(
  '/members/:id/role',
  requirePermission('*'),
  [body('role').isIn(ROLE_VALUES)],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    try {
      const member = await User.findOne({
        _id: req.params.id,
        organization: req.user.organization,
        deletedAt: null,
      });
      if (!member) return res.status(404).json({ success: false, message: 'Member not found.' });
      if (member.isOwner) {
        return res.status(400).json({ success: false, message: 'Cannot change role of the organization owner.' });
      }
      const prevRole = member.role;
      member.role = req.body.role;
      await member.save();

      await recordAudit(req, {
        action: 'member.role.update',
        resource: 'User',
        resourceId: member._id,
        metadata: { from: prevRole, to: member.role },
      });

      res.json({ success: true, member });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// ─── DELETE /api/team/members/:id ─────────────────────────────────
router.delete('/members/:id', requirePermission('*'), async (req, res) => {
  try {
    const member = await User.findOne({
      _id: req.params.id,
      organization: req.user.organization,
      deletedAt: null,
    });
    if (!member) return res.status(404).json({ success: false, message: 'Member not found.' });
    if (member.isOwner) {
      return res.status(400).json({ success: false, message: 'Cannot remove the organization owner.' });
    }
    if (String(member._id) === String(req.user._id)) {
      return res.status(400).json({ success: false, message: 'You cannot remove yourself.' });
    }
    member.deletedAt = new Date();
    member.organization = null;
    await member.save();

    await recordAudit(req, {
      action: 'member.remove',
      resource: 'User',
      resourceId: member._id,
      metadata: { email: member.email },
    });

    res.json({ success: true, message: 'Member removed.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── GET /api/team/invites ────────────────────────────────────────
router.get('/invites', requirePermission('*'), async (req, res) => {
  try {
    const invites = await Invite.find({
      organization: req.user.organization,
    })
      .populate('invitedBy', 'name email')
      .sort({ createdAt: -1 });
    res.json({ success: true, invites });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── POST /api/team/invites ───────────────────────────────────────
router.post(
  '/invites',
  requirePermission('*'),
  [body('email').isEmail(), body('role').isIn(ROLE_VALUES)],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    try {
      const email = String(req.body.email).toLowerCase().trim();
      const role = req.body.role;

      const org = await Organization.findById(req.user.organization);
      if (!org) return res.status(404).json({ success: false, message: 'Organization not found.' });

      // Enforce seat limit (members + pending invites)
      const memberCount = await User.countDocuments({
        organization: org._id,
        deletedAt: null,
      });
      const pendingCount = await Invite.countDocuments({
        organization: org._id,
        status: 'pending',
      });
      if (memberCount + pendingCount >= org.seatLimit) {
        return res.status(402).json({
          success: false,
          message: `Seat limit reached for plan ${org.plan}. Upgrade to invite more teammates.`,
        });
      }

      // Already a member?
      const existingMember = await User.findOne({
        email,
        organization: org._id,
        deletedAt: null,
      });
      if (existingMember) {
        return res.status(409).json({ success: false, message: 'That email is already a member.' });
      }

      // Replace existing pending invite for the same email
      await Invite.updateMany(
        { organization: org._id, email, status: 'pending' },
        { $set: { status: 'revoked' } }
      );

      const rawToken = generateToken(32);
      const invite = await Invite.create({
        organization: org._id,
        email,
        role,
        invitedBy: req.user._id,
        tokenHash: hashToken(rawToken),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      try {
        await sendInviteEmail({
          email,
          inviter: req.user,
          organization: org,
          rawToken,
          role,
        });
      } catch (mailErr) {
        console.error('[invite] mail failed:', mailErr.message);
      }

      await recordAudit(req, {
        action: 'invite.create',
        resource: 'Invite',
        resourceId: invite._id,
        metadata: { email, role },
      });

      res.status(201).json({ success: true, invite });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// ─── DELETE /api/team/invites/:id ─────────────────────────────────
router.delete('/invites/:id', requirePermission('*'), async (req, res) => {
  try {
    const invite = await Invite.findOne({
      _id: req.params.id,
      organization: req.user.organization,
    });
    if (!invite) return res.status(404).json({ success: false, message: 'Invite not found.' });
    if (invite.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Only pending invites can be revoked.' });
    }
    invite.status = 'revoked';
    await invite.save();

    await recordAudit(req, {
      action: 'invite.revoke',
      resource: 'Invite',
      resourceId: invite._id,
      metadata: { email: invite.email },
    });

    res.json({ success: true, message: 'Invite revoked.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
