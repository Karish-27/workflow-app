const express = require('express');
const Worker = require('../models/Worker');
const Attendance = require('../models/Attendance');
const Payment = require('../models/Payment');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

// ─── GET /api/dashboard ───────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const ownerId = req.user._id;

    // Today range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // This month range
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);

    const [
      totalWorkers,
      activeWorkers,
      todayAttendance,
      monthlyPayments,
      recentPayments,
      weekAttendance,
    ] = await Promise.all([
      Worker.countDocuments({ owner: ownerId }),
      Worker.countDocuments({ owner: ownerId, status: 'active' }),
      Attendance.find({ owner: ownerId, date: { $gte: today, $lt: tomorrow } }).populate(
        'worker',
        'name role'
      ),
      Payment.find({ owner: ownerId, paymentDate: { $gte: monthStart, $lte: monthEnd } }),
      Payment.find({ owner: ownerId })
        .populate('worker', 'name role')
        .sort({ paymentDate: -1 })
        .limit(5),
      // Last 7 days attendance counts
      Attendance.aggregate([
        {
          $match: {
            owner: ownerId,
            date: {
              $gte: new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000),
              $lte: tomorrow,
            },
          },
        },
        {
          $group: {
            _id: {
              date: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
              status: '$status',
            },
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const presentToday = todayAttendance.filter((a) => a.status === 'present').length;
    const absentToday = todayAttendance.filter((a) => a.status === 'absent').length;
    const halfToday = todayAttendance.filter((a) => a.status === 'halfday').length;
    const leaveToday = todayAttendance.filter((a) => a.status === 'leave').length;
    const notMarked = activeWorkers - todayAttendance.length;

    const totalPaidThisMonth = monthlyPayments.reduce((acc, p) => acc + p.netAmount, 0);

    // Format week chart data
    const weekMap = {};
    weekAttendance.forEach((item) => {
      const d = item._id.date;
      if (!weekMap[d]) weekMap[d] = { present: 0, absent: 0, halfday: 0, leave: 0 };
      weekMap[d][item._id.status] = item.count;
    });

    res.json({
      success: true,
      stats: {
        totalWorkers,
        activeWorkers,
        presentToday,
        absentToday,
        halfToday,
        leaveToday,
        notMarked,
        totalPaidThisMonth: Math.round(totalPaidThisMonth),
      },
      todayAttendance,
      recentPayments,
      weekChart: weekMap,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
