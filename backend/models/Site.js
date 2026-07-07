const mongoose = require('mongoose');
const crypto = require('crypto');

const siteSchema = new mongoose.Schema(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    address: { type: String, default: '' },
    lat: { type: Number, default: null },
    lng: { type: Number, default: null },
    radiusMeters: { type: Number, default: 100 },
    // Token used for kiosk QR. Rotates when site is updated.
    kioskToken: {
      type: String,
      default: () => crypto.randomBytes(16).toString('hex'),
      index: true,
    },
    geofenceEnabled: { type: Boolean, default: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

siteSchema.index({ organization: 1, name: 1 });

module.exports = mongoose.model('Site', siteSchema);
