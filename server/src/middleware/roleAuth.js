const ROLES = {
  SUPER_ADMIN: 'super_admin',
  BUS_COORDINATOR: 'bus_coordinator',
  ACCOUNTS: 'accounts',
  BUS_INCHARGE: 'bus_incharge',
  STUDENT: 'student',
  FACULTY: 'faculty',
};

const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        required: allowedRoles,
        current: req.user.role,
      });
    }
    next();
  };
};

const requireSuperAdmin = requireRole(ROLES.SUPER_ADMIN);

const requireCoordinator = requireRole(ROLES.SUPER_ADMIN, ROLES.BUS_COORDINATOR);

const requireAccounts = requireRole(ROLES.SUPER_ADMIN, ROLES.ACCOUNTS);

const requireBusIncharge = requireRole(ROLES.SUPER_ADMIN, ROLES.BUS_COORDINATOR, ROLES.BUS_INCHARGE);

const requireStaff = requireRole(
  ROLES.SUPER_ADMIN,
  ROLES.BUS_COORDINATOR,
  ROLES.ACCOUNTS,
  ROLES.BUS_INCHARGE
);

module.exports = {
  ROLES,
  requireRole,
  requireSuperAdmin,
  requireCoordinator,
  requireAccounts,
  requireBusIncharge,
  requireStaff,
};
