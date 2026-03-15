require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Worker = require('./models/Worker');
const Attendance = require('./models/Attendance');
const Payment = require('./models/Payment');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/workflow_db';

// ─── Static worker definitions ────────────────────────────────────────────────
// Each worker has a role, wage type (daily/monthly), and base wage in INR.
const workerData = [
  { name: 'Arjun Sharma',   role: 'Mason',        wageType: 'daily',   wage: 800,   phone: '9876543210', notes: 'Experienced in brick masonry and plastering.' },
  { name: 'Meena Patel',    role: 'Carpenter',    wageType: 'daily',   wage: 750,   phone: '9876543211', notes: 'Specialises in door/window frames.' },
  { name: 'Ramesh Yadav',   role: 'Electrician',  wageType: 'daily',   wage: 950,   phone: '9876543212', notes: 'Licensed for LT panel work.' },
  { name: 'Sunita Devi',    role: 'Helper',       wageType: 'daily',   wage: 500,   phone: '9876543213', notes: 'General site helper.' },
  { name: 'Vikas Kumar',    role: 'Plumber',      wageType: 'daily',   wage: 850,   phone: '9876543214', notes: 'Expert in CPVC and GI pipes.' },
  { name: 'Deepak Tiwari',  role: 'Mason',        wageType: 'daily',   wage: 800,   phone: '9876543216', notes: 'Works with Arjun on flooring tasks.' },
  { name: 'Anjali Rao',     role: 'Supervisor',   wageType: 'monthly', wage: 18000, phone: '9876543217', notes: 'Manages daily site operations.' },
  { name: 'Suresh Nair',    role: 'Painter',      wageType: 'daily',   wage: 700,   phone: '9876543218', notes: 'Interior and exterior painting.' },
  { name: 'Priya Mishra',   role: 'Helper',       wageType: 'daily',   wage: 500,   phone: '9876543219', notes: 'Assists painters and masons.' },
  { name: 'Mahesh Gupta',   role: 'Welder',       wageType: 'daily',   wage: 900,   phone: '9876543220', notes: 'MIG/TIG welding for structural work.' },
  { name: 'Ritu Joshi',     role: 'Accountant',   wageType: 'monthly', wage: 15000, phone: '9876543221', notes: 'Maintains petty cash and invoices.' },
  { name: 'Kavita Singh',   role: 'Helper',       wageType: 'daily',   wage: 500,   phone: '9876543215', status: 'inactive', notes: 'On extended leave.' },
];

// ─── Helper: pick a random element from an array ──────────────────────────────
function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ─── Helper: return a weighted random attendance status ───────────────────────
// Workers are mostly present; absent/halfday/leave are less frequent.
function randomStatus() {
  const pool = ['present', 'present', 'present', 'present', 'present', 'absent', 'halfday', 'leave'];
  return pick(pool);
}

// ─── Helper: build attendance records for a given month ───────────────────────
// Skips inactive workers. Generates one record per day per active worker.
function buildAttendanceForMonth(workers, ownerId, year, month, totalDays) {
  const records = [];
  for (const worker of workers) {
    if (worker.status === 'inactive') continue;
    for (let day = 1; day <= totalDays; day++) {
      const status = randomStatus();
      records.push({
        worker:        worker._id,
        owner:         ownerId,
        date:          new Date(year, month, day),
        status,
        // ~20% chance of 2 overtime hours on present days
        overtimeHours: status === 'present' && Math.random() > 0.8 ? 2 : 0,
        markedBy:      ownerId,
      });
    }
  }
  return records;
}

// ─── Helper: calculate gross pay for a worker based on present days ───────────
// Monthly-wage workers get a prorated amount; daily-wage workers get wage × presentDays.
function calcGross(worker, presentDays, totalWorkingDays) {
  if (worker.wageType === 'monthly') {
    // Prorate: (monthlySalary / totalWorkingDays) * presentDays
    return Math.round((worker.wage / totalWorkingDays) * presentDays);
  }
  return worker.wage * presentDays;
}

// ─── Helper: build a single payment record for one worker for one period ──────
function buildPayment(worker, ownerId, periodStart, periodEnd, presentDays, absentDays, halfDays, leaveDays, totalWorkingDays, method, paidDate, txnRef, notes) {
  const gross      = calcGross(worker, presentDays, totalWorkingDays);
  // Deduction: 1 absent day worth of wage (daily) or prorated (monthly)
  const deduction  = absentDays * (worker.wageType === 'daily' ? worker.wage : Math.round(worker.wage / totalWorkingDays));
  const advance    = 0; // no advance deductions in seed data
  const net        = gross - deduction - advance;

  return {
    worker:           worker._id,
    owner:            ownerId,
    periodStart,
    periodEnd,
    totalWorkingDays,
    presentDays,
    absentDays,
    halfDays,
    leaveDays,
    overtimeHours:    0,
    grossAmount:      gross,
    deductions:       deduction,
    advance,
    netAmount:        net < 0 ? 0 : net,
    paymentMethod:    method,
    paymentDate:      paidDate,
    status:           'paid',
    remainingBalance: 0,
    transactionRef:   txnRef,
    notes,
  };
}

