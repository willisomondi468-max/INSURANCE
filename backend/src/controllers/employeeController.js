const { query, getClient } = require('../config/db');
const { v4: uuidv4 } = require('uuid');
const { applyCompanyScope } = require('../middleware/auth');

/**
 * Helper: format employee row for API response
 */
const formatEmployee = (row) => ({
  id: row.id,
  userId: row.user_id,
  employeeNumber: row.employee_number,
  departmentId: row.department_id,
  supervisorId: row.supervisor_id,
  companyId: row.company_id,
  jobTitle: row.job_title,
  employmentStatus: row.employment_status,
  startDate: row.start_date,
  timezone: row.timezone,
  contractedHours: row.contracted_hours,
  monthlyPerformanceTarget: row.monthly_performance_target,
  profilePhotoUrl: row.profile_photo_url,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

/**
 * Helper: check if an employee has dependent records that prevent deletion
 */
const hasDependentRecords = async (employeeId, companyScope) => {
  const checks = [
    `SELECT COUNT(*) as cnt FROM attendance_records WHERE employee_id = $1`,
    `SELECT COUNT(*) as cnt FROM task_assignments WHERE employee_id = $1`,
    `SELECT COUNT(*) as cnt FROM leave_requests WHERE employee_id = $1`,
    `SELECT COUNT(*) as cnt FROM task_reviews WHERE reviewer_id = $1`,
    `SELECT COUNT(*) as cnt FROM performance_targets WHERE employee_id = $1`
  ];
  for (const sql of checks) {
    const result = await query(sql, [employeeId]);
    if (parseInt(result.rows[0].cnt) > 0) return true;
  }
  return false;
};

/**
 * GET /api/employees
 * List employees with search, filter, pagination
 * Company-scoped unless system_admin
 */
const getAllEmployees = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, status, departmentId, role } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const companyScope = req.user.role === 'system_admin' ? null : req.user.company_id;

    let queryText = `
      SELECT e.*, d.name as department_name, s.employee_number as supervisor_number,
             su.email as supervisor_name
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN employees s ON e.supervisor_id = s.id
      LEFT JOIN users su ON s.user_id = su.id
      WHERE 1=1
    `;
    const queryParams = [];
    let paramCount = 0;

    // Apply company scope
    if (companyScope) {
      paramCount++;
      queryText += ` AND e.company_id = $${paramCount}`;
      queryParams.push(companyScope);
    }

    if (search) {
      paramCount++;
      queryText += ` AND (e.employee_number ILIKE $${paramCount} OR e.job_title ILIKE $${paramCount})`;
      queryParams.push(`%${search}%`);
    }

    if (status) {
      paramCount++;
      queryText += ` AND e.employment_status = $${paramCount}`;
      queryParams.push(status);
    }

    if (departmentId) {
      paramCount++;
      queryText += ` AND e.department_id = $${paramCount}`;
      queryParams.push(departmentId);
    }

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) FROM (${queryText}) as filtered`,
      queryParams
    );
    const total = parseInt(countResult.rows[0].count);

    // Add ordering and pagination
    paramCount++;
    queryText += ` ORDER BY e.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    queryParams.push(limit, offset);

    const result = await query(queryText, queryParams);

    // Enrich with department and supervisor info
    const employees = result.rows.map(row => {
      const emp = formatEmployee(row);
      emp.departmentName = row.department_name;
      emp.supervisorName = row.supervisor_name;
      emp.supervisorEmployeeNumber = row.supervisor_number;
      return emp;
    });

    res.json({
      success: true,
      data: {
        employees,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get all employees error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get employees'
    });
  }
};

/**
 * GET /api/employees/:id
 * Get employee by ID (company-scoped unless system_admin)
 */
const getEmployeeById = async (req, res) => {
  try {
    const { id } = req.params;
    const companyScope = req.user.role === 'system_admin' ? null : req.user.company_id;

    let queryText = `
      SELECT e.*, d.name as department_name, s.employee_number as supervisor_number,
             su.email as supervisor_name
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN employees s ON e.supervisor_id = s.id
      LEFT JOIN users su ON s.user_id = su.id
      WHERE e.id = $1
    `;
    const queryParams = [id];
    let paramCount = 1;

    // Apply company scope
    if (companyScope) {
      paramCount++;
      queryText += ` AND e.company_id = $${paramCount}`;
      queryParams.push(companyScope);
    }

    const result = await query(queryText, queryParams);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    const emp = formatEmployee(result.rows[0]);
    emp.departmentName = result.rows[0].department_name;
    emp.supervisorName = result.rows[0].supervisor_name;
    emp.supervisorEmployeeNumber = result.rows[0].supervisor_number;

    res.json({
      success: true,
      data: { employee: emp }
    });
  } catch (error) {
    console.error('Get employee by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get employee'
    });
  }
};

