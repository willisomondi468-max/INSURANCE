const { query } = require('../config/db');

/**
 * Get all insurance plans
 * GET /api/plans
 */
const getAllPlans = async (req, res) => {
  try {
    const { page = 1, limit = 10, active } = req.query;
    const offset = (page - 1) * limit;

    let queryText = 'SELECT * FROM insurance_plans WHERE 1=1';
    const queryParams = [];

    if (active !== undefined) {
      queryText += ' AND is_active = $1';
      queryParams.push(active === 'true');
    }

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) FROM (${queryText}) as filtered`,
      queryParams
    );
    const total = parseInt(countResult.rows[0].count);

    // Add pagination
    queryText += ' ORDER BY created_at DESC LIMIT $' + (queryParams.length + 1) + ' OFFSET $' + (queryParams.length + 2);
    queryParams.push(limit, offset);

    const result = await query(queryText, queryParams);

    res.json({
      success: true,
      data: {
        plans: result.rows,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get all plans error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get insurance plans'
    });
  }
};

/**
 * Get insurance plan by ID
 * GET /api/plans/:id
 */
const getPlanById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      'SELECT * FROM insurance_plans WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Insurance plan not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Get plan by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get insurance plan'
    });
  }
};

/**
 * Create insurance plan (Admin only)
 * POST /api/plans
 */
const createPlan = async (req, res) => {
  try {
    const { name, description, coverageAmount, premiumAmount, durationMonths, features, isActive } = req.body;

    const result = await query(
      `INSERT INTO insurance_plans (name, description, coverage_amount, premium_amount, duration_months, features, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [name, description, coverageAmount, premiumAmount, durationMonths, JSON.stringify(features), isActive ?? true]
    );

    // Create audit log
    await query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address)
       VALUES ($1, 'create', 'insurance_plan', $2, $3, $4)`,
      [req.user.id, result.rows[0].id, JSON.stringify(req.body), req.ip]
    );

    res.status(201).json({
      success: true,
      message: 'Insurance plan created successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Create plan error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create insurance plan'
    });
  }
};

/**
 * Update insurance plan (Admin only)
 * PUT /api/plans/:id
 */
const updatePlan = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, coverageAmount, premiumAmount, durationMonths, features, isActive } = req.body;

    const result = await query(
      `UPDATE insurance_plans 
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           coverage_amount = COALESCE($3, coverage_amount),
           premium_amount = COALESCE($4, premium_amount),
           duration_months = COALESCE($5, duration_months),
           features = COALESCE($6, features),
           is_active = COALESCE($7, is_active),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $8
       RETURNING *`,
      [name, description, coverageAmount, premiumAmount, durationMonths, features ? JSON.stringify(features) : null, isActive, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Insurance plan not found'
      });
    }

    // Create audit log
    await query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address)
       VALUES ($1, 'update', 'insurance_plan', $2, $3, $4)`,
      [req.user.id, id, JSON.stringify(req.body), req.ip]
    );

    res.json({
      success: true,
      message: 'Insurance plan updated successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Update plan error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update insurance plan'
    });
  }
};

/**
 * Delete insurance plan (Admin only)
 * DELETE /api/plans/:id
 */
const deletePlan = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if plan is in use
    const policyCheck = await query(
      'SELECT COUNT(*) FROM policies WHERE plan_id = $1',
      [id]
    );

    if (parseInt(policyCheck.rows[0].count) > 0) {
      // Instead of deleting, deactivate
      await query(
        'UPDATE insurance_plans SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
        [id]
      );
      
      return res.json({
        success: true,
        message: 'Plan deactivated (in use by existing policies)'
      });
    }

    const result = await query(
      'DELETE FROM insurance_plans WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Insurance plan not found'
      });
    }

    // Create audit log
    await query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address)
       VALUES ($1, 'delete', 'insurance_plan', $2, $3, $4)`,
      [req.user.id, id, JSON.stringify({ deleted: true }), req.ip]
    );

    res.json({
      success: true,
      message: 'Insurance plan deleted successfully'
    });
  } catch (error) {
    console.error('Delete plan error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete insurance plan'
    });
  }
};

module.exports = {
  getAllPlans,
  getPlanById,
  createPlan,
  updatePlan,
  deletePlan
};
