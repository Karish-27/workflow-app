const AuditLog = require('../models/AuditLog');

async function recordAudit(req, { action, resource, resourceId = '', metadata = {} }) {
  try {
    if (!req.user || !req.user.organization) return;
    await AuditLog.create({
      organization: req.user.organization,
      actor: req.user._id,
      actorEmail: req.user.email,
      action,
      resource,
      resourceId: resourceId ? String(resourceId) : '',
      metadata,
      ip: (req.headers['x-forwarded-for'] || req.ip || '').toString().split(',')[0].trim(),
      userAgent: req.headers['user-agent'] || '',
    });
  } catch (err) {
    console.error('[audit] failed to record audit log:', err.message);
  }
}

module.exports = { recordAudit };
