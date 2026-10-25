const { query, getClient } = require('../config/db');
const { v4: uuidv4 } = require('uuid');

/**
 * Staff Customer Management
 * Authorized staff can register, search, and manage customers
 */

/**
 * Get customers for staff (searchable, scoped to staff's department)
 * GET /api/staff/customers
 */
const getStaffCustomers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, status, departmentId } = req.query;
    const offset = (page - 1) * limit;
    const userId = req.user.id;
    const companyScope = req.companyScope;

    // Get staff's department
    const staffResult = await query(
      `SELECT e.id, e.department_id, e.user_id FROM employees e WHERE e.user_id = $1`,
      [userId]
    );

    let staffDeptId = null;
    if (staffResult.rows.length > 0) {
      staffDeptId = staffResult.rows[0].department_id;
    }

    let queryText = `
      SELECT cd.*, u.email, u.phone, u.is_active, u.created_at as user_created_at,
             (SELECT COUNT(*) FROM policies p WHERE p.customer_id = u.id) as policy_count,
             (SELECT COUNT(*) FROM claims c WHERE c.customer_id = u.id) as claim_count
      FROM customer_details cd
      JOIN users u ON cd.user_id = u.id
      WHERE u.role = 'customer'
    `;
    const queryParams = [];
    let paramCount = 0;

    if (search) {
      paramCount++;
      queryText += ` AND (cd.full_name ILIKE $${paramCount} OR cd.id_number ILIKE $${paramCount} OR u.email ILIKE $${paramCount} OR cd.phone ILIKE $${paramCount})`;
      queryParams.push(`%${search}%`);
    }

    if (status === 'active') {
      queryText += ' AND u.is_active = true';
    } else if (status === 'inactive') {
      queryText += ' AND u.is_active = false';
    }

    // Company scoping for non-system-admin staff
    if (companyScope) {
      paramCount++;
      queryText += ` AND u.company_id = $${paramCount}`;
      queryParams.push(companyScope);
    }

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) FROM (${queryText}) as filtered`,
      queryParams
    );
    const total = parseInt(countResult.rows[0].count);

    // Add pagination and ordering
    paramCount++;
    queryText += ` ORDER BY u.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    queryParams.push(limit, offset);

    const result = await query(queryText, queryParams);

    res.json({
      success: true,
      data: {
        customers: result.rows.map(c => ({
          id: c.id,
          userId: c.user_id,
          fullName: c.full_name,
          idNumber: c.id_number,
          phone: c.phone,
          email: c.email,
          address: c.address,
          dateOfBirth: c.date_of_birth,
          isVerified: c.is_verified,
          isActive: c.is_active,
          policyCount: parseInt(c.policy_count),
          claimCount: parseInt(c.claim_count),
          createdAt: c.user_created_at,
          staffDeptId
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
    console.error('Get staff customers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get customers'
    });
  }
};

/**
 * Get customer profile for staff
 * GET /api/staff/customers/:id/profile
 */
const getStaffCustomerProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const companyScope = req.companyScope;

    let queryText = `
      SELECT cd.*, u.email, u.phone, u.is_active, u.created_at as user_created_at
      FROM customer_details cd
      JOIN users u ON cd.user_id = u.id
      WHERE cd.id = $1
    `;
    const queryParams = [id];

    if (companyScope) {
      queryText += ` AND u.company_id = $2`;
      queryParams.push(companyScope);
    }

    const result = await query(queryText, queryParams);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    const customer = result.rows[0];

    // Get customer's policies
    const policiesResult = await query(
      `SELECT p.*, ip.name as plan_name, ip.coverage_amount
       FROM policies p
       LEFT JOIN insurance_plans ip ON p.plan_id = ip.id
       WHERE p.customer_id = $1
       ORDER BY p.created_at DESC`,
      [customer.user_id]
    );

    // Get customer's claims
    const claimsResult = await query(
      `SELECT c.*, p.policy_number
       FROM claims c
       LEFT JOIN policies p ON c.policy_id = p.id
       WHERE c.customer_id = $1
       ORDER BY c.created_at DESC`,
      [customer.user_id]
    );

    // Get customer's documents
    const documentsResult = await query(
      `SELECT * FROM customer_documents
       WHERE customer_id = $1
       ORDER BY created_at DESC`,
      [customer.user_id]
    );

    res.json({
      success: true,
      data: {
        id: customer.id,
        userId: customer.user_id,
        fullName: customer.full_name,
        idNumber: customer.id_number,
        phone: customer.phone,
        email: customer.email,
        address: customer.address,
        dateOfBirth: customer.date_of_birth,
        isVerified: customer.is_verified,
        isActive: customer.is_active,
        createdAt: customer.user_created_at,
        policies: policiesResult.rows,
        claims: claimsResult.rows,
        documents: documentsResult.rows
      }
    });
  } catch (error) {
    console.error('Get staff customer profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get customer profile'
    });
  }
};

/**
 * Create a new customer (staff)
 * POST /api/staff/customers
 */
