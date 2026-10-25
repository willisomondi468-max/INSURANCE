const { query, getClient } = require('../config/db');
const { v4: uuidv4 } = require('uuid');

/**
 * Generate unique policy number
 */
const generatePolicyNumber = () => {
  const prefix = 'POL';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
};

/**
 * Get all policies (with filters for admin)
 * GET /api/policies
 */
const getAllPolicies = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, customerId, search } = req.query;
    const offset = (page - 1) * limit;

    let queryText = `
      SELECT p.*, ip.name as plan_name, ip.coverage_amount as plan_coverage,
             cd.full_name as customer_name, cd.id_number as customer_id_number
      FROM policies p
      LEFT JOIN insurance_plans ip ON p.plan_id = ip.id
      LEFT JOIN customer_details cd ON p.customer_id = cd.user_id
      WHERE 1=1
    `;
    const queryParams = [];
    let paramCount = 0;

    // Admin sees all, customers see only theirs
    if (req.user.role === 'customer') {
      paramCount++;
      queryText += ` AND p.customer_id = $${paramCount}`;
      queryParams.push(req.user.id);
    } else if (customerId) {
      paramCount++;
      queryText += ` AND p.customer_id = $${paramCount}`;
      queryParams.push(customerId);
    }

    if (status) {
      paramCount++;
      queryText += ` AND p.status = $${paramCount}`;
      queryParams.push(status);
    }

    if (search) {
      paramCount++;
      queryText += ` AND (p.policy_number ILIKE $${paramCount} OR cd.full_name ILIKE $${paramCount})`;
      queryParams.push(`%${search}%`);
    }

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) FROM (${queryText}) as filtered`,
      queryParams
    );
    const total = parseInt(countResult.rows[0].count);

    // Add pagination
    paramCount++;
    queryText += ` ORDER BY p.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    queryParams.push(limit, offset);

    const result = await query(queryText, queryParams);

    res.json({
      success: true,
      data: {
        policies: result.rows,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get all policies error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get policies'
    });
  }
};

/**
 * Get policy by ID
 * GET /api/policies/:id
 */
const getPolicyById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT p.*, ip.name as plan_name, ip.description as plan_description,
              ip.coverage_amount as plan_coverage, ip.premium_amount as plan_premium,
              ip.features as plan_features, cd.full_name as customer_name,
              cd.id_number as customer_id_number, cd.phone as customer_phone,
              cd.email as customer_email
       FROM policies p
       LEFT JOIN insurance_plans ip ON p.plan_id = ip.id
       LEFT JOIN customer_details cd ON p.customer_id = cd.user_id
       WHERE p.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Policy not found'
      });
    }

    const policy = result.rows[0];

    // Check access
    if (req.user.role === 'customer' && policy.customer_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Get related payments
    const paymentsResult = await query(
      'SELECT * FROM payments WHERE policy_id = $1 ORDER BY payment_date DESC',
      [id]
    );

    // Get related claims
    const claimsResult = await query(
      'SELECT * FROM claims WHERE policy_id = $1 ORDER BY created_at DESC',
      [id]
    );

    res.json({
      success: true,
      data: {
        ...policy,
        payments: paymentsResult.rows,
        claims: claimsResult.rows
      }
    });
  } catch (error) {
    console.error('Get policy by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get policy'
    });
  }
};

/**
 * Apply for a policy (Customer)
 * POST /api/policies
 */
const applyForPolicy = async (req, res) => {
  const client = await getClient();
  
  try {
    await client.query('BEGIN');

    const { planId, documents } = req.body;
    const customerId = req.user.id;

    // Get plan details
    const planResult = await client.query(
      'SELECT * FROM insurance_plans WHERE id = $1 AND is_active = true',
      [planId]
    );

    if (planResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Insurance plan not found or inactive'
      });
    }

    const plan = planResult.rows[0];

    // Generate policy number
    const policyNumber = generatePolicyNumber();

    // Calculate dates
    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + plan.duration_months);

    // Create policy
    const policyResult = await client.query(
      `INSERT INTO policies (customer_id, plan_id, policy_number, status, start_date, end_date, premium_amount, coverage_amount, documents)
       VALUES ($1, $2, $3, 'pending', $4, $5, $6, $7, $8)
       RETURNING *`,
      [customerId, planId, policyNumber, startDate, endDate, plan.premium_amount, plan.coverage_amount, JSON.stringify(documents || [])]
    );

    const policy = policyResult.rows[0];

    // Create audit log
    await client.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address)
       VALUES ($1, 'apply', 'policy', $2, $3, $4)`,
      [customerId, policy.id, JSON.stringify({ planId, policyNumber }), req.ip]
    );

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Policy application submitted successfully',
      data: policy
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Apply for policy error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to apply for policy'
    });
  } finally {
    client.release();
  }
};

/**
 * Update policy status (Admin/Provider)
 * PUT /api/policies/:id/status
 */
const updatePolicyStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Validate status
    const validStatuses = ['pending', 'approved', 'active', 'cancelled', 'expired'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    // Get current policy
    const policyResult = await query(
      'SELECT * FROM policies WHERE id = $1',
      [id]
    );

    if (policyResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Policy not found'
      });
    }

    const oldStatus = policyResult.rows[0].status;

    // Update status
    const result = await query(
      `UPDATE policies 
       SET status = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [status, id]
    );

    // Create audit log
    await query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address)
       VALUES ($1, 'update_status', 'policy', $2, $3, $4)`,
      [req.user.id, id, JSON.stringify({ oldStatus, newStatus: status }), req.ip]
    );

    // Create notification for customer
    await query(
      `INSERT INTO notifications (user_id, type, title, message)
       VALUES ($1, 'in_app', 'Policy Status Update', $2)`,
      [policyResult.rows[0].customer_id, `Your policy status has been updated from ${oldStatus} to ${status}`]
    );

    res.json({
      success: true,
      message: `Policy status updated to ${status}`,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Update policy status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update policy status'
    });
  }
};

/**
 * Delete policy (Admin only)
 * DELETE /api/policies/:id
 */
const deletePolicy = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      'DELETE FROM policies WHERE id = $1 RETURNING id, customer_id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Policy not found'
      });
    }

    // Create audit log
    await query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address)
       VALUES ($1, 'delete', 'policy', $2, $3, $4)`,
      [req.user.id, id, JSON.stringify({ deleted: true }), req.ip]
    );

    res.json({
      success: true,
      message: 'Policy deleted successfully'
    });
  } catch (error) {
    console.error('Delete policy error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete policy'
    });
  }
};

module.exports = {
  getAllPolicies,
  getPolicyById,
  applyForPolicy,
  updatePolicyStatus,
  deletePolicy
};
