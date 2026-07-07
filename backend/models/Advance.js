const mongoose = require('mongoose');

const advanceSchema = new mongoose.Schema(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    worker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Worker',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['advance', 'loan'],
      default: 'advance',
    },
    amount: { type: Number, required: true, min: 0 },
    issuedOn: { type: Date, default: Date.now },
    reason: { type: String, default: '' },
    installmentAmount: { type: Number, default: 0 },
    repaid: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['active', 'cleared', 'written_off'],
      default: 'active',
    },
    issuedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    repayments: [
      {
        amount: { type: Number, required: true },
        date: { type: Date, default: Date.now },
        paymentRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment', default: null },
        note: { type: String, default: '' },
      },
    ],
  },
  { timestamps: true }
);

advanceSchema.virtual('remaining').get(function () {
  return Math.max(0, (this.amount || 0) - (this.repaid || 0));
});

advanceSchema.set('toJSON', { virtuals: true });
advanceSchema.set('toObject', { virtuals: true });

advanceSchema.index({ organization: 1, worker: 1, status: 1 });

module.exports = mongoose.model('Advance', advanceSchema);
