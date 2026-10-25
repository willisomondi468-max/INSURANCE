const { query, getClient } = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

/**
 * GET /api/system/companies
 * List all companies (System Admin only)
 */
const getAllCompanies = async (req, res) => {
  try {
    const result = await query(
      `SELECT c.id, c.name, c.legal_name, c.email, c.phone, c.address, c.website,
              c.subscription_plan, c.subscription_status, c.is_active, c.created_at,
              COUNT(u.id) as total_users
       FROM companies c
       LEFT JOIN users u ON u.company_id = c.id
       GROUP BY c.id, c.name, c.legal_name, c.email, c.phone, c.address, c.website,
                c.subscription_plan, c.subscription_status, c.is_active, c.created_at
       ORDER BY c.created_at DESC`
    );

    // Get user counts per company separately to avoid enum comparison issues
    const companiesWithCounts = [];
    for (const company of result.rows) {
      const userCounts = await query(
        `SELECT role, COUNT(*) as cnt FROM users WHERE company_id = $1 GROUP BY role`,
        [company.id]
      );
      const counts = { total_users: parseInt(company.total_users), company_admins: 0, employees: 0, customers: 0 };
      userCounts.rows.forEach(row => {
        if (row.role === 'company_admin') counts.company_admins = parseInt(row.cnt);
        if (row.role === 'employee') counts.employees = parseInt(row.cnt);
        if (row.role === 'customer') counts.customers = parseInt(row.cnt);
      });
      companiesWithCounts.push({ ...company, ...counts });
    }

    res.json({
      success: true,
      data: { companies: companiesWithCounts }
    });
  } catch (error) {
    console.error('Get all companies error:', error);
    res.status(500).json({ success: false, message: 'Failed to get companies' });
  }
};

/**
 * POST /api/system/companies
 * Create a new company (System Admin only)
 */
const createCompany = async (req, res) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const { name, legal_name, email, phone, address, website, subscription_plan } = req.body;

    const result = await client.query(
      `INSERT INTO companies (name, legal_name, email, phone, address, website, subscription_plan, subscription_status, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', true)
       RETURNING *`,
      [name, legal_name || null, email || null, phone || null, address || null, website || null, subscription_plan || 'basic']
    );

    // Create audit log
    await client.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address)
       VALUES ($1, 'create', 'company', $2, $3, $4)`,
      [req.user.id, result.rows[0].id, JSON.stringify(req.body), req.ip]
    );

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Company created successfully',
      data: { company: result.rows[0] }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create company error:', error);
    res.status(500).json({ success: false, message: 'Failed to create company' });
  } finally {
    client.release();
  }
};

/**
 * PATCH /api/system/companies/:id
 * Update company details (System Admin only)
 */
const updateCompany = async (req, res) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const { name, legal_name, email, phone, address, website, subscription_plan, subscription_status, is_active } = req.body;

    const existing = await client.query('SELECT id FROM companies WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Company not found' });
    }

    const result = await client.query(
      `UPDATE companies
       SET name = COALESCE($1, name),
           legal_name = COALESCE($2, legal_name),
           email = COALESCE($3, email),
           phone = COALESCE($4, phone),
           address = COALESCE($5, address),
           website = COALESCE($6, website),
           subscription_plan = COALESCE($7, subscription_plan),
           subscription_status = COALESCE($8, subscription_status),
           is_active = COALESCE($9, is_active),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $10
       RETURNING *`,
      [name, legal_name, email, phone, address, website, subscription_plan, subscription_status, is_active, id]
    );

    // Create audit log
    await client.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address)
       VALUES ($1, 'update', 'company', $2, $3, $4)`,
      [req.user.id, id, JSON.stringify(req.body), req.ip]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Company updated successfully',
      data: { company: result.rows[0] }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Update company error:', error);
    res.status(500).json({ success: false, message: 'Failed to update company' });
  } finally {
    client.release();
  }
};

/**
 * GET /api/system/companies/:id/stats
 * Get company statistics (System Admin only)
 */
const getCompanyStats = async (req, res) => {
  try {
    const { id } = req.params;

    const [empResult, taskResult, attResult] = await Promise.all([
      query(
        `SELECT COUNT(*) as cnt FROM employees WHERE company_id = $1`,
        [id]
      ),
      query(
        `SELECT
           COUNT(DISTINCT t.id) as total_tasks,
           COUNT(DISTINCT CASE WHEN t.status = 'completed' THEN t.id END) as completed_tasks
         FROM tasks t
         LEFT JOIN task_assignments ta ON t.id = ta.task_id
         LEFT JOIN employees e ON ta.employee_id = e.id
         WHERE e.company_id = $1`,
        [id]
      ),
      query(
        `SELECT COUNT(*) as cnt FROM attendance_records ar
         JOIN employees e ON ar.employee_id = e.id
         WHERE e.company_id = $1 AND DATE(ar.created_at) = CURRENT_DATE`,
        [id]
      )
    ]);

    res.json({
      success: true,
      data: {
        companyId: id,
        totalEmployees: parseInt(empResult.rows[0].cnt) || 0,
        totalTasks: parseInt(taskResult.rows[0].total_tasks) || 0,
        completedTasks: parseInt(taskResult.rows[0].completed_tasks) || 0,
        todayAttendance: parseInt(attResult.rows[0].cnt) || 0
      }
    });
  } catch (error) {
    console.error('Get company stats error:', error);
    res.status(500).json({ success: false, message: 'Failed to get company stats' });
  }
};

/**
 * GET /api/system/dashboard
 * System-wide dashboard overview (System Admin only)
 */
