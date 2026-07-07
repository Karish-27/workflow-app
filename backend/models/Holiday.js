const mongoose = require('mongoose');

const holidaySchema = new mongoose.Schema(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    date: { type: Date, required: true },
    paid: { type: Boolean, default: true },
    region: { type: String, default: '' },
    notes: { type: String, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

holidaySchema.index({ organization: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Holiday', holidaySchema);
