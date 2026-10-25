const { query, getClient } = require('../config/db');
const { v4: uuidv4 } = require('uuid');

/**
 * Generate unique transaction ID
 */
const generateTransactionId = () => {
  return 'TXN-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substring(2, 8).toUpperCase();
};

/**
 * Get all payments (with filters)
 * GET /api/payments
 */
const getAllPayments = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, customerId, policyId } = req.query;
    const offset = (page - 1) * limit;

    let queryText = `
      SELECT pay.*, p.policy_number, cd.full_name as customer_name
      FROM payments pay
      LEFT JOIN policies p ON pay.policy_id = p.id
      LEFT JOIN customer_details cd ON pay.customer_id = cd.user_id
      WHERE 1=1
    `;
    const queryParams = [];
    let paramCount = 0;

    // Admin sees all, customers see only theirs
    if (req.user.role === 'customer') {
      paramCount++;
      queryText += ` AND pay.customer_id = $${paramCount}`;
      queryParams.push(req.user.id);
    } else if (customerId) {
      paramCount++;
      queryText += ` AND pay.customer_id = $${paramCount}`;
      queryParams.push(customerId);
    }

    if (policyId) {
      paramCount++;
      queryText += ` AND pay.policy_id = $${paramCount}`;
      queryParams.push(policyId);
    }

    if (status) {
      paramCount++;
      queryText += ` AND pay.status = $${paramCount}`;
      queryParams.push(status);
    }

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) FROM (${queryText}) as filtered`,
      queryParams
    );
    const total = parseInt(countResult.rows[0].count);

    // Add pagination
    paramCount++;
    queryText += ` ORDER BY pay.payment_date DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    queryParams.push(limit, offset);

    const result = await query(queryText, queryParams);

    res.json({
      success: true,
      data: {
        payments: result.rows,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get all payments error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get payments'
    });
  }
};

/**
 * Get payment by ID
 * GET /api/payments/:id
 */
const getPaymentById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT pay.*, p.policy_number, ip.name as plan_name,
              cd.full_name as customer_name
       FROM payments pay
       LEFT JOIN policies p ON pay.policy_id = p.id
       LEFT JOIN insurance_plans ip ON p.plan_id = ip.id
       LEFT JOIN customer_details cd ON pay.customer_id = cd.user_id
       WHERE pay.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    const payment = result.rows[0];

    // Check access
    if (req.user.role === 'customer' && payment.customer_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: payment
    });
  } catch (error) {
    console.error('Get payment by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get payment'
    });
  }
};

/**
 * Process payment (Customer)
 * POST /api/payments
 */
const processPayment = async (req, res) => {
  const client = await getClient();
  
  try {
    await client.query('BEGIN');

    const { policyId, amount, paymentMethod } = req.body;
    const customerId = req.user.id;

    // Verify policy belongs to customer
    const policyResult = await client.query(
      `SELECT * FROM policies 
       WHERE id = $1 AND customer_id = $2`,
      [policyId, customerId]
    );

    if (policyResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Policy not found'
      });
    }

    // Generate transaction ID
    const transactionId = generateTransactionId();

    // Create payment record
    const paymentResult = await client.query(
      `INSERT INTO payments (customer_id, policy_id, amount, payment_method, transaction_id, status, payment_date)
       VALUES ($1, $2, $3, $4, $5, 'completed', CURRENT_TIMESTAMP)
       RETURNING *`,
      [customerId, policyId, amount, paymentMethod, transactionId]
    );

    const payment = paymentResult.rows[0];

    // Create audit log
    await client.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address)
       VALUES ($1, 'payment', 'payment', $2, $3, $4)`,
      [customerId, payment.id, JSON.stringify({ policyId, amount, transactionId }), req.ip]
    );

    // Update policy status to active if pending
    await client.query(
      `UPDATE policies SET status = 'active', updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1 AND status = 'approved'`,
      [policyId]
    );

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Payment processed successfully',
      data: payment
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Process payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process payment'
    });
  } finally {
    client.release();
  }
};

/**
 * Get payment history for customer
 * GET /api/payments/history
 */
const getPaymentHistory = async (req, res) => {
  try {
    const customerId = req.user.id;

    const result = await query(
      `SELECT pay.*, p.policy_number, ip.name as plan_name
       FROM payments pay
       LEFT JOIN policies p ON pay.policy_id = p.id
       LEFT JOIN insurance_plans ip ON p.plan_id = ip.id
       WHERE pay.customer_id = $1
       ORDER BY pay.payment_date DESC`,
      [customerId]
    );

    // Calculate totals
    const totalsResult = await query(
      `SELECT 
         COUNT(*) as total_payments,
         COALESCE(SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END), 0) as total_paid,
         COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) as total_pending
       FROM payments 
       WHERE customer_id = $1`,
      [customerId]
    );

    res.json({
      success: true,
      data: {
        payments: result.rows,
        summary: {
          totalPayments: parseInt(totalsResult.rows[0].total_payments),
          totalPaid: parseFloat(totalsResult.rows[0].total_paid),
          totalPending: parseFloat(totalsResult.rows[0].total_pending)
        }
      }
    });
  } catch (error) {
    console.error('Get payment history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get payment history'
    });
  }
};

module.exports = {
  getAllPayments,
  getPaymentById,
  processPayment,
  getPaymentHistory
};