const createStaffCustomer = async (req, res) => {
  const client = await getClient();

  try {
    await client.query('BEGIN');

    const { fullName, email, phone, idNumber, address, dateOfBirth, password } = req.body;
    const staffUserId = req.user.id;
    const companyScope = req.companyScope;

    // Check if email already exists
    const existingUser = await client.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );
    if (existingUser.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Email already registered'
      });
    }

    // Hash password
    const bcrypt = require('bcryptjs');
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password || 'default123', salt);

    // Create user
    const userResult = await client.query(
      `INSERT INTO users (company_id, email, password_hash, role, phone, is_active)
       VALUES ($1, $2, $3, 'customer', $4, true)
       RETURNING id, email, role, phone, created_at`,
      [companyScope, email, passwordHash, phone]
    );
    const user = userResult.rows[0];

    // Create customer details
    await client.query(
      `INSERT INTO customer_details (user_id, full_name, id_number, phone, email, address, date_of_birth, is_verified)
       VALUES ($1, $2, $3, $4, $5, $6, $7, true)`,
      [user.id, fullName, idNumber, phone, email, address, dateOfBirth]
    );

    // Create audit log
    await client.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address)
       VALUES ($1, 'create_customer', 'customer', $2, $3, $4)`,
      [staffUserId, user.id, JSON.stringify({ email, fullName, idNumber }), req.ip]
    );

    await client.query('COMMIT');

    // Create notification for the new customer
    try {
      await client.query(
        `INSERT INTO notifications (user_id, type, title, message, entity_type, entity_id, action_url)
         VALUES ($1, 'in_app', 'Welcome to InsuraVault', 'Your account has been created by our staff team.', 'customer', $2, '/customer')`,
        [user.id, user.id]
      );
    } catch (notifyErr) {
      console.warn('Notification creation failed:', notifyErr.message);
    }

    res.status(201).json({
      success: true,
      message: 'Customer created successfully',
      data: {
        id: user.id,
        email: user.email,
        role: user.role,
        fullName
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create staff customer error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create customer'
    });
  } finally {
    client.release();
  }
};

/**
 * Get customer work history (tasks, claims, etc.)
 * GET /api/staff/customers/:id/history
 */
const getCustomerWorkHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const companyScope = req.companyScope;

    // Verify customer exists and is accessible
    const customerResult = await query(
      `SELECT cd.id, cd.user_id FROM customer_details cd
       JOIN users u ON cd.user_id = u.id
       WHERE cd.id = $1${companyScope ? ' AND u.company_id = $2' : ''}`,
      companyScope ? [id, companyScope] : [id]
    );

    if (customerResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    const userId = customerResult.rows[0].user_id;

    // Get tasks related to this customer
    const tasksResult = await query(
      `SELECT t.*, ta.employee_id, e.employee_number, u.email as assigned_email
       FROM tasks t
       LEFT JOIN task_assignments ta ON t.id = ta.task_id
       LEFT JOIN employees e ON ta.employee_id = e.id
       LEFT JOIN users u ON e.user_id = u.id
       WHERE t.created_by = $1 OR t.id IN (
         SELECT ta2.task_id FROM task_assignments ta2
         JOIN employees e2 ON ta2.employee_id = e2.id
         WHERE e2.user_id = $1
       )
       ORDER BY t.created_at DESC`,
      [userId]
    );

    // Get claims
    const claimsResult = await query(
      `SELECT c.*, p.policy_number
       FROM claims c
       LEFT JOIN policies p ON c.policy_id = p.id
       WHERE c.customer_id = $1
       ORDER BY c.created_at DESC`,
      [userId]
    );

    // Get audit logs for this customer
    const auditResult = await query(
      `SELECT al.*, u.email as actor_email
       FROM audit_logs al
       LEFT JOIN users u ON al.user_id = u.id
       WHERE al.entity_type = 'customer' AND al.entity_id = $1
       ORDER BY al.created_at DESC
       LIMIT 50`,
      [id]
    );

    res.json({
      success: true,
      data: {
        tasks: tasksResult.rows,
        claims: claimsResult.rows,
        auditLogs: auditResult.rows
      }
    });
  } catch (error) {
    console.error('Get customer work history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get customer work history'
    });
  }
};

/**
 * Search customers (quick search for staff)
 * GET /api/staff/customers/search?q=
 */
const searchCustomers = async (req, res) => {
  try {
    const { q } = req.query;
    const companyScope = req.companyScope;

    if (!q) {
      return res.json({ success: true, data: { customers: [] } });
    }

    let queryText = `
      SELECT cd.id, cd.user_id, cd.full_name, cd.id_number, cd.phone, cd.email, u.is_active
      FROM customer_details cd
      JOIN users u ON cd.user_id = u.id
      WHERE u.role = 'customer'
        AND (cd.full_name ILIKE $1 OR cd.id_number ILIKE $1 OR u.email ILIKE $1 OR cd.phone ILIKE $1)
    `;
    const params = [`%${q}%`];

    if (companyScope) {
      queryText += ` AND u.company_id = $2`;
      params.push(companyScope);
    }

    queryText += ' LIMIT 20';

    const result = await query(queryText, params);

    res.json({
      success: true,
      data: {
        customers: result.rows.map(c => ({
          id: c.id,
          userId: c.user_id,
          fullName: c.full_name,
          idNumber: c.id_number,
          phone: c.phone,
          email: c.email,
          isActive: c.is_active
        }))
      }
    });
  } catch (error) {
    console.error('Search customers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search customers'
    });
  }
};

module.exports = {
  getStaffCustomers,
  getStaffCustomerProfile,
  createStaffCustomer,
  getCustomerWorkHistory,
  searchCustomers
};
