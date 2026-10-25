const { query, getClient } = require('../config/db');
const { v4: uuidv4 } = require('uuid');

/**
 * Generate unique claim number
 */
const generateClaimNumber = () => {
  const prefix = 'CLM';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
};

/**
 * Get all claims (with filters)
 * GET /api/claims
 */
const getAllClaims = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, customerId, policyId, search } = req.query;
    const offset = (page - 1) * limit;

    let queryText = `
      SELECT c.*, p.policy_number, ip.name as plan_name,
             cd.full_name as customer_name
      FROM claims c
      LEFT JOIN policies p ON c.policy_id = p.id
      LEFT JOIN insurance_plans ip ON p.plan_id = ip.id
      LEFT JOIN customer_details cd ON c.customer_id = cd.user_id
      WHERE 1=1
    `;
    const queryParams = [];
    let paramCount = 0;

    // Admin sees all, customers see only theirs
    if (req.user.role === 'customer') {
      paramCount++;
      queryText += ` AND c.customer_id = $${paramCount}`;
      queryParams.push(req.user.id);
    } else if (customerId) {
      paramCount++;
      queryText += ` AND c.customer_id = $${paramCount}`;
      queryParams.push(customerId);
    }

    if (policyId) {
      paramCount++;
      queryText += ` AND c.policy_id = $${paramCount}`;
      queryParams.push(policyId);
    }

    if (status) {
      paramCount++;
      queryText += ` AND c.status = $${paramCount}`;
      queryParams.push(status);
    }

    // Optional text search: claim number or customer name
    if (search) {
      paramCount++;
      queryText += ` AND (c.claim_number ILIKE $${paramCount} OR cd.full_name ILIKE $${paramCount})`;
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
    queryText += ` ORDER BY c.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    queryParams.push(limit, offset);

    const result = await query(queryText, queryParams);

    res.json({
      success: true,
      data: {
        claims: result.rows,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get all claims error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get claims'
    });
  }
};

/**
 * Get claim by ID
 * GET /api/claims/:id
 */
const getClaimById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT c.*, p.policy_number, ip.name as plan_name,
              cd.full_name as customer_name, cd.phone as customer_phone,
              cd.email as customer_email
       FROM claims c
       LEFT JOIN policies p ON c.policy_id = p.id
       LEFT JOIN insurance_plans ip ON p.plan_id = ip.id
       LEFT JOIN customer_details cd ON c.customer_id = cd.user_id
       WHERE c.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Claim not found'
      });
    }

    const claim = result.rows[0];

    // Check access
    if (req.user.role === 'customer' && claim.customer_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: claim
    });
  } catch (error) {
    console.error('Get claim by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get claim'
    });
  }
};

/**
 * Submit a claim (Customer)
 * POST /api/claims
 */
const submitClaim = async (req, res) => {
  const client = await getClient();
  
  try {
    await client.query('BEGIN');

    const { policyId, claimType, amountClaimed, description, documents } = req.body;
    const customerId = req.user.id;

    // Verify policy belongs to customer and is active
    const policyResult = await client.query(
      `SELECT * FROM policies 
       WHERE id = $1 AND customer_id = $2 AND status = 'active'`,
      [policyId, customerId]
    );

    if (policyResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Active policy not found'
      });
    }

    const policy = policyResult.rows[0];

    // Generate claim number
    const claimNumber = generateClaimNumber();

    // Create claim
    const claimResult = await client.query(
      `INSERT INTO claims (policy_id, customer_id, claim_number, claim_type, amount_claimed, description, documents, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
       RETURNING *`,
      [policyId, customerId, claimNumber, claimType, amountClaimed, description, JSON.stringify(documents || [])]
    );

    const claim = claimResult.rows[0];

    // Create audit log
    await client.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address)
       VALUES ($1, 'submit', 'claim', $2, $3, $4)`,
      [customerId, claim.id, JSON.stringify({ policyId, claimNumber }), req.ip]
    );

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Claim submitted successfully',
      data: claim
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Submit claim error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit claim'
    });
  } finally {
    client.release();
  }
};

/**
 * Update claim status (Admin/Provider)
 * PUT /api/claims/:id/status
 */
const updateClaimStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    // Validate status
    const validStatuses = ['pending', 'under_review', 'approved', 'rejected', 'paid'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    // Get current claim
    const claimResult = await query(
      'SELECT * FROM claims WHERE id = $1',
      [id]
    );

    if (claimResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Claim not found'
      });
    }

    const oldStatus = claimResult.rows[0].status;

    // Update status and notes
    const result = await query(
      `UPDATE claims 
       SET status = $1, 
           notes = COALESCE($2, notes),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [status, notes, id]
    );

    // Create audit log
    await query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address)
       VALUES ($1, 'update_status', 'claim', $2, $3, $4)`,
      [req.user.id, id, JSON.stringify({ oldStatus, newStatus: status, notes }), req.ip]
    );

    // Create notification for customer
    await query(
      `INSERT INTO notifications (user_id, type, title, message)
       VALUES ($1, 'in_app', 'Claim Status Update', $2)`,
      [claimResult.rows[0].customer_id, `Your claim status has been updated from ${oldStatus} to ${status}`]
    );

    res.json({
      success: true,
      message: `Claim status updated to ${status}`,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Update claim status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update claim status'
    });
  }
};

/**
 * Delete claim (Admin only)
 * DELETE /api/claims/:id
 */
const deleteClaim = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      'DELETE FROM claims WHERE id = $1 RETURNING id, customer_id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Claim not found'
      });
    }

    // Create audit log
    await query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address)
       VALUES ($1, 'delete', 'claim', $2, $3, $4)`,
      [req.user.id, id, JSON.stringify({ deleted: true }), req.ip]
    );

    res.json({
      success: true,
      message: 'Claim deleted successfully'
    });
  } catch (error) {
    console.error('Delete claim error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete claim'
    });
  }
};

module.exports = {
  getAllClaims,
  getClaimById,
  submitClaim,
  updateClaimStatus,
  deleteClaim
};
