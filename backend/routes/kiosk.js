const express = require('express');
const Site = require('../models/Site');
const Organization = require('../models/Organization');

const router = express.Router();

// ─── GET /api/kiosk/:token ────────────────────────────────────────
// Public — resolves a kiosk token to a minimal site info payload.
// Used by the kiosk landing page so workers can scan a QR and arrive
// at a self-check-in screen pre-bound to a site.
router.get('/:token', async (req, res) => {
  try {
    const site = await Site.findOne({
      kioskToken: req.params.token,
      deletedAt: null,
    });
    if (!site) {
      return res.status(404).json({ success: false, message: 'Kiosk link is invalid or has been rotated.' });
    }
    const organization = await Organization.findById(site.organization);
    res.json({
      success: true,
      site: {
        _id: site._id,
        name: site.name,
        address: site.address,
        lat: site.lat,
        lng: site.lng,
        radiusMeters: site.radiusMeters,
        geofenceEnabled: site.geofenceEnabled,
        kioskToken: site.kioskToken,
      },
      organization: organization
        ? {
            _id: organization._id,
            name: organization.name,
            slug: organization.slug,
            logoUrl: organization.logoUrl,
          }
        : null,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
