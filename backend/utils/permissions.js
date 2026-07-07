const ROLE_PERMISSIONS = {
  admin: ['*'],
  supervisor: [
    'worker.read',
    'attendance.read',
    'attendance.write',
    'salary.read',
    'payment.read',
    'dashboard.read',
    'holiday.read',
    'leave.read',
    'leave.write',
    'shift.read',
    'site.read',
    'advance.read',
    'export.read',
  ],
  accountant: [
    'worker.read',
    'attendance.read',
    'salary.read',
    'payment.read',
    'payment.write',
    'dashboard.read',
    'holiday.read',
    'leave.read',
    'shift.read',
    'site.read',
    'advance.read',
    'advance.write',
    'export.read',
  ],
  viewer: [
    'worker.read',
    'attendance.read',
    'salary.read',
    'payment.read',
    'dashboard.read',
    'holiday.read',
    'leave.read',
    'shift.read',
    'site.read',
    'advance.read',
  ],
};

function hasPermission(role, permission) {
  const perms = ROLE_PERMISSIONS[role] || [];
  return perms.includes('*') || perms.includes(permission);
}

function permissionsForRole(role) {
  return ROLE_PERMISSIONS[role] || [];
}

module.exports = { ROLE_PERMISSIONS, hasPermission, permissionsForRole };
