const jwt = require('jsonwebtoken');
const { query } = require('../config/db');

/**
 * Authentication Middleware
 * Verifies JWT token and attaches user to request
 * Includes company_id for multi-tenant scoping
 */
const authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    const token = authHeader.split(' ')[1];
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from database with company info
    const result = await query(
      `SELECT u.id, u.email, u.role, u.phone, u.is_active, u.company_id,
              c.name as company_name, c.is_active as company_active
       FROM users u
       LEFT JOIN companies c ON u.company_id = c.id
       WHERE u.id = $1`,
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token. User not found.'
      });
    }

    const user = result.rows[0];

    // Check if user is active
    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated. Please contact support.'
      });
    }

    // Check if company is active (for non-system-admin users)
    if (user.role !== 'system_admin' && user.company_id && !user.company_active) {
      return res.status(403).json({
        success: false,
        message: 'Company account is deactivated. Please contact support.'
      });
    }

    // Attach user to request
    req.user = user;
    
    // Set company scope - support both company_id and companyId (impersonation)
    if (req.user.role === 'system_admin') {
      // System admin: use companyId from token if present (impersonation), otherwise no scope
      req.companyScope = req.user.companyId || null;
      // Map companyId to company_id for controller compatibility
      if (req.user.companyId && !req.user.company_id) {
        req.user.company_id = req.user.companyId;
      }
    } else {
      // Company admin and below: scoped to their company
      req.companyScope = req.user.company_id || null;
      if (!req.companyScope) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. User not assigned to a company.'
        });
      }
    }
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired. Please login again.'
      });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token.'
      });
    }
    console.error('Authentication error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error during authentication.'
    });
  }
};

/**
 * Role-Based Access Control Middleware
 * @param {Array} roles - Array of allowed roles
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient permissions.'
      });
    }

    next();
  };
};

/**
 * Company-scoping middleware
 * Adds company_id filter to queries unless user is system_admin
 * Usage: app.use(requireCompanyScope) before routes that need scoping
 */
const requireCompanyScope = (req, res, next) => {
  // System admin: use impersonation scope if set, otherwise no filter
  if (req.user.role === 'system_admin') {
    // If companyScope was already set in authenticate (impersonation), keep it
    if (req.companyScope === undefined) {
      req.companyScope = null;
    }
    return next();
  }

  // Company admin and below: scoped to their company
  if (!req.user.company_id) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. User not assigned to a company.'
    });
  }

  req.companyScope = req.user.company_id;
  next();
};

/**
 * Helper: apply company scope to a SQL query
 * @param {string} sql - SQL query string
 * @param {Array} params - Query parameters
 * @param {string} companyScope - Company UUID or null for system admin
 * @param {string} tableAlias - Table alias prefix (e.g., 'e.' for employees)
 * @returns {string} Modified SQL with company filter
 */
const applyCompanyScope = (sql, companyScope, tableAlias = '') => {
  if (!companyScope) return sql; // System admin - no filter
  
  const alias = tableAlias ? `${tableAlias}` : '';
  const column = alias ? `${alias}company_id` : 'company_id';
  
  // Add WHERE clause for company_id
  if (sql.toUpperCase().includes('WHERE')) {
    return sql + ` AND ${column} = $${/* param index will be set by caller */0}`;
  }
  return sql + ` WHERE ${column} = $${/* param index will be set by caller */0}`;
};

/**
 * Admin-only middleware (system_admin or company_admin)
 */
const requireAdmin = authorize('system_admin', 'company_admin');

/**
 * Service Provider middleware
 */
const requireProvider = authorize('provider', 'system_admin', 'company_admin', 'admin');

/**
 * Customer middleware
 */
const requireCustomer = authorize('customer', 'system_admin', 'company_admin', 'admin', 'provider');

/**
 * System Admin only - full system access
 */
const requireSystemAdmin = authorize('system_admin');

/**
 * Company Admin workforce access
 */
const requireCompanyAdmin = authorize('company_admin', 'system_admin');

/**
 * Workforce management middleware
 */
const requireSuperAdmin = authorize('system_admin', 'company_admin', 'admin');

/**
 * HR Manager workforce access
 */
const requireHRManager = authorize('hr_manager', 'system_admin', 'company_admin', 'admin');

/**
 * Department Manager workforce access
 */
const requireDepartmentManager = authorize('department_manager', 'hr_manager', 'system_admin', 'company_admin', 'admin', 'senior_management');

/**
 * Supervisor workforce access
 */
const requireSupervisor = authorize('supervisor', 'department_manager', 'hr_manager', 'system_admin', 'company_admin', 'admin', 'senior_management');

/**
 * Employee access (any authenticated workforce role)
 */
const requireEmployee = authorize('employee', 'supervisor', 'department_manager', 'hr_manager', 'system_admin', 'company_admin', 'admin', 'senior_management');

module.exports = {
  authenticate,
  authorize,
  requireAdmin,
  requireProvider,
  requireCustomer,
  requireSystemAdmin,
  requireCompanyAdmin,
  requireSuperAdmin,
  requireHRManager,
  requireDepartmentManager,
  requireSupervisor,
  requireEmployee,
  requireCompanyScope,
  applyCompanyScope
};