// ─── Main seed function ────────────────────────────────────────────────────────
async function seed() {
  // 1. Connect to MongoDB
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  // 2. Wipe all existing data so seed is idempotent
  await Promise.all([
    User.deleteMany({}),
    Worker.deleteMany({}),
    Attendance.deleteMany({}),
    Payment.deleteMany({}),
  ]);
  console.log('Cleared existing collections');

  // 3. Create the demo admin user
  const user = await User.create({
    name:         'Karishma Kumavat',
    email:        'demo@workflow.com',
    password:     'demo1234',
    businessName: 'Kumar Construction',
    phone:        '9988776655',
    role:         'admin',
  });
  console.log('Created demo user:', user.email);

  // 4. Insert all workers linked to the demo user
  const workers = await Worker.insertMany(
    workerData.map((w) => ({
      ...w,
      owner:       user._id,
      joiningDate: new Date('2024-01-15'),
      status:      w.status || 'active',
      overtimeRate: w.wageType === 'daily' ? Math.round(w.wage / 8) : 0, // hourly OT rate
    }))
  );
  console.log(`Created ${workers.length} workers`);

  // 5. Generate attendance for January, February, and March 2026
  //    January: 26 working days, February: 24, March days 1-15 (15 days so far)
  const attJan = buildAttendanceForMonth(workers, user._id, 2026, 0, 26); // Jan
  const attFeb = buildAttendanceForMonth(workers, user._id, 2026, 1, 24); // Feb
  const attMar = buildAttendanceForMonth(workers, user._id, 2026, 2, 15); // Mar (partial)

  await Attendance.insertMany([...attJan, ...attFeb, ...attMar]);
  console.log(`Created ${attJan.length + attFeb.length + attMar.length} attendance records`);

  // 6. Build payment history for January and February 2026
  //    Payment methods and transaction refs vary per worker to look realistic.
  const paymentMethods = ['cash', 'upi', 'bank_transfer', 'cheque'];

  const txnRefs = {
    upi:           (w) => `UPI${Date.now()}${w._id.toString().slice(-4)}`,
    bank_transfer: (w) => `NEFT${w._id.toString().slice(-6).toUpperCase()}`,
    cheque:        ()  => `CHQ${Math.floor(100000 + Math.random() * 900000)}`,
    cash:          ()  => '',
  };

  const paymentNotes = [
    'Full month salary paid on time.',
    'Salary includes overtime bonus.',
    'Partial advance adjusted.',
    'Paid via contractor agreement.',
    'Worker confirmed receipt.',
  ];

  const paymentsToInsert = [];

  for (const worker of workers) {
    // Skip inactive workers — they receive no payment
    if (worker.status === 'inactive') continue;

    // Each worker may use a different payment method each month for realism
    const methodJan = pick(paymentMethods);
    const methodFeb = pick(paymentMethods);
    const methodMar = pick(paymentMethods);

    // ── January 2026 payment (full month, paid on 31 Jan) ──
    paymentsToInsert.push(buildPayment(
      worker, user._id,
      new Date(2026, 0, 1),   // period start: 1 Jan
      new Date(2026, 0, 31),  // period end:   31 Jan
      22, 2, 1, 1,            // present, absent, half, leave
      26,                     // total working days in Jan
      methodJan,
      new Date(2026, 0, 31),  // paid on 31 Jan (within Jan filter range)
      txnRefs[methodJan](worker),
      pick(paymentNotes),
    ));

    // ── February 2026 payment (full month, paid on 28 Feb) ──
    paymentsToInsert.push(buildPayment(
      worker, user._id,
      new Date(2026, 1, 1),   // period start: 1 Feb
      new Date(2026, 1, 28),  // period end:   28 Feb
      21, 2, 1, 0,            // present, absent, half, leave
      24,                     // total working days in Feb
      methodFeb,
      new Date(2026, 1, 28),  // paid on 28 Feb (within Feb filter range)
      txnRefs[methodFeb](worker),
      pick(paymentNotes),
    ));

    // ── March 2026 advance payment (partial, days 1-15, paid on 15 Mar) ──
    // Only daily-wage workers get a mid-month advance; monthly-wage get full on month end.
    if (worker.wageType === 'daily') {
      paymentsToInsert.push(buildPayment(
        worker, user._id,
        new Date(2026, 2, 1),   // period start: 1 Mar
        new Date(2026, 2, 15),  // period end:   15 Mar
        12, 2, 1, 0,            // present, absent, half, leave (partial fortnight)
        15,                     // working days in first half of Mar
        methodMar,
        new Date(2026, 2, 15),  // paid on 15 Mar
        txnRefs[methodMar](worker),
        'Mid-month advance payment for first fortnight.',
      ));
    }
  }

  await Payment.insertMany(paymentsToInsert);
  console.log(`Created ${paymentsToInsert.length} payment records`);

  // 7. Done
  console.log('\n✅ Seed complete!');
  console.log('📧 Login : demo@workflow.com');
  console.log('🔑 Password: demo1234');

  await mongoose.disconnect();
}

// ─── Entry point ──────────────────────────────────────────────────────────────
seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
