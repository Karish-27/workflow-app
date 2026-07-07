const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Organization = require('../models/Organization');
const Invite = require('../models/Invite');
const { protect } = require('../middleware/auth');
const { generateToken, hashToken } = require('../utils/tokens');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../utils/email');
const { recordAudit } = require('../utils/audit');
const { permissionsForRole } = require('../utils/permissions');

const router = express.Router();

const signJwt = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

function slugify(input) {
  return String(input || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

async function uniqueSlug(base) {
  const seed = slugify(base) || 'org';
  let candidate = seed;
  let n = 1;
  // eslint-disable-next-line no-await-in-loop
  while (await Organization.exists({ slug: candidate })) {
    candidate = `${seed}-${n++}`;
    if (n > 999) {
      candidate = `${seed}-${Date.now().toString(36)}`;
      break;
    }
  }
  return candidate;
}

function publicUser(user, org) {
  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    isOwner: user.isOwner,
    emailVerified: user.emailVerified,
    businessName: user.businessName,
    phone: user.phone,
    organization: org
      ? {
          _id: org._id,
          name: org.name,
          slug: org.slug,
          plan: org.plan,
          currency: org.currency,
          timezone: org.timezone,
          country: org.country,
          logoUrl: org.logoUrl,
        }
      : null,
    permissions: permissionsForRole(user.role),
  };
}

// ─── POST /api/auth/register ──────────────────────────────────────
router.post(
  '/register',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be 6+ characters'),
    body('businessName').optional().trim(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
      const { name, email, password, businessName, phone } = req.body;

      const existing = await User.findOne({ email });
      if (existing) {
        return res.status(409).json({ success: false, message: 'Email already registered.' });
      }

      const orgName = (businessName || `${name}'s Workspace`).trim();
      const slug = await uniqueSlug(orgName);

      const user = await User.create({
        name,
        email,
        password,
        businessName,
        phone,
        role: 'admin',
        isOwner: true,
      });

      const org = await Organization.create({
        name: orgName,
        slug,
        owner: user._id,
        phone: phone || '',
        trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      });

      user.organization = org._id;

      const rawToken = generateToken(32);
      user.emailVerificationTokenHash = hashToken(rawToken);
      user.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await user.save();

      try {
        await sendVerificationEmail(user, rawToken);
      } catch (mailErr) {
        console.error('[register] failed to send verification email:', mailErr.message);
      }

      const token = signJwt(user._id);

      await recordAudit({ user, headers: req.headers, ip: req.ip }, {
        action: 'org.create',
        resource: 'Organization',
        resourceId: org._id,
        metadata: { name: org.name, slug: org.slug },
      });

      res.status(201).json({
        success: true,
        token,
        user: publicUser(user, org),
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// ─── POST /api/auth/login ─────────────────────────────────────────
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
      const { email, password } = req.body;

      const user = await User.findOne({ email }).select('+password');
      if (!user || user.deletedAt) {
        return res.status(401).json({ success: false, message: 'Invalid credentials.' });
      }

      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({ success: false, message: 'Invalid credentials.' });
      }

      user.lastLoginAt = new Date();
      await user.save();

      const org = user.organization ? await Organization.findById(user.organization) : null;
      const token = signJwt(user._id);

      res.json({
        success: true,
        token,
        user: publicUser(user, org),
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// ─── GET /api/auth/me ─────────────────────────────────────────────
router.get('/me', protect, async (req, res) => {
  const org = req.user.organization ? await Organization.findById(req.user.organization) : null;
  res.json({ success: true, user: publicUser(req.user, org) });
});

// ─── PUT /api/auth/profile ────────────────────────────────────────
router.put('/profile', protect, async (req, res) => {
  try {
    const { name, businessName, phone } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { name, businessName, phone },
      { new: true, runValidators: true }
    );
    const org = user.organization ? await Organization.findById(user.organization) : null;
    res.json({ success: true, user: publicUser(user, org) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── POST /api/auth/verify-email ──────────────────────────────────
router.post('/verify-email', async (req, res) => {
  try {
    const { email, token } = req.body;
    if (!email || !token) {
      return res.status(400).json({ success: false, message: 'Email and token are required.' });
    }

    const user = await User.findOne({ email: String(email).toLowerCase() }).select(
      '+emailVerificationTokenHash +emailVerificationExpires'
    );
    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid verification link.' });
    }

    if (user.emailVerified) {
      return res.json({ success: true, message: 'Email already verified.' });
    }

    if (
      !user.emailVerificationTokenHash ||
      user.emailVerificationTokenHash !== hashToken(token) ||
      !user.emailVerificationExpires ||
      user.emailVerificationExpires < new Date()
    ) {
      return res.status(400).json({ success: false, message: 'Invalid or expired token.' });
    }

    user.emailVerified = true;
    user.emailVerificationTokenHash = null;
    user.emailVerificationExpires = null;
    await user.save();

    res.json({ success: true, message: 'Email verified.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── POST /api/auth/resend-verification ───────────────────────────
router.post('/resend-verification', protect, async (req, res) => {
  try {
    if (req.user.emailVerified) {
      return res.json({ success: true, message: 'Already verified.' });
    }
    const rawToken = generateToken(32);
    req.user.emailVerificationTokenHash = hashToken(rawToken);
    req.user.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await req.user.save();
    await sendVerificationEmail(req.user, rawToken);
    res.json({ success: true, message: 'Verification email sent.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── POST /api/auth/forgot-password ───────────────────────────────
router.post(
  '/forgot-password',
  [body('email').isEmail().withMessage('Valid email is required')],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
      const { email } = req.body;
      const user = await User.findOne({ email: String(email).toLowerCase() });

      // Always return success to avoid email enumeration
      if (user && !user.deletedAt) {
        const rawToken = generateToken(32);
        user.passwordResetTokenHash = hashToken(rawToken);
        user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000);
        await user.save();
        try {
          await sendPasswordResetEmail(user, rawToken);
        } catch (mailErr) {
          console.error('[forgot-password] mail failed:', mailErr.message);
        }
      }

      res.json({
        success: true,
        message: 'If that email exists, a password reset link has been sent.',
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// ─── POST /api/auth/reset-password ────────────────────────────────
router.post(
  '/reset-password',
  [
    body('email').isEmail(),
    body('token').notEmpty(),
    body('password').isLength({ min: 6 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    try {
      const { email, token, password } = req.body;
      const user = await User.findOne({ email: String(email).toLowerCase() }).select(
        '+passwordResetTokenHash +passwordResetExpires +password'
      );

      if (
        !user ||
        !user.passwordResetTokenHash ||
        user.passwordResetTokenHash !== hashToken(token) ||
        !user.passwordResetExpires ||
        user.passwordResetExpires < new Date()
      ) {
        return res.status(400).json({ success: false, message: 'Invalid or expired token.' });
      }

      user.password = password;
      user.passwordResetTokenHash = null;
      user.passwordResetExpires = null;
      await user.save();

      res.json({ success: true, message: 'Password reset successful.' });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// ─── POST /api/auth/accept-invite ─────────────────────────────────
router.post(
  '/accept-invite',
  [
    body('email').isEmail(),
    body('token').notEmpty(),
    body('name').trim().notEmpty(),
    body('password').isLength({ min: 6 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
      const { email, token, name, password } = req.body;
      const tokenHash = hashToken(token);

      const invite = await Invite.findOne({
        email: String(email).toLowerCase(),
        tokenHash,
        status: 'pending',
      });

      if (!invite || invite.expiresAt < new Date()) {
        if (invite && invite.status === 'pending') {
          invite.status = 'expired';
          await invite.save();
        }
        return res.status(400).json({ success: false, message: 'Invalid or expired invite.' });
      }

      let user = await User.findOne({ email: String(email).toLowerCase() });
      if (user) {
        user.organization = invite.organization;
        user.role = invite.role;
        user.emailVerified = true;
        user.name = user.name || name;
        await user.save();
      } else {
        user = await User.create({
          name,
          email: String(email).toLowerCase(),
          password,
          role: invite.role,
          organization: invite.organization,
          emailVerified: true,
          isOwner: false,
        });
      }

      invite.status = 'accepted';
      invite.acceptedAt = new Date();
      await invite.save();

      const org = await Organization.findById(invite.organization);
      const jwtToken = signJwt(user._id);

      res.json({
        success: true,
        token: jwtToken,
        user: publicUser(user, org),
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// ─── POST /api/auth/change-password ───────────────────────────────
router.post(
  '/change-password',
  protect,
  [body('currentPassword').notEmpty(), body('newPassword').isLength({ min: 6 })],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    try {
      const user = await User.findById(req.user._id).select('+password');
      const isMatch = await user.comparePassword(req.body.currentPassword);
      if (!isMatch) {
        return res.status(401).json({ success: false, message: 'Current password is incorrect.' });
      }
      user.password = req.body.newPassword;
      await user.save();
      res.json({ success: true, message: 'Password updated.' });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

module.exports = router;
