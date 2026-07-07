const mongoose = require('mongoose');

const organizationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Organization name is required'],
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    industry: { type: String, default: '' },
    phone: { type: String, default: '' },
    address: { type: String, default: '' },
    country: { type: String, default: 'IN' },
    currency: { type: String, default: 'INR' },
    timezone: { type: String, default: 'Asia/Kolkata' },
    logoUrl: { type: String, default: '' },

    plan: {
      type: String,
      enum: ['free', 'pro', 'business'],
      default: 'free',
    },
    trialEndsAt: { type: Date, default: null },
    seatLimit: { type: Number, default: 3 },
    workerLimit: { type: Number, default: 25 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Organization', organizationSchema);
