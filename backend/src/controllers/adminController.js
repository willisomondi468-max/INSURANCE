const { query, getClient } = require('../config/db');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

/**
 * Administrator Dashboard Controller
 * Company-wide control center
 */

/**
 * Get admin dashboard overview
 * GET /api/admin/dashboard
 */
const getAdminDashboard = async (req, res) => {
  try {
    const companyScope = req.companyScope;

    // Total customers
    const customerCount = await query(
      `SELECT COUNT(*) FROM users WHERE role = 'customer'${companyScope ? ' AND company_id = $1' : ''}`,
      companyScope ? [companyScope] : []
    );

    // Active policies
    const activePolicies = await query(
      `SELECT COUNT(*) FROM policies WHERE status = 'active'${companyScope ? ' AND company_id = $1' : ''}`,
      companyScope ? [companyScope] : []
    );

    // Pending claims
    const pendingClaims = await query(
      `SELECT COUNT(*) FROM claims WHERE status IN ('pending', 'under_review')${companyScope ? ' AND company_id = $1' : ''}`,
      companyScope ? [companyScope] : []
    );

    // Total employees
    const totalEmployees = await query(
      `SELECT COUNT(*) FROM employees${companyScope ? ' WHERE company_id = $1' : ''}`,
      companyScope ? [companyScope] : []
    );

    // Departments
    const departments = await query(
      `SELECT d.*, COUNT(e.id) as employee_count
       FROM departments d
       LEFT JOIN employees e ON d.id = e.department_id
       ${companyScope ? 'WHERE d.company_id = $1' : ''}
       GROUP BY d.id`,
      companyScope ? [companyScope] : []
    );

    // Recent audit logs
    const auditLogs = await query(
      `SELECT al.*, u.email as actor_email
       FROM audit_logs al
       LEFT JOIN users u ON al.user_id = u.id
       ${companyScope ? 'WHERE u.company_id = $1' : ''}
       ORDER BY al.created_at DESC
       LIMIT 20`,
      companyScope ? [companyScope] : []
    );

    // Monthly performance trend
    const monthlyTrend = await query(
      `SELECT reporting_year, reporting_month,
              AVG(completion_rate) as avg_completion_rate,
              AVG(attendance_rate) as avg_attendance_rate,
              AVG(quality_score) as avg_quality_score
       FROM monthly_performance_snapshots
       ${companyScope ? 'WHERE department_id IN (SELECT id FROM departments WHERE company_id = $1)' : ''}
       GROUP BY reporting_year, reporting_month
       ORDER BY reporting_year DESC, reporting_month DESC
       LIMIT 12`,
      companyScope ? [companyScope] : []
    );

    res.json({
      success: true,
      data: {
        stats: {
          totalCustomers: parseInt(customerCount.rows[0].count),
          activePolicies: parseInt(activePolicies.rows[0].count),
          pendingClaims: parseInt(pendingClaims.rows[0].count),
          totalEmployees: parseInt(totalEmployees.rows[0].count)
        },
        departments: departments.rows,
        auditLogs: auditLogs.rows,
        monthlyTrend: monthlyTrend.rows
      }
    });
  } catch (error) {
    console.error('Get admin dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get admin dashboard'
    });
  }
};

/**
 * Get all users (admin)
 * GET /api/admin/users
 */
const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 50, search, role, isActive } = req.query;
    const offset = (page - 1) * limit;
    const companyScope = req.companyScope;

    let queryText = `
      SELECT u.id, u.email, u.role, u.phone, u.is_active, u.created_at, u.updated_at,
             c.name as company_name, c.id as company_id
      FROM users u
      LEFT JOIN companies c ON u.company_id = c.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    if (search) {
      paramCount++;
      queryText += ` AND (u.email ILIKE $${paramCount} OR u.phone ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    if (role) {
      paramCount++;
      queryText += ` AND u.role = $${paramCount}`;
      params.push(role);
    }

    if (isActive !== undefined) {
      paramCount++;
      queryText += ` AND u.is_active = $${paramCount}`;
      params.push(isActive === 'true');
    }

    if (companyScope && req.user.role !== 'system_admin') {
      paramCount++;
      queryText += ` AND u.company_id = $${paramCount}`;
      params.push(companyScope);
    }

    const countResult = await query(
      `SELECT COUNT(*) FROM (${queryText}) as filtered`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    paramCount++;
    queryText += ` ORDER BY u.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);

    const result = await query(queryText, params);

    res.json({
      success: true,
      data: {
        users: result.rows.map(u => ({
          id: u.id,
          email: u.email,
          role: u.role,
          phone: u.phone,
          isActive: u.is_active,
          companyName: u.company_name,
          companyId: u.company_id,
          createdAt: u.created_at,
          updatedAt: u.updated_at
        })),
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get users'
    });
  }
};

/**
 * Create user (admin)
 * POST /api/admin/users
 */
const createUser = async (req, res) => {
  const client = await getClient();

  try {
    await client.query('BEGIN');

    const { email, password, role, phone, companyId } = req.body;
    const creatorId = req.user.id;

    // Check if email already exists
    const existing = await client.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );
    if (existing.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Email already registered'
      });
    }

    // Validate role
    const validRoles = ['customer', 'admin', 'provider', 'system_admin', 'company_admin', 'hr_manager', 'department_manager', 'supervisor', 'employee', 'senior_management'];
    if (!validRoles.includes(role)) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Invalid role'
      });
    }

    // System admin can assign any company; others scoped to their company
    let finalCompanyId = companyId;
    if (req.user.role !== 'system_admin') {
      finalCompanyId = companyScope;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const userResult = await client.query(
      `INSERT INTO users (company_id, email, password_hash, role, phone, is_active)
       VALUES ($1, $2, $3, $4, $5, true)
       RETURNING id, email, role, phone, created_at`,
      [finalCompanyId, email, passwordHash, role, phone]
    );
    const user = userResult.rows[0];

    // Create audit log
    await client.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address)
       VALUES ($1, 'create_user', 'user', $2, $3, $4)`,
      [creatorId, user.id, JSON.stringify({ email, role, companyId: finalCompanyId }), req.ip]
    );

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: { id: user.id, email: user.email, role: user.role }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create user'
    });
  } finally {
    client.release();
  }
};

