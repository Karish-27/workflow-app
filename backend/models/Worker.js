const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const workerSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Worker name is required'],
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
    role: {
      type: String,
      required: [true, 'Role is required'],
      trim: true,
    },
    wageType: {
      type: String,
      enum: ['daily', 'monthly'],
      required: true,
    },
    wage: {
      type: Number,
      required: [true, 'Wage is required'],
      min: 0,
    },
    joiningDate: {
      type: Date,
      required: [true, 'Joining date is required'],
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
    // Optional: overtime rate per hour
    overtimeRate: {
      type: Number,
      default: 0,
    },
    // Deduction rules
    deductionRules: {
      lateDeduction: { type: Number, default: 0 },  // per late instance
      advanceDeductible: { type: Boolean, default: true },
    },
    notes: {
      type: String,
      default: '',
    },
    photoUrl: { type: String, default: '' },

    // Self-service login (PIN hashed with bcrypt)
    pinHash: { type: String, default: null, select: false },
    selfServiceEnabled: { type: Boolean, default: false },

    // Default site & shift assignment
    site: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Site',
      default: null,
    },
    shift: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shift',
      default: null,
    },

    // Leave balance per type (resets yearly, simple counter for now)
    leaveBalance: {
      casual: { type: Number, default: 12 },
      sick: { type: Number, default: 7 },
      paid: { type: Number, default: 0 },
    },

    deletedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true }
);

workerSchema.index({ organization: 1, status: 1, deletedAt: 1 });
workerSchema.index({ owner: 1, status: 1 });
workerSchema.index({ organization: 1, phone: 1 });

workerSchema.methods.setPin = async function (pin) {
  if (!pin) {
    this.pinHash = null;
    this.selfServiceEnabled = false;
    return;
  }
  this.pinHash = await bcrypt.hash(String(pin), 10);
  this.selfServiceEnabled = true;
};

workerSchema.methods.comparePin = async function (pin) {
  if (!this.pinHash) return false;
  return bcrypt.compare(String(pin), this.pinHash);
};

module.exports = mongoose.model('Worker', workerSchema);
