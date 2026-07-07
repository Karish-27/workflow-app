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
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
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
    // Who marked this attendance (User for admin/supervisor marks; null when self-marked by worker)
    markedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    // Check-in / check-out timestamps
    checkInAt: { type: Date, default: null },
    checkOutAt: { type: Date, default: null },

    // GPS + photo captured at check-in
    checkInLocation: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
      accuracy: { type: Number, default: null },
    },
    checkOutLocation: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
      accuracy: { type: Number, default: null },
    },
    checkInPhotoUrl: { type: String, default: '' },

    // Source of the mark
    source: {
      type: String,
      enum: ['admin', 'supervisor', 'self', 'kiosk', 'biometric'],
      default: 'admin',
    },
    site: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Site',
      default: null,
    },
    // Derived flags
    isLate: { type: Boolean, default: false },
    lateByMinutes: { type: Number, default: 0 },
  },
  { timestamps: true }
);

attendanceSchema.index({ worker: 1, date: 1 }, { unique: true });
attendanceSchema.index({ owner: 1, date: 1 });
attendanceSchema.index({ organization: 1, date: 1 });

module.exports = mongoose.model('Attendance', attendanceSchema);