/**
 * Update user role/status (admin)
 * PUT /api/admin/users/:id
 */
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { role, isActive, companyId } = req.body;
    const updaterId = req.user.id;
    const companyScope = req.companyScope;

    // Check if user exists and is accessible
    const userResult = await query(
      `SELECT id, email, role FROM users WHERE id = $1${companyScope && req.user.role !== 'system_admin' ? ' AND company_id = $2' : ''}`,
      companyScope && req.user.role !== 'system_admin' ? [id, companyScope] : [id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const updates = [];
    const values = [];
    let paramCount = 0;

    if (role !== undefined) {
      paramCount++;
      updates.push(`role = $${paramCount}`);
      values.push(role);
    }
    if (isActive !== undefined) {
      paramCount++;
      updates.push(`is_active = $${paramCount}`);
      values.push(isActive);
    }
    if (companyId !== undefined && req.user.role === 'system_admin') {
      paramCount++;
      updates.push(`company_id = $${paramCount}`);
      values.push(companyId);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }

    paramCount++;
    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    await query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramCount}`,
      values
    );

    // Create audit log
    await query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address)
       VALUES ($1, 'update_user', 'user', $2, $3, $4)`,
      [updaterId, id, JSON.stringify({ role, isActive, companyId }), req.ip]
    );

    res.json({
      success: true,
      message: 'User updated successfully'
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user'
    });
  }
};

/**
 * Get audit logs (admin)
 * GET /api/admin/audit-logs
 */
const getAuditLogs = async (req, res) => {
  try {
    const { page = 1, limit = 50, action, entityType, userId } = req.query;
    const offset = (page - 1) * limit;
    const companyScope = req.companyScope;

    let queryText = `
      SELECT al.*, u.email as actor_email, u.role as actor_role
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    if (action) {
      paramCount++;
      queryText += ` AND al.action = $${paramCount}`;
      params.push(action);
    }

    if (entityType) {
      paramCount++;
      queryText += ` AND al.entity_type = $${paramCount}`;
      params.push(entityType);
    }

    if (userId) {
      paramCount++;
      queryText += ` AND al.user_id = $${paramCount}`;
      params.push(userId);
    }

    if (companyScope && req.user.role !== 'system_admin') {
      paramCount++;
      queryText += ` AND u.company_id = $${paramCount}`;
      params.push(companyScope);
    }

    const countResult = await query(
      `SELECT COUNT(*) FROM (${queryText}) as filtered`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    paramCount++;
    queryText += ` ORDER BY al.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);

    const result = await query(queryText, params);

    res.json({
      success: true,
      data: {
        auditLogs: result.rows,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get audit logs'
    });
  }
};

/**
 * Get departments (admin)
 * GET /api/admin/departments
 */
const getDepartments = async (req, res) => {
  try {
    const companyScope = req.companyScope;

    const result = await query(
      `SELECT d.*, COUNT(e.id) as employee_count,
              m.email as manager_email
       FROM departments d
       LEFT JOIN employees e ON d.id = e.department_id
       LEFT JOIN users m ON d.manager_id = m.id
       ${companyScope ? 'WHERE d.company_id = $1' : ''}
       GROUP BY d.id, m.email`,
      companyScope ? [companyScope] : []
    );

    res.json({
      success: true,
      data: { departments: result.rows }
    });
  } catch (error) {
    console.error('Get departments error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get departments'
    });
  }
};

module.exports = {
  getAdminDashboard,
  getAllUsers,
  createUser,
  updateUser,
  getAuditLogs,
  getDepartments
};
