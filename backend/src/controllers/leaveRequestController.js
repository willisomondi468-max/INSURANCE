const { query, getClient } = require('../config/db');

/**
 * GET /api/leave-requests
 * List leave requests with filters
 * Access: HR Manager, Department Manager, Super Admin, Employee (self)
 */
const getLeaveRequests = async (req, res) => {
  try {
    const { page = 1, limit = 20, employeeId, status, startDate, endDate } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let queryText = `
      SELECT lr.*, e.employee_number, e.job_title, d.name as department_name,
             au.email as approved_by_email
      FROM leave_requests lr
      JOIN employees e ON lr.employee_id = e.id
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN users au ON lr.approved_by = au.id
      WHERE 1=1
    `;
    const queryParams = [];
    let paramCount = 0;

    if (employeeId) {
      paramCount++;
      queryText += ` AND lr.employee_id = $${paramCount}`;
      queryParams.push(employeeId);
    }
    if (status) {
      paramCount++;
      queryText += ` AND lr.approval_status = $${paramCount}`;
      queryParams.push(status);
    }
    if (startDate) {
      paramCount++;
      queryText += ` AND lr.start_date >= $${paramCount}`;
      queryParams.push(startDate);
    }
    if (endDate) {
      paramCount++;
      queryText += ` AND lr.end_date <= $${paramCount}`;
      queryParams.push(endDate);
    }

    const countResult = await query(
      `SELECT COUNT(*) FROM (${queryText}) as filtered`,
      queryParams
    );
    const total = parseInt(countResult.rows[0].count);

    paramCount++;
    queryText += ` ORDER BY lr.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    queryParams.push(limit, offset);

    const result = await query(queryText, queryParams);

    res.json({
      success: true,
      data: {
        leaveRequests: result.rows.map(r => ({
          id: r.id,
          employeeId: r.employee_id,
          employeeNumber: r.employee_number,
          jobTitle: r.job_title,
          departmentName: r.department_name,
          leaveType: r.leave_type,
          startDate: r.start_date,
          endDate: r.end_date,
          reason: r.reason,
          approvalStatus: r.approval_status,
          approvedBy: r.approved_by_email,
          createdAt: r.created_at
        })),
        pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / limit) }
      }
    });
  } catch (error) {
    console.error('Get leave requests error:', error);
    res.status(500).json({ success: false, message: 'Failed to get leave requests' });
  }
};

/**
 * POST /api/leave-requests
 * Create a leave request
 * Access: Employee
 */
const createLeaveRequest = async (req, res) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const { employeeId, leaveType, startDate, endDate, reason } = req.body;

    // Verify employee exists and belongs to user
    const empResult = await client.query(
      'SELECT id FROM employees WHERE user_id = $1 AND id = $2',
      [req.user.id, employeeId]
    );
    if (empResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Employee record not found or not authorized'
      });
    }

    const result = await client.query(
      `INSERT INTO leave_requests (employee_id, leave_type, start_date, end_date, reason, approval_status, created_at)
       VALUES ($1, $2, $3, $4, $5, 'pending', CURRENT_TIMESTAMP)
       RETURNING *`,
      [employeeId, leaveType, startDate, endDate, reason]
    );

    // Create audit log
    await client.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address)
       VALUES ($1, 'create', 'leave_request', $2, $3, $4)`,
      [req.user.id, result.rows[0].id, JSON.stringify(req.body), req.ip]
    );

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Leave request submitted successfully',
      data: { leaveRequestId: result.rows[0].id }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create leave request error:', error);
    res.status(500).json({ success: false, message: 'Failed to create leave request' });
  } finally {
    client.release();
  }
};

/**
 * PATCH /api/leave-requests/:id/approve
 * Approve or reject a leave request
 * Access: HR Manager, Department Manager, Super Admin
 */
const approveLeaveRequest = async (req, res) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const { decision } = req.body; // 'approved' | 'rejected'

    if (!['approved', 'rejected'].includes(decision)) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Decision must be approved or rejected'
      });
    }

    const result = await client.query(
      `UPDATE leave_requests
       SET approval_status = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND approval_status = 'pending'
       RETURNING *`,
      [decision, id]
    );

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Leave request not found or already reviewed'
      });
    }

    await client.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address)
       VALUES ($1, 'review', 'leave_request', $2, $3, $4)`,
      [req.user.id, id, JSON.stringify({ decision }), req.ip]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      message: `Leave request ${decision}`,
      data: { leaveRequestId: id, decision }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Approve leave request error:', error);
    res.status(500).json({ success: false, message: 'Failed to review leave request' });
  } finally {
    client.release();
  }
};

module.exports = {
  getLeaveRequests,
  createLeaveRequest,
  approveLeaveRequest
};