/**
 * POST /api/employees
 * Create a new employee
 * Company-scoped: company_admin creates in their company; system_admin can specify
 */
const createEmployee = async (req, res) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const {
      userId,
      employeeNumber,
      departmentId,
      supervisorId,
      jobTitle,
      employmentStatus,
      startDate,
      timezone,
      contractedHours,
      monthlyPerformanceTarget,
      profilePhotoUrl,
      companyId
    } = req.body;

    // Determine company_id
    let targetCompanyId = companyId;
    if (!targetCompanyId) {
      if (req.user.role === 'system_admin') {
        // System admin must specify a company
        return res.status(400).json({
          success: false,
          message: 'System admin must specify companyId'
        });
      }
      targetCompanyId = req.user.company_id;
    }

    // Verify company exists and is active
    const companyCheck = await client.query(
      'SELECT id, is_active FROM companies WHERE id = $1',
      [targetCompanyId]
    );
    if (companyCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }
    if (!companyCheck.rows[0].is_active) {
      await client.query('ROLLBACK');
      return res.status(403).json({
        success: false,
        message: 'Company is deactivated'
      });
    }

    // Check for duplicate employee number within company
    const existing = await client.query(
      'SELECT id FROM employees WHERE employee_number = $1 AND company_id = $2',
      [employeeNumber, targetCompanyId]
    );
    if (existing.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        success: false,
        message: 'Employee number already exists in this company'
      });
    }

    const result = await client.query(
      `INSERT INTO employees (
        user_id, employee_number, company_id, department_id, supervisor_id, job_title,
        employment_status, start_date, timezone, contracted_hours,
        monthly_performance_target, profile_photo_url
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        userId || null,
        employeeNumber,
        targetCompanyId,
        departmentId || null,
        supervisorId || null,
        jobTitle || null,
        employmentStatus || 'active',
        startDate || null,
        timezone || 'Africa/Nairobi',
        contractedHours || 40,
        monthlyPerformanceTarget || 0,
        profilePhotoUrl || null
      ]
    );

    // Create audit log
    await client.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address)
       VALUES ($1, 'create', 'employee', $2, $3, $4)`,
      [req.user.id, result.rows[0].id, JSON.stringify(req.body), req.ip]
    );

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Employee created successfully',
      data: { employee: formatEmployee(result.rows[0]) }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create employee error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create employee'
    });
  } finally {
    client.release();
  }
};

/**
 * PATCH /api/employees/:id
 * Update employee details (company-scoped)
 */
