const { query, getClient } = require('../config/db');
const { v4: uuidv4 } = require('uuid');

/**
 * Get current customer profile
 * GET /api/customers/profile
 */
const getProfile = async (req, res) => {
  try {
    const result = await query(
      `SELECT cd.*, u.email, u.phone, u.is_active, u.created_at as user_created_at
       FROM customer_details cd
       JOIN users u ON cd.user_id = u.id
       WHERE cd.user_id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Customer profile not found'
      });
    }

    const customer = result.rows[0];

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
        createdAt: customer.created_at
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get profile'
    });
  }
};

/**
 * Update customer profile
 * PUT /api/customers/profile
 */
const updateProfile = async (req, res) => {
  const client = await getClient();
  
  try {
    await client.query('BEGIN');

    const { fullName, phone, address, dateOfBirth } = req.body;
    const userId = req.user.id;

    // Update customer details
    const updateResult = await client.query(
      `UPDATE customer_details 
       SET full_name = COALESCE($1, full_name),
           phone = COALESCE($2, phone),
           address = COALESCE($3, address),
           date_of_birth = COALESCE($4, date_of_birth),
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $5
       RETURNING *`,
      [fullName, phone, address, dateOfBirth, userId]
    );

    if (updateResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    // Update user phone if provided
    if (phone) {
      await client.query(
        'UPDATE users SET phone = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [phone, userId]
      );
    }

    // Create audit log
    await client.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, details, ip_address)
       VALUES ($1, 'update_profile', 'customer_details', $2, $3)`,
      [userId, JSON.stringify(req.body), req.ip]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: updateResult.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile'
    });
  } finally {
    client.release();
  }
};

/**
 * Get all customers (Admin only)
 * GET /api/customers
 */
const getAllCustomers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, status } = req.query;
    const offset = (page - 1) * limit;

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
      queryText += ` AND (cd.full_name ILIKE $${paramCount} OR cd.id_number ILIKE $${paramCount} OR u.email ILIKE $${paramCount})`;
      queryParams.push(`%${search}%`);
    }

    if (status === 'active') {
      queryText += ' AND u.is_active = true';
    } else if (status === 'inactive') {
      queryText += ' AND u.is_active = false';
    }

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) FROM (${queryText}) as filtered`,
      queryParams
    );
    const total = parseInt(countResult.rows[0].count);

    // Add pagination
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
          createdAt: c.user_created_at
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
    console.error('Get all customers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get customers'
    });
  }
};

/**
 * Get customer by ID (Admin only)
 * GET /api/customers/:id
 */
const getCustomerById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT cd.*, u.email, u.phone, u.is_active, u.created_at as user_created_at,
              (SELECT COUNT(*) FROM policies p WHERE p.customer_id = u.id) as policy_count,
              (SELECT COUNT(*) FROM claims c WHERE c.customer_id = u.id) as claim_count
       FROM customer_details cd
       JOIN users u ON cd.user_id = u.id
       WHERE cd.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    const customer = result.rows[0];

    // Get customer's policies
    const policiesResult = await query(
      `SELECT p.*, ip.name as plan_name
       FROM policies p
       LEFT JOIN insurance_plans ip ON p.plan_id = ip.id
       WHERE p.customer_id = $1
       ORDER BY p.created_at DESC`,
      [customer.user_id]
    );

    // Get customer's claims
    const claimsResult = await query(
      'SELECT * FROM claims WHERE customer_id = $1 ORDER BY created_at DESC',
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
        claims: claimsResult.rows
      }
    });
  } catch (error) {
    console.error('Get customer by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get customer'
    });
  }
};

/**
 * Update customer status (Admin only)
 * PUT /api/customers/:id/status
 */
const updateCustomerStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    // Get customer user_id
    const customerResult = await query(
      'SELECT user_id FROM customer_details WHERE id = $1',
      [id]
    );

    if (customerResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    const userId = customerResult.rows[0].user_id;

    // Update user status
    await query(
      'UPDATE users SET is_active = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [isActive, userId]
    );

    // Create audit log
    await query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address)
       VALUES ($1, 'update_status', 'customer', $2, $3, $4)`,
      [req.user.id, id, JSON.stringify({ isActive }), req.ip]
    );

    res.json({
      success: true,
      message: `Customer ${isActive ? 'activated' : 'deactivated'} successfully`
    });
  } catch (error) {
    console.error('Update customer status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update customer status'
    });
  }
};

/**
 * Get customer dashboard statistics
 * GET /api/customers/dashboard
 */
const getCustomerDashboard = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get policy count
    const policyCountResult = await query(
      'SELECT COUNT(*) FROM policies WHERE customer_id = $1',
      [userId]
    );

    // Get active policies
    const activePoliciesResult = await query(
      `SELECT p.*, ip.name as plan_name, ip.coverage_amount
       FROM policies p
       LEFT JOIN insurance_plans ip ON p.plan_id = ip.id
       WHERE p.customer_id = $1 AND p.status = 'active'
       ORDER BY p.end_date DESC`,
      [userId]
    );

    // Get pending claims
    const pendingClaimsResult = await query(
      `SELECT c.*, p.policy_number
       FROM claims c
       LEFT JOIN policies p ON c.policy_id = p.id
       WHERE c.customer_id = $1 AND c.status IN ('pending', 'under_review')
       ORDER BY c.created_at DESC`,
      [userId]
    );

    // Get recent payments
    const paymentsResult = await query(
      `SELECT * FROM payments 
       WHERE customer_id = $1 
       ORDER BY payment_date DESC 
       LIMIT 5`,
      [userId]
    );

    // Get total paid
    const totalPaidResult = await query(
      `SELECT COALESCE(SUM(amount), 0) as total 
       FROM payments 
       WHERE customer_id = $1 AND status = 'completed'`,
      [userId]
    );

    // Get recent tickets
    const ticketsResult = await query(
      `SELECT * FROM tickets 
       WHERE customer_id = $1 
       ORDER BY created_at DESC 
       LIMIT 5`,
      [userId]
    );

    res.json({
      success: true,
      data: {
        stats: {
          totalPolicies: parseInt(policyCountResult.rows[0].count),
          activePolicies: activePoliciesResult.rows.length,
          pendingClaims: pendingClaimsResult.rows.length,
          totalPaid: parseFloat(totalPaidResult.rows[0].total)
        },
        activePolicies: activePoliciesResult.rows,
        pendingClaims: pendingClaimsResult.rows,
        recentPayments: paymentsResult.rows,
        recentTickets: ticketsResult.rows
      }
    });
  } catch (error) {
    console.error('Get customer dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get dashboard data'
    });
  }
};

module.exports = {
  getProfile,
  updateProfile,
  getAllCustomers,
  getCustomerById,
  updateCustomerStatus,
  getCustomerDashboard
};
