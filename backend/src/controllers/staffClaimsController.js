const { query, getClient } = require('../config/db');

/**
 * Staff Claims Controller
 * Staff can create and update claims for customers
 */

/**
 * Get claims for a customer (staff view)
 * GET /api/staff/customers/:id/claims
 */
const getCustomerClaims = async (req, res) => {
  try {
    const { id } = req.params;
    const companyScope = req.companyScope;

    const customerResult = await query(
      `SELECT cd.user_id FROM customer_details cd
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

    const result = await query(
      `SELECT c.*, p.policy_number, ip.name as plan_name
       FROM claims c
       LEFT JOIN policies p ON c.policy_id = p.id
       LEFT JOIN insurance_plans ip ON p.plan_id = ip.id
       WHERE c.customer_id = $1
       ORDER BY c.created_at DESC`,
      [userId]
    );

    res.json({
      success: true,
      data: { claims: result.rows }
    });
  } catch (error) {
    console.error('Get customer claims error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get claims'
    });
  }
};

/**
 * Create a claim for a customer (staff)
 * POST /api/staff/customers/:id/claims
 */
const createCustomerClaim = async (req, res) => {
  const client = await getClient();

  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const { claimType, amountClaimed, description, documents, policyId } = req.body;
    const staffUserId = req.user.id;
    const companyScope = req.companyScope;

    const customerResult = await query(
      `SELECT cd.user_id FROM customer_details cd
       JOIN users u ON cd.user_id = u.id
       WHERE cd.id = $1${companyScope ? ' AND u.company_id = $2' : ''}`,
      companyScope ? [id, companyScope] : [id]
    );

    if (customerResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    const customerUserId = customerResult.rows[0].user_id;

    // Generate claim number
    const claimNumber = `CLM-${Date.now()}`;

    const claimResult = await client.query(
      `INSERT INTO claims (claim_number, customer_id, policy_id, claim_type, amount_claimed, description, documents, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
       RETURNING *`,
      [claimNumber, customerUserId, policyId || null, claimType, amountClaimed, description, documents || '[]']
    );

    // Create audit log
    await client.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address)
       VALUES ($1, 'create_claim', 'claim', $2, $3, $4)`,
      [staffUserId, claimResult.rows[0].id, JSON.stringify({ claimType, amountClaimed, claimNumber }), req.ip]
    );

    // Create notification for customer
    await client.query(
      `INSERT INTO notifications (user_id, type, title, message, entity_type, entity_id, action_url)
       VALUES ($1, 'in_app', 'New Claim Filed', 'A new claim has been filed on your behalf.', 'claim', $2, '/customer/claims')`,
      [customerUserId, claimResult.rows[0].id]
    );

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Claim created successfully',
      data: { claim: claimResult.rows[0] }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create claim error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create claim'
    });
  } finally {
    client.release();
  }
};

/**
 * Update claim status (staff)
 * PUT /api/staff/claims/:id/status
 */
const updateClaimStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    const staffUserId = req.user.id;
    const companyScope = req.companyScope;

    const validStatuses = ['pending', 'under_review', 'approved', 'rejected', 'paid'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid claim status'
      });
    }

    let queryText = `UPDATE claims SET status = $1, updated_at = CURRENT_TIMESTAMP`;
    const params = [status];
    let paramCount = 1;

    if (notes !== undefined) {
      paramCount++;
      queryText += `, notes = $${paramCount}`;
      params.push(notes);
    }

    paramCount++;
    queryText += ` WHERE id = $${paramCount}`;
    params.push(id);

    const result = await query(queryText, params);

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Claim not found'
      });
    }

    // Create audit log
    await query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address)
       VALUES ($1, $2, 'claim', $3, $4, $5)`,
      [staffUserId, 'update_claim_status', id, JSON.stringify({ status, notes }), req.ip]
    );

    res.json({
      success: true,
      message: `Claim status updated to ${status} successfully`
    });
  } catch (error) {
    console.error('Update claim status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update claim status'
    });
  }
};

module.exports = {
  getCustomerClaims,
  createCustomerClaim,
  updateClaimStatus
};
