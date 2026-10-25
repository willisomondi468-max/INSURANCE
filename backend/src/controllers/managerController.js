const { query } = require('../config/db');

/**
 * Manager Dashboard Controller
 * Department-scoped management views
 */

/**
 * Get manager dashboard overview
 * GET /api/manager/dashboard
 */
const getManagerDashboard = async (req, res) => {
  try {
    const userId = req.user.id;
    const companyScope = req.companyScope;
    const departmentId = req.query.departmentId;

    // Get manager's department(s)
    const deptResult = await query(
      `SELECT d.id, d.name, d.manager_id, d.status, d.monthly_target,
              COUNT(e.id) as employee_count
       FROM departments d
       LEFT JOIN employees e ON d.id = e.department_id
       WHERE (d.manager_id = $1 OR $2 IS NULL)
         ${departmentId ? 'AND d.id = $3' : ''}
       GROUP BY d.id, d.name, d.manager_id, d.status, d.monthly_target`,
      [userId, companyScope ? companyScope : null, departmentId]
    );

    const departments = deptResult.rows;

    // Get department IDs for scoping
    const deptIds = departments.map(d => d.id);

    // Get employees in manager's departments
    let empQuery = `
      SELECT e.id, e.employee_number, e.job_title, e.employment_status,
             u.email, u.phone, u.is_active, u.created_at,
             d.name as department_name, d.id as department_id
      FROM employees e
      JOIN users u ON e.user_id = u.id
      LEFT JOIN departments d ON e.department_id = d.id
      WHERE 1=1
    `;
    const empParams = [];
    let paramCount = 0;

    if (deptIds.length > 0) {
      paramCount++;
      empQuery += ` AND e.department_id = ANY($${paramCount})`;
      empParams.push(deptIds);
    }

    if (companyScope) {
      paramCount++;
      empQuery += ` AND u.company_id = $${paramCount}`;
      empParams.push(companyScope);
    }

    const empResult = await query(empQuery, empParams);
    const employees = empResult.rows;

    // Get attendance stats for today
    const today = new Date().toISOString().split('T')[0];
    const attendanceStats = await query(
      `SELECT
         COUNT(*) as total_employees,
         COUNT(CASE WHEN ar.clock_in_at IS NOT NULL THEN 1 END) as clocked_in,
         COUNT(CASE WHEN ar.clock_out_at IS NOT NULL THEN 1 END) as clocked_out,
         COUNT(CASE WHEN ar.attendance_status = 'late' THEN 1 END) as late_arrivals,
         COUNT(CASE WHEN ar.attendance_status = 'absent' THEN 1 END) as absences
       FROM attendance_records ar
       JOIN employees e ON ar.employee_id = e.id
       WHERE ar.created_at::date = $1
         ${deptIds.length > 0 ? 'AND e.department_id = ANY($2)' : ''}
         ${companyScope ? ` AND u.company_id = $${deptIds.length > 0 ? 3 : 2}` : ''}`,
      [today, ...(deptIds.length > 0 ? [deptIds] : []), ...(companyScope ? [companyScope] : [])]
    );

    // Get task stats
    const taskStats = await query(
      `SELECT
         COUNT(*) as total_tasks,
         COUNT(CASE WHEN t.status = 'completed' THEN 1 END) as completed_tasks,
         COUNT(CASE WHEN t.status = 'in_progress' THEN 1 END) as in_progress_tasks,
         COUNT(CASE WHEN t.status = 'pending' THEN 1 END) as pending_tasks,
         COUNT(CASE WHEN t.status = 'overdue' THEN 1 END) as overdue_tasks
       FROM tasks t
       WHERE 1=1
         ${deptIds.length > 0 ? 'AND t.department_id = ANY($1)' : ''}
         ${companyScope ? ` AND t.company_id = $${deptIds.length > 0 ? 2 : 1}` : ''}`,
      [deptIds.length > 0 ? deptIds : null, ...(companyScope ? [companyScope] : [])]
    );

    // Get recent attendance corrections pending approval
    const pendingCorrections = await query(
      `SELECT aa.*, u.email as requester_email, e.employee_number
       FROM attendance_adjustments aa
       JOIN users u ON aa.requested_by = u.id
       JOIN employees e ON u.id = e.user_id
       WHERE aa.status = 'pending'
         ${deptIds.length > 0 ? 'AND e.department_id = ANY($1)' : ''}
         ${companyScope ? ` AND u.company_id = $${deptIds.length > 0 ? 2 : 1}` : ''}
       ORDER BY aa.created_at DESC
       LIMIT 10`,
      [deptIds.length > 0 ? deptIds : null, ...(companyScope ? [companyScope] : [])]
    );

    // Get leave requests pending approval
    const pendingLeaves = await query(
      `SELECT lr.*, u.email as employee_email, e.employee_number
       FROM leave_requests lr
       JOIN employees e ON lr.employee_id = e.id
       JOIN users u ON e.user_id = u.id
       WHERE lr.approval_status = 'pending'
         ${deptIds.length > 0 ? 'AND e.department_id = ANY($1)' : ''}
         ${companyScope ? ` AND u.company_id = $${deptIds.length > 0 ? 2 : 1}` : ''}
       ORDER BY lr.created_at DESC
       LIMIT 10`,
      [deptIds.length > 0 ? deptIds : null, ...(companyScope ? [companyScope] : [])]
    );

    res.json({
      success: true,
      data: {
        departments,
        employees: employees.length,
        attendance: attendanceStats.rows[0],
        tasks: taskStats.rows[0],
        pendingCorrections: pendingCorrections.rows,
        pendingLeaves: pendingLeaves.rows
      }
    });
  } catch (error) {
    console.error('Get manager dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get manager dashboard'
    });
  }
};

