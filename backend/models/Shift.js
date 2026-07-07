const mongoose = require('mongoose');

const shiftSchema = new mongoose.Schema(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    startTime: { type: String, required: true }, // "09:00"
    endTime: { type: String, required: true },   // "18:00"
    breakMinutes: { type: Number, default: 60 },
    lateAfterMinutes: { type: Number, default: 15 },
    overtimeAfterMinutes: { type: Number, default: 30 },
    weeklyOffs: {
      type: [Number],
      default: [0], // Sunday by default (0=Sun, 6=Sat)
    },
    color: { type: String, default: '#FF5C3A' },
    isDefault: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

shiftSchema.index({ organization: 1, name: 1 });

module.exports = mongoose.model('Shift', shiftSchema);
