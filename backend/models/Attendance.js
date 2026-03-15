const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema(
  {
    worker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Worker',
      required: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ['present', 'absent', 'halfday', 'leave'],
      required: true,
    },
    // Overtime hours for the day
    overtimeHours: {
      type: Number,
      default: 0,
      min: 0,
    },
    notes: {
      type: String,
      default: '',
    },
    // Who marked this attendance
    markedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

// Unique: one attendance record per worker per day
attendanceSchema.index({ worker: 1, date: 1 }, { unique: true });
attendanceSchema.index({ owner: 1, date: 1 });

module.exports = mongoose.model('Attendance', attendanceSchema);