/**
 * Get team attendance records
 * GET /api/manager/attendance
 */
const getTeamAttendance = async (req, res) => {
  try {
    const { page = 1, limit = 50, startDate, endDate, employeeId, status } = req.query;
    const offset = (page - 1) * limit;
    const companyScope = req.companyScope;

    // Get manager's departments
    const deptResult = await query(
      `SELECT id FROM departments WHERE manager_id = $1`,
      [req.user.id]
    );
    const deptIds = deptResult.rows.map(d => d.id);

    let queryText = `
      SELECT ar.*, e.employee_number, e.job_title,
             u.email, u.full_name,
             d.name as department_name
      FROM attendance_records ar
      JOIN employees e ON ar.employee_id = e.id
      JOIN users u ON e.user_id = u.id
      LEFT JOIN departments d ON e.department_id = d.id
      WHERE e.department_id = ANY($1)
    `;
    const params = [deptIds.length > 0 ? deptIds : []];
    let paramCount = 1;

    if (startDate) {
      paramCount++;
      queryText += ` AND ar.created_at::date >= $${paramCount}`;
      params.push(startDate);
    }

    if (endDate) {
      paramCount++;
      queryText += ` AND ar.created_at::date <= $${paramCount}`;
      params.push(endDate);
    }

    if (employeeId) {
      paramCount++;
      queryText += ` AND ar.employee_id = $${paramCount}`;
      params.push(employeeId);
    }

    if (status) {
      paramCount++;
      queryText += ` AND ar.attendance_status = $${paramCount}`;
      params.push(status);
    }

    if (companyScope) {
      paramCount++;
      queryText += ` AND u.company_id = $${paramCount}`;
      params.push(companyScope);
    }

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) FROM (${queryText}) as filtered`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    // Add pagination
    paramCount++;
    queryText += ` ORDER BY ar.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);

    const result = await query(queryText, params);

    res.json({
      success: true,
      data: {
        attendance: result.rows,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get team attendance error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get team attendance'
    });
  }
};

/**
 * Get team task summary
 * GET /api/manager/tasks
 */
