const express = require('express');
const { body, validationResult } = require('express-validator');
const Worker = require('../models/Worker');
const Attendance = require('../models/Attendance');
const Payment = require('../models/Payment');
const Leave = require('../models/Leave');
const Site = require('../models/Site');
const Shift = require('../models/Shift');
const Organization = require('../models/Organization');
const { protectWorker, signWorkerToken } = require('../middleware/workerAuth');
const { streamPayslip } = require('../utils/payslipPdf');
const { haversineMeters } = require('../utils/geo');

const router = express.Router();

function parseTimeOnDate(date, hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date(date);
  d.setHours(h, m, 0, 0);
  return d;
}

function daysBetween(start, end) {
  const a = new Date(start);
  const b = new Date(end);
  a.setHours(0, 0, 0, 0);
  b.setHours(0, 0, 0, 0);
  return Math.floor((b - a) / (24 * 60 * 60 * 1000)) + 1;
}

// ─── POST /api/worker-portal/login ────────────────────────────────
// Worker authenticates with phone + PIN, scoped to an organization slug.
router.post(
  '/login',
  [
    body('orgSlug').trim().notEmpty(),
    body('phone').trim().notEmpty(),
    body('pin').matches(/^\d{4,6}$/),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
    try {
      const { orgSlug, phone, pin } = req.body;
      const organization = await Organization.findOne({ slug: orgSlug });
      if (!organization) {
        return res.status(401).json({ success: false, message: 'Invalid credentials.' });
      }
      const worker = await Worker.findOne({
        organization: organization._id,
        phone,
        deletedAt: null,
        status: 'active',
        selfServiceEnabled: true,
      }).select('+pinHash');
      if (!worker) {
        return res.status(401).json({ success: false, message: 'Invalid credentials.' });
      }
      const ok = await worker.comparePin(pin);
      if (!ok) {
        return res.status(401).json({ success: false, message: 'Invalid credentials.' });
      }

      const token = signWorkerToken(worker);
      res.json({
        success: true,
        token,
        worker: {
          _id: worker._id,
          name: worker.name,
          role: worker.role,
          phone: worker.phone,
          photoUrl: worker.photoUrl,
          organization: {
            _id: organization._id,
            name: organization.name,
            slug: organization.slug,
            currency: organization.currency,
          },
        },
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// All routes below require worker auth
router.use(protectWorker);

// ─── GET /api/worker-portal/me ────────────────────────────────────
router.get('/me', async (req, res) => {
  const w = await Worker.findById(req.worker._id)
    .populate('site', 'name address lat lng radiusMeters geofenceEnabled')
    .populate('shift', 'name startTime endTime lateAfterMinutes weeklyOffs');
  const organization = await Organization.findById(req.worker.organization);
  res.json({
    success: true,
    worker: {
      _id: w._id,
      name: w.name,
      role: w.role,
      phone: w.phone,
      photoUrl: w.photoUrl,
      site: w.site,
      shift: w.shift,
      leaveBalance: w.leaveBalance,
      organization: {
        _id: organization._id,
        name: organization.name,
        slug: organization.slug,
        currency: organization.currency,
      },
    },
  });
});

// ─── GET /api/worker-portal/my-attendance?month=&year= ────────────
router.get('/my-attendance', async (req, res) => {
  try {
    const m = parseInt(req.query.month) || new Date().getMonth() + 1;
    const y = parseInt(req.query.year) || new Date().getFullYear();
    const start = new Date(y, m - 1, 1);
    const end = new Date(y, m, 0, 23, 59, 59);
    const records = await Attendance.find({
      worker: req.worker._id,
      date: { $gte: start, $lte: end },
    }).sort({ date: 1 });
    res.json({ success: true, records });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── GET /api/worker-portal/my-payments ───────────────────────────
router.get('/my-payments', async (req, res) => {
  try {
    const payments = await Payment.find({
      worker: req.worker._id,
      deletedAt: null,
    }).sort({ paymentDate: -1 });
    res.json({ success: true, payments });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── GET /api/worker-portal/payslip/:id ───────────────────────────
router.get('/payslip/:id', async (req, res) => {
  try {
    const payment = await Payment.findOne({
      _id: req.params.id,
      worker: req.worker._id,
      deletedAt: null,
    });
    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found.' });
    const organization = await Organization.findById(req.worker.organization);
    streamPayslip(res, { payment, worker: req.worker, organization });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── GET /api/worker-portal/my-leaves ─────────────────────────────
router.get('/my-leaves', async (req, res) => {
  try {
    const leaves = await Leave.find({
      worker: req.worker._id,
    }).sort({ createdAt: -1 });
    res.json({ success: true, leaves });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── POST /api/worker-portal/my-leaves ────────────────────────────
router.post(
  '/my-leaves',
  [
    body('startDate').isISO8601(),
    body('endDate').isISO8601(),
    body('type').isIn(['casual', 'sick', 'paid', 'unpaid']),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
    try {
      const { startDate, endDate, type, reason = '' } = req.body;
      const totalDays = daysBetween(startDate, endDate);
      if (totalDays < 1) {
        return res.status(400).json({ success: false, message: 'Invalid date range.' });
      }
      const leave = await Leave.create({
        organization: req.worker.organization,
        worker: req.worker._id,
        type,
        startDate,
        endDate,
        totalDays,
        reason,
        status: 'pending',
      });
      res.status(201).json({ success: true, leave });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// ─── POST /api/worker-portal/check-in ─────────────────────────────
// GPS geofencing if the worker has a site with geofenceEnabled.
router.post(
  '/check-in',
  [body('lat').optional().isFloat(), body('lng').optional().isFloat()],
  async (req, res) => {
    try {
      const { lat, lng, accuracy, photoUrl, kioskToken } = req.body;

      // If kiosk token supplied, resolve site from token (org check)
      let siteForCheckin = null;
      if (kioskToken) {
        siteForCheckin = await Site.findOne({
          organization: req.worker.organization,
          kioskToken,
          deletedAt: null,
        });
        if (!siteForCheckin) {
          return res.status(403).json({ success: false, message: 'Invalid kiosk.' });
        }
      } else if (req.worker.site) {
        siteForCheckin = await Site.findById(req.worker.site);
      }

      // Geofence check
      if (
        siteForCheckin &&
        siteForCheckin.geofenceEnabled &&
        siteForCheckin.lat != null &&
        siteForCheckin.lng != null
      ) {
        if (typeof lat !== 'number' || typeof lng !== 'number') {
          return res.status(400).json({
            success: false,
            message: 'Location is required for this site.',
            code: 'LOCATION_REQUIRED',
          });
        }
        const distance = haversineMeters(lat, lng, siteForCheckin.lat, siteForCheckin.lng);
        if (distance > (siteForCheckin.radiusMeters || 100)) {
          return res.status(403).json({
            success: false,
            message: `You are ${Math.round(distance)}m from ${siteForCheckin.name}. Move closer to check in.`,
            code: 'OUT_OF_RANGE',
            distance: Math.round(distance),
          });
        }
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Determine lateness if a shift is assigned
      let isLate = false;
      let lateByMinutes = 0;
      if (req.worker.shift) {
        const shift = await Shift.findById(req.worker.shift);
        if (shift && shift.startTime) {
          const shiftStart = parseTimeOnDate(today, shift.startTime);
          const diffMin = Math.floor((Date.now() - shiftStart.getTime()) / 60000);
          if (diffMin > (shift.lateAfterMinutes || 15)) {
            isLate = true;
            lateByMinutes = diffMin;
          }
        }
      }

      const record = await Attendance.findOneAndUpdate(
        { worker: req.worker._id, date: today },
        {
          $set: {
            worker: req.worker._id,
            owner: req.worker.owner,
            organization: req.worker.organization,
            date: today,
            status: 'present',
            source: kioskToken ? 'kiosk' : 'self',
            checkInAt: new Date(),
            checkInLocation: {
              lat: lat ?? null,
              lng: lng ?? null,
              accuracy: accuracy ?? null,
            },
            checkInPhotoUrl: photoUrl || '',
            site: siteForCheckin?._id || null,
            isLate,
            lateByMinutes,
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      res.json({ success: true, record, isLate, lateByMinutes });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// ─── POST /api/worker-portal/check-out ────────────────────────────
router.post('/check-out', async (req, res) => {
  try {
    const { lat, lng, accuracy } = req.body;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const record = await Attendance.findOne({
      worker: req.worker._id,
      date: today,
    });
    if (!record) {
      return res.status(404).json({ success: false, message: 'You have not checked in today.' });
    }
    record.checkOutAt = new Date();
    record.checkOutLocation = {
      lat: lat ?? null,
      lng: lng ?? null,
      accuracy: accuracy ?? null,
    };
    await record.save();
    res.json({ success: true, record });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