const getSystemDashboard = async (req, res) => {
  try {
    const [
      companyResult,
      userResult,
      taskResult,
      attResult
    ] = await Promise.all([
      query(`SELECT COUNT(*) as cnt, COUNT(CASE WHEN is_active THEN 1 END) as active FROM companies`),
      query(`SELECT role, COUNT(*) as cnt FROM users GROUP BY role`),
      query(`SELECT status, COUNT(*) as cnt FROM tasks GROUP BY status`),
      query(`SELECT attendance_status, COUNT(*) as cnt FROM attendance_records WHERE DATE(created_at) = CURRENT_DATE GROUP BY attendance_status`)
    ]);

    res.json({
      success: true,
      data: {
        companies: companyResult.rows[0],
        usersByRole: userResult.rows.reduce((acc, row) => { acc[row.role] = parseInt(row.cnt); return acc; }, {}),
        tasksByStatus: taskResult.rows.reduce((acc, row) => { acc[row.status] = parseInt(row.cnt); return acc; }, {}),
        attendanceToday: attResult.rows.reduce((acc, row) => { acc[row.attendance_status] = parseInt(row.cnt); return acc; }, {})
      }
    });
  } catch (error) {
    console.error('Get system dashboard error:', error);
    res.status(500).json({ success: false, message: 'Failed to get system dashboard' });
  }
};

/**
 * POST /api/system/companies/:id/admin
 * Create a company admin for a specific company (System Admin only)
 */
const createCompanyAdmin = async (req, res) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const { id: companyId } = req.params;
    const { email, password, phone, fullName } = req.body;

    if (!email || !password) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Verify company exists
    const companyCheck = await client.query(
      'SELECT id, name, is_active FROM companies WHERE id = $1',
      [companyId]
    );
    if (companyCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Company not found' });
    }

    // Check if email already exists
    const existingUser = await client.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );
    if (existingUser.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ success: false, message: 'Email already registered' });
    }

    const passwordHash = bcrypt.hashSync(password, 10);

    // Create company admin user
    const userResult = await client.query(
      `INSERT INTO users (company_id, email, password_hash, role, phone, is_active)
       VALUES ($1, $2, $3, 'company_admin', $4, true)
       RETURNING id, email, role, company_id`,
      [companyId, email, passwordHash, phone || null]
    );

    // Create audit log
    await client.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address)
       VALUES ($1, 'create', 'company_admin', $2, $3, $4)`,
      [req.user.id, userResult.rows[0].id, JSON.stringify({ email, companyId }), req.ip]
    );

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Company admin created successfully',
      data: {
        adminId: userResult.rows[0].id,
        email: userResult.rows[0].email,
        role: userResult.rows[0].role,
        companyId: userResult.rows[0].company_id
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create company admin error:', error);
    res.status(500).json({ success: false, message: 'Failed to create company admin' });
  } finally {
    client.release();
  }
};

/**
 * GET /api/system/companies/:id/employees
 * View all employees in a company (System Admin only)
 */
const getCompanyEmployees = async (req, res) => {
  try {
    const { id: companyId } = req.params;

    const result = await query(
      `SELECT e.id, e.employee_number, e.job_title, e.employment_status,
              e.start_date, e.contracted_hours, e.timezone,
              d.name as department_name,
              u.email, u.phone, u.is_active as user_active
       FROM employees e
       LEFT JOIN users u ON e.user_id = u.id
       LEFT JOIN departments d ON e.department_id = d.id
       WHERE e.company_id = $1
       ORDER BY e.employee_number`,
      [companyId]
    );

    res.json({
      success: true,
      data: { employees: result.rows, companyId }
    });
  } catch (error) {
    console.error('Get company employees error:', error);
    res.status(500).json({ success: false, message: 'Failed to get company employees' });
  }
};

/**
 * POST /api/system/access/:companyId
 * System admin accesses a company (impersonation - returns a scoped token)
 * Allows system admin to operate within any company context
 */
const accessCompany = async (req, res) => {
  try {
    const { companyId } = req.params;

    // Verify company exists and is active
    const companyCheck = await query(
      'SELECT id, name, is_active FROM companies WHERE id = $1',
      [companyId]
    );
    if (companyCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Company not found' });
    }
    if (!companyCheck.rows[0].is_active) {
      return res.status(403).json({ success: false, message: 'Company is deactivated' });
    }

    // Create a scoped access token for system admin acting within this company
    const accessToken = jwt.sign(
      {
        userId: req.user.id,
        email: req.user.email,
        role: 'system_admin',
        companyId: companyId, // scoped to this company
        impersonating: true
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '8h' }
    );

    // Create audit log
    await query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address)
       VALUES ($1, 'access', 'company', $2, $3, $4)`,
      [req.user.id, companyId, JSON.stringify({ action: 'system_admin_company_access' }), req.ip]
    );

    res.json({
      success: true,
      message: `Access granted to company: ${companyCheck.rows[0].name}`,
      data: {
        company: {
          id: companyCheck.rows[0].id,
          name: companyCheck.rows[0].name,
          is_active: companyCheck.rows[0].is_active
        },
        accessToken,
        expiresIn: process.env.JWT_EXPIRE || '8h'
      }
    });
  } catch (error) {
    console.error('Access company error:', error);
    res.status(500).json({ success: false, message: 'Failed to access company' });
  }
};

module.exports = {
  getAllCompanies,
  createCompany,
  updateCompany,
  getCompanyStats,
  getSystemDashboard,
  createCompanyAdmin,
  getCompanyEmployees,
  accessCompany
};