const getTeamTasks = async (req, res) => {
  try {
    const { page = 1, limit = 50, status, priority, employeeId } = req.query;
    const offset = (page - 1) * limit;
    const companyScope = req.companyScope;

    const deptResult = await query(
      `SELECT id FROM departments WHERE manager_id = $1`,
      [req.user.id]
    );
    const deptIds = deptResult.rows.map(d => d.id);

    let queryText = `
      SELECT t.*, e.employee_number, e.job_title, u.email as assigned_email,
             d.name as department_name
      FROM tasks t
      LEFT JOIN task_assignments ta ON t.id = ta.task_id
      LEFT JOIN employees e ON ta.employee_id = e.id
      LEFT JOIN users u ON e.user_id = u.id
      LEFT JOIN departments d ON t.department_id = d.id
      WHERE t.department_id = ANY($1)
    `;
    const params = [deptIds.length > 0 ? deptIds : []];
    let paramCount = 1;

    if (status) {
      paramCount++;
      queryText += ` AND t.status = $${paramCount}`;
      params.push(status);
    }

    if (priority) {
      paramCount++;
      queryText += ` AND t.priority = $${paramCount}`;
      params.push(priority);
    }

    if (employeeId) {
      paramCount++;
      queryText += ` AND ta.employee_id = $${paramCount}`;
      params.push(employeeId);
    }

    if (companyScope) {
      paramCount++;
      queryText += ` AND t.company_id = $${paramCount}`;
      params.push(companyScope);
    }

    const countResult = await query(
      `SELECT COUNT(*) FROM (${queryText}) as filtered`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    paramCount++;
    queryText += ` ORDER BY t.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);

    const result = await query(queryText, params);

    res.json({
      success: true,
      data: {
        tasks: result.rows,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get team tasks error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get team tasks'
    });
  }
};

/**
 * Approve or reject attendance correction
 * POST /api/manager/attendance-corrections/:id/approve
 */
const approveAttendanceCorrection = async (req, res) => {
  try {
    const { id } = req.params;
    const { approved, reason } = req.body;
    const managerId = req.user.id;

    const correctionResult = await query(
      'SELECT * FROM attendance_adjustments WHERE id = $1 AND status = $2',
      [id, 'pending']
    );

    if (correctionResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Pending correction not found'
      });
    }

    const correction = correctionResult.rows[0];

    await query(
      `UPDATE attendance_adjustments
       SET status = $1, reviewed_by = $2, reviewed_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [approved ? 'approved' : 'rejected', managerId, id]
    );

    // If approved, apply the changes to the attendance record
    if (approved) {
      const proposedValues = correction.proposed_values || {};
      const updates = [];
      const values = [];
      let paramCount = 0;

      if (proposedValues.clock_in_at) {
        paramCount++;
        updates.push(`clock_in_at = $${paramCount}`);
        values.push(proposedValues.clock_in_at);
      }
      if (proposedValues.clock_out_at) {
        paramCount++;
        updates.push(`clock_out_at = $${paramCount}`);
        values.push(proposedValues.clock_out_at);
      }
      if (proposedValues.attendance_status) {
        paramCount++;
        updates.push(`attendance_status = $${paramCount}`);
        values.push(proposedValues.attendance_status);
      }

      if (updates.length > 0) {
        paramCount++;
        updates.push(`updated_at = CURRENT_TIMESTAMP`);
        values.push(correction.attendance_record_id);
        await query(
          `UPDATE attendance_records SET ${updates.join(', ')} WHERE id = $${paramCount}`,
          values
        );
      }
    }

    // Create audit log
    await query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address)
       VALUES ($1, $2, 'attendance_adjustment', $3, $4, $5)`,
      [managerId, approved ? 'approve_correction' : 'reject_correction', id,
       JSON.stringify({ reason, approved }), req.ip]
    );

    res.json({
      success: true,
      message: `Correction ${approved ? 'approved' : 'rejected'} successfully`
    });
  } catch (error) {
    console.error('Approve attendance correction error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process correction'
    });
  }
};

/**
 * Approve or reject leave request
 * POST /api/manager/leave-requests/:id/approve
 */
const approveLeaveRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { approved, reason } = req.body;
    const managerId = req.user.id;

    const leaveResult = await query(
      'SELECT * FROM leave_requests WHERE id = $1 AND approval_status = $2',
      [id, 'pending']
    );

    if (leaveResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Pending leave request not found'
      });
    }

    await query(
      `UPDATE leave_requests
       SET approval_status = $1, approved_by = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [approved ? 'approved' : 'rejected', managerId, id]
    );

    // Create audit log
    await query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address)
       VALUES ($1, $2, 'leave_request', $3, $4, $5)`,
      [managerId, approved ? 'approve_leave' : 'reject_leave', id,
       JSON.stringify({ reason, approved }), req.ip]
    );

    res.json({
      success: true,
      message: `Leave request ${approved ? 'approved' : 'rejected'} successfully`
    });
  } catch (error) {
    console.error('Approve leave request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process leave request'
    });
  }
};

module.exports = {
  getManagerDashboard,
  getTeamAttendance,
  getTeamTasks,
  approveAttendanceCorrection,
  approveLeaveRequest
};