const updateEmployee = async (req, res) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const {
      departmentId,
      supervisorId,
      jobTitle,
      employmentStatus,
      startDate,
      timezone,
      contractedHours,
      monthlyPerformanceTarget,
      profilePhotoUrl
    } = req.body;

    // Check employee exists and company scope
    const companyScope = req.user.role === 'system_admin' ? null : req.user.company_id;
    let existingQuery = 'SELECT * FROM employees WHERE id = $1';
    const existingParams = [id];
    let paramCount = 1;

    if (companyScope) {
      paramCount++;
      existingQuery += ` AND company_id = $${paramCount}`;
      existingParams.push(companyScope);
    }

    const existing = await client.query(existingQuery, existingParams);
    if (existing.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    const updateResult = await client.query(
      `UPDATE employees
       SET department_id = COALESCE($1, department_id),
           supervisor_id = COALESCE($2, supervisor_id),
           job_title = COALESCE($3, job_title),
           employment_status = COALESCE($4, employment_status),
           start_date = COALESCE($5, start_date),
           timezone = COALESCE($6, timezone),
           contracted_hours = COALESCE($7, contracted_hours),
           monthly_performance_target = COALESCE($8, monthly_performance_target),
           profile_photo_url = COALESCE($9, profile_photo_url),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $10
       RETURNING *`,
      [
        departmentId, supervisorId, jobTitle, employmentStatus,
        startDate, timezone, contractedHours, monthlyPerformanceTarget,
        profilePhotoUrl, id
      ]
    );

    // Create audit log
    await client.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address)
       VALUES ($1, 'update', 'employee', $2, $3, $4)`,
      [req.user.id, id, JSON.stringify(req.body), req.ip]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Employee updated successfully',
      data: { employee: formatEmployee(updateResult.rows[0]) }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Update employee error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update employee'
    });
  } finally {
    client.release();
  }
};

/**
 * DELETE /api/employees/:id
 * Deactivate employee (company-scoped)
 */
const deactivateEmployee = async (req, res) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const { id } = req.params;

    // Check employee exists and company scope
    const companyScope = req.user.role === 'system_admin' ? null : req.user.company_id;
    let existingQuery = 'SELECT * FROM employees WHERE id = $1';
    const existingParams = [id];
    let paramCount = 1;

    if (companyScope) {
      paramCount++;
      existingQuery += ` AND company_id = $${paramCount}`;
      existingParams.push(companyScope);
    }

    const existing = await client.query(existingQuery, existingParams);
    if (existing.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    const hasDependents = await hasDependentRecords(id);

    if (hasDependents) {
      await client.query(
        `UPDATE employees SET employment_status = 'inactive', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [id]
      );
      await client.query(
        `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address)
         VALUES ($1, 'deactivate', 'employee', $2, $3, $4)`,
        [req.user.id, id, JSON.stringify({ reason: 'has_dependent_records' }), req.ip]
      );
      await client.query('COMMIT');
      return res.json({
        success: true,
        message: 'Employee deactivated (has dependent records)',
        data: { employeeId: id, employmentStatus: 'inactive' }
      });
    }

    await client.query('DELETE FROM employees WHERE id = $1', [id]);
    await client.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address)
       VALUES ($1, 'delete', 'employee', $2, $3, $4)`,
      [req.user.id, id, JSON.stringify({}), req.ip]
    );
    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Employee deleted successfully'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Deactivate employee error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to deactivate employee'
    });
  } finally {
    client.release();
  }
};

/**
 * GET /api/employees/:id/performance
 * Get employee performance metrics (company-scoped)
 */
const getEmployeePerformance = async (req, res) => {
  try {
    const { id } = req.params;
    const { year, month } = req.query;

    const reportingYear = year ? parseInt(year) : new Date().getFullYear();
    const reportingMonth = month ? parseInt(month) : new Date().getMonth() + 1;

    // Get employee with company scope check
    const companyScope = req.user.role === 'system_admin' ? null : req.user.company_id;
    let empQuery = 'SELECT * FROM employees WHERE id = $1';
    const empParams = [id];
    let paramCount = 1;

    if (companyScope) {
      paramCount++;
      empQuery += ` AND company_id = $${paramCount}`;
      empParams.push(companyScope);
    }

    const empResult = await query(empQuery, empParams);
    if (empResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    // Get monthly snapshot
    const snapshotResult = await query(
      `SELECT * FROM monthly_performance_snapshots
       WHERE employee_id = $1 AND reporting_year = $2 AND reporting_month = $3`,
      [id, reportingYear, reportingMonth]
    );

    // Get task stats
    const taskStatsResult = await query(
      `SELECT
         COUNT(ta.id) as tasks_assigned,
         COUNT(CASE WHEN t.status = 'completed' THEN 1 END) as tasks_completed,
         COUNT(CASE WHEN t.status = 'overdue' THEN 1 END) as tasks_overdue,
         COUNT(CASE WHEN t.status = 'in_progress' THEN 1 END) as tasks_in_progress
       FROM task_assignments ta
       JOIN tasks t ON ta.task_id = t.id
       WHERE ta.employee_id = $1
         AND t.due_at >= $2 AND t.due_at < $3`,
      [id, new Date(reportingYear, reportingMonth - 1, 1), new Date(reportingYear, reportingMonth, 1)]
    );

    // Get attendance stats
    const attendanceStatsResult = await query(
      `SELECT
         COUNT(*) as attendance_days,
         SUM(net_work_seconds) as total_net_work_seconds,
         SUM(late_seconds) as total_late_seconds,
         SUM(overtime_seconds) as total_overtime_seconds
       FROM attendance_records
       WHERE employee_id = $1
         AND created_at >= $2 AND created_at < $3`,
      [id, new Date(reportingYear, reportingMonth - 1, 1), new Date(reportingYear, reportingMonth, 1)]
    );

    const taskStats = taskStatsResult.rows[0];
    const attendanceStats = attendanceStatsResult.rows[0];
    const snapshot = snapshotResult.rows[0];

    const tasksAssigned = parseInt(taskStats.tasks_assigned) || 0;
    const tasksCompleted = parseInt(taskStats.tasks_completed) || 0;
    const completionRate = tasksAssigned > 0 ? ((tasksCompleted / tasksAssigned) * 100).toFixed(2) : 0;

    res.json({
      success: true,
      data: {
        employee: formatEmployee(empResult.rows[0]),
        reportingYear,
        reportingMonth,
        performance: {
          tasksAssigned,
          tasksCompleted,
          tasksOverdue: parseInt(taskStats.tasks_overdue) || 0,
          tasksInProgress: parseInt(taskStats.tasks_in_progress) || 0,
          completionRate: parseFloat(completionRate),
          totalNetWorkSeconds: parseInt(attendanceStats.total_net_work_seconds) || 0,
          totalLateSeconds: parseInt(attendanceStats.total_late_seconds) || 0,
          totalOvertimeSeconds: parseInt(attendanceStats.total_overtime_seconds) || 0,
          attendanceDays: parseInt(attendanceStats.attendance_days) || 0
        },
        snapshot: snapshot || null
      }
    });
  } catch (error) {
    console.error('Get employee performance error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get employee performance'
    });
  }
};

module.exports = {
  getAllEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deactivateEmployee,
  getEmployeePerformance
};
