const mongoose = require('mongoose');

const workerSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
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
  },
  { timestamps: true }
);

// Index for fast owner-based queries
workerSchema.index({ owner: 1, status: 1 });

module.exports = mongoose.model('Worker', workerSchema);
