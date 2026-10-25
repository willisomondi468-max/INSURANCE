const { query, getClient } = require('../config/db');
const { v4: uuidv4 } = require('uuid');

/**
 * Default company timezone: Africa/Nairobi
 */
const COMPANY_TIMEZONE = 'Africa/Nairobi';

/**
 * Parse a schedule rule into shift bounds for a given date.
 * Returns { shiftStart, shiftEnd, gracePeriodMinutes } or null if no shift.
 */
const getShiftForDate = async (employeeId, date) => {
  const weekday = new Date(date).getDay(); // 0 = Sunday
  const result = await query(
    `SELECT * FROM work_schedules
     WHERE employee_id = $1
       AND weekday = $2
       AND active = true
       AND effective_from <= $3
       AND (effective_to IS NULL OR effective_to >= $3)
     ORDER BY effective_from DESC
     LIMIT 1`,
    [employeeId, weekday, date]
  );
  return result.rows[0] || null;
};

/**
 * Format seconds as HH:mm
 */
const formatDuration = (seconds) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

/**
 * POST /api/attendance/clock-in
 * Clock in an employee
 */
const clockIn = async (req, res) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const employeeId = req.user.id; // users.id maps to employee via users table? No - employees have user_id
    // Find employee by user_id
    const empResult = await client.query(
      'SELECT * FROM employees WHERE user_id = $1',
      [req.user.id]
    );
    if (empResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Employee record not found for this user'
      });
    }
    const employee = empResult.rows[0];

    if (employee.employment_status !== 'active') {
      await client.query('ROLLBACK');
      return res.status(403).json({
        success: false,
        message: 'Employee account is not active. Cannot clock in.'
      });
    }

    // Check for existing open attendance session today
    const today = new Date().toISOString().split('T')[0];
    const openResult = await client.query(
      `SELECT * FROM attendance_records
       WHERE employee_id = $1
         AND DATE(created_at) = $2
         AND clock_out_at IS NULL
       ORDER BY created_at DESC
       LIMIT 1`,
      [employee.id, today]
    );
    if (openResult.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        success: false,
        message: 'Already clocked in. You have an open attendance session.'
      });
    }

    // Get shift for today
    const shift = await getShiftForDate(employee.id, today);
    const now = new Date();

    let attendanceStatus = 'present';
    let lateSeconds = 0;

    if (shift) {
      const shiftStart = new Date(`${today}T${shift.shift_start}`);
      const graceMinutes = 15; // configurable grace period
      const graceEnd = new Date(shiftStart.getTime() + graceMinutes * 60000);

      if (now > graceEnd) {
        attendanceStatus = 'late';
        lateSeconds = Math.floor((now - graceEnd) / 1000);
      }
    }

    // Insert attendance record
    const result = await client.query(
      `INSERT INTO attendance_records (
        employee_id, scheduled_shift_id, clock_in_at, attendance_status,
        late_seconds, source, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, 'manual', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *`,
      [
        employee.id,
        shift ? shift.id : null,
        now.toISOString(),
        attendanceStatus,
        lateSeconds
      ]
    );

    // Create audit log
    await client.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address)
       VALUES ($1, 'clock_in', 'attendance_record', $2, $3, $4)`,
      [req.user.id, result.rows[0].id, JSON.stringify({ status: attendanceStatus, lateSeconds }), req.ip]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Clocked in successfully',
      data: {
        attendanceId: result.rows[0].id,
        clockInAt: result.rows[0].clock_in_at,
        status: attendanceStatus,
        lateSeconds,
        shift: shift ? {
          shiftStart: shift.shift_start,
          shiftEnd: shift.shift_end
        } : null
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Clock-in error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clock in'
    });
  } finally {
    client.release();
  }
};

/**
 * POST /api/attendance/clock-out
 * Clock out an employee
 */
const clockOut = async (req, res) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const empResult = await client.query(
      'SELECT * FROM employees WHERE user_id = $1',
      [req.user.id]
    );
    if (empResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Employee record not found for this user'
      });
    }
    const employee = empResult.rows[0];

    // Find open attendance session
    const today = new Date().toISOString().split('T')[0];
    const openResult = await client.query(
      `SELECT * FROM attendance_records
       WHERE employee_id = $1
         AND DATE(created_at) = $2
         AND clock_out_at IS NULL
       ORDER BY created_at DESC
       LIMIT 1`,
      [employee.id, today]
    );
    if (openResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        success: false,
        message: 'No open attendance session found. Please clock in first.'
      });
    }

    const record = openResult.rows[0];
    const now = new Date();
    const clockInAt = new Date(record.clock_in_at);
    const totalElapsedSeconds = Math.floor((now - clockInAt) / 1000);

    // Calculate break time
    const breaksResult = await client.query(
      `SELECT COALESCE(SUM(
        CASE WHEN ended_at IS NOT NULL THEN EXTRACT(EPOCH FROM (ended_at - started_at)) ELSE 0 END
      ), 0) as total_break_seconds
       FROM attendance_breaks
       WHERE attendance_record_id = $1`,
      [record.id]
    );
    const totalBreakSeconds = parseInt(breaksResult.rows[0].total_break_seconds) || 0;

    // Paid vs unpaid breaks
    const unpaidResult = await client.query(
      `SELECT COALESCE(SUM(
        CASE WHEN paid_status = false AND ended_at IS NOT NULL THEN EXTRACT(EPOCH FROM (ended_at - started_at)) ELSE 0 END
      ), 0) as unpaid_break_seconds
       FROM attendance_breaks
       WHERE attendance_record_id = $1`,
      [record.id]
    );
    const unpaidBreakSeconds = parseInt(unpaidResult.rows[0].unpaid_break_seconds) || 0;

    const netWorkSeconds = Math.max(0, totalElapsedSeconds - totalBreakSeconds);

    // Determine if early departure or overtime
    const shift = await getShiftForDate(employee.id, today);
    let overtimeSeconds = 0;
    if (shift && shift.shift_end) {
      const shiftEnd = new Date(`${today}T${shift.shift_end}`);
      if (now > shiftEnd) {
        overtimeSeconds = Math.floor((now - shiftEnd) / 1000);
      }
    }

    const attendanceStatus = 'clocked_out';

    const result = await client.query(
      `UPDATE attendance_records
       SET clock_out_at = $1,
           attendance_status = $2,
           total_elapsed_seconds = $3,
           unpaid_break_seconds = $4,
           net_work_seconds = $5,
           overtime_seconds = $6,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $7
       RETURNING *`,
      [
        now.toISOString(),
        attendanceStatus,
        totalElapsedSeconds,
        unpaidBreakSeconds,
        netWorkSeconds,
        overtimeSeconds,
        record.id
      ]
    );

    // Create audit log
    await client.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address)
       VALUES ($1, 'clock_out', 'attendance_record', $2, $3, $4)`,
      [req.user.id, record.id, JSON.stringify({ netWorkSeconds, overtimeSeconds, totalElapsedSeconds }), req.ip]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Clocked out successfully',
      data: {
        clockOutAt: result.rows[0].clock_out_at,
        totalElapsedSeconds,
        netWorkSeconds,
        overtimeSeconds,
        status: attendanceStatus
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Clock-out error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clock out'
    });
  } finally {
    client.release();
  }
};

/**
 * POST /api/attendance/breaks/start
 * Start a break
 */
const startBreak = async (req, res) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const { breakType, paid = true } = req.body;

    const empResult = await client.query(
      'SELECT * FROM employees WHERE user_id = $1',
      [req.user.id]
    );
    if (empResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Employee record not found for this user'
      });
    }
    const employee = empResult.rows[0];

    // Find open attendance session
    const today = new Date().toISOString().split('T')[0];
    const openResult = await client.query(
      `SELECT * FROM attendance_records
       WHERE employee_id = $1
         AND DATE(created_at) = $2
         AND clock_out_at IS NULL
       ORDER BY created_at DESC
       LIMIT 1`,
      [employee.id, today]
    );
    if (openResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        success: false,
        message: 'No open attendance session. Clock in first.'
      });
    }

    // Check for overlapping active breaks
    const activeBreakResult = await client.query(
      `SELECT * FROM attendance_breaks
       WHERE attendance_record_id = $1 AND ended_at IS NULL
       LIMIT 1`,
      [openResult.rows[0].id]
    );
    if (activeBreakResult.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        success: false,
        message: 'An active break is already running. End it before starting another.'
      });
    }

    const now = new Date();
    const result = await client.query(
      `INSERT INTO attendance_breaks (
        attendance_record_id, break_type, started_at, paid_status, created_at
      ) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
      RETURNING *`,
      [openResult.rows[0].id, breakType, now.toISOString(), paid]
    );

    // Update attendance status to on_break
    await client.query(
      `UPDATE attendance_records SET attendance_status = 'on_break', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [openResult.rows[0].id]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Break started',
      data: {
        breakId: result.rows[0].id,
        breakType,
        startedAt: result.rows[0].started_at,
        paid: result.rows[0].paid_status
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Start break error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start break'
    });
  } finally {
    client.release();
  }
};

/**
 * POST /api/attendance/breaks/end
 * End a break
 */
const endBreak = async (req, res) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const { breakId } = req.body;

    const empResult = await client.query(
      'SELECT * FROM employees WHERE user_id = $1',
      [req.user.id]
    );
    if (empResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Employee record not found for this user'
      });
    }
    const employee = empResult.rows[0];

    const breakResult = await client.query(
      `SELECT b.*, ar.employee_id FROM attendance_breaks b
       JOIN attendance_records ar ON b.attendance_record_id = ar.id
       WHERE b.id = $1 AND ar.employee_id = $2`,
      [breakId, employee.id]
    );
    if (breakResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Break record not found or not assigned to you.'
      });
    }

    const br = breakResult.rows[0];
    if (br.ended_at) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        success: false,
        message: 'Break has already been ended.'
      });
    }

    const now = new Date();
    await client.query(
      `UPDATE attendance_breaks SET ended_at = $1 WHERE id = $2`,
      [now.toISOString(), breakId]
    );

    // Return attendance status to present
    await client.query(
      `UPDATE attendance_records SET attendance_status = 'present', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [br.attendance_record_id]
    );

    const durationSeconds = Math.floor((now - new Date(br.started_at)) / 1000);

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Break ended',
      data: {
        breakId,
        endedAt: now.toISOString(),
        durationSeconds
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('End break error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to end break'
    });
  } finally {
    client.release();
  }
};

/**
 * GET /api/attendance/me
 * Get current employee's attendance status and today's record
 */
const getMyAttendance = async (req, res) => {
  try {
    const empResult = await query(
      'SELECT * FROM employees WHERE user_id = $1',
      [req.user.id]
    );
    if (empResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Employee record not found for this user'
      });
    }
    const employee = empResult.rows[0];

    const today = new Date().toISOString().split('T')[0];
    const recordResult = await query(
      `SELECT ar.*,
              (SELECT COALESCE(SUM(
                CASE WHEN ended_at IS NOT NULL THEN EXTRACT(EPOCH FROM (ended_at - started_at)) ELSE 0 END
              ), 0) FROM attendance_breaks WHERE attendance_record_id = ar.id) as total_break_seconds
       FROM attendance_records ar
       WHERE ar.employee_id = $1 AND DATE(ar.created_at) = $2
       ORDER BY ar.created_at DESC
       LIMIT 1`,
      [employee.id, today]
    );

    let currentStatus = 'not_clocked_in';
    let record = null;

    if (recordResult.rows.length > 0) {
      record = recordResult.rows[0];
      currentStatus = record.attendance_status;
    }

    // Get shift info
    const shift = await getShiftForDate(employee.id, today);

    res.json({
      success: true,
      data: {
        employee: {
          id: employee.id,
          employeeNumber: employee.employee_number,
          jobTitle: employee.job_title,
          timezone: employee.timezone
        },
        currentStatus,
        shift,
        record: record ? {
          id: record.id,
          clockInAt: record.clock_in_at,
          clockOutAt: record.clock_out_at,
          status: record.attendance_status,
          totalElapsedSeconds: record.total_elapsed_seconds,
          netWorkSeconds: record.net_work_seconds,
          lateSeconds: record.late_seconds,
          overtimeSeconds: record.overtime_seconds,
          totalBreakSeconds: parseInt(record.total_break_seconds) || 0
        } : null
      }
    });
  } catch (error) {
    console.error('Get my attendance error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get attendance'
    });
  }
};

/**
 * GET /api/attendance
 * List attendance records with filters (manager/HR)
 * Company-scoped unless system_admin
 */
const getAttendance = async (req, res) => {
  try {
    const { page = 1, limit = 20, employeeId, departmentId, status, startDate, endDate } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const companyScope = req.user.role === 'system_admin' ? null : req.user.company_id;

    let queryText = `
      SELECT ar.*, e.employee_number, e.job_title, d.name as department_name
      FROM attendance_records ar
      JOIN employees e ON ar.employee_id = e.id
      LEFT JOIN departments d ON e.department_id = d.id
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

    if (employeeId) {
      paramCount++;
      queryText += ` AND ar.employee_id = $${paramCount}`;
      queryParams.push(employeeId);
    }
    if (departmentId) {
      paramCount++;
      queryText += ` AND e.department_id = $${paramCount}`;
      queryParams.push(departmentId);
    }
    if (status) {
      paramCount++;
      queryText += ` AND ar.attendance_status = $${paramCount}`;
      queryParams.push(status);
    }
    if (startDate) {
      paramCount++;
      queryText += ` AND ar.created_at >= $${paramCount}`;
      queryParams.push(startDate);
    }
    if (endDate) {
      paramCount++;
      queryText += ` AND ar.created_at <= $${paramCount}`;
      queryParams.push(endDate);
    }

    const countResult = await query(
      `SELECT COUNT(*) FROM (${queryText}) as filtered`,
      queryParams
    );
    const total = parseInt(countResult.rows[0].count);

    paramCount++;
    queryText += ` ORDER BY ar.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    queryParams.push(limit, offset);

    const result = await query(queryText, queryParams);

    res.json({
      success: true,
      data: {
        attendance: result.rows.map(r => ({
          id: r.id,
          employeeId: r.employee_id,
          employeeNumber: r.employee_number,
          jobTitle: r.job_title,
          departmentName: r.department_name,
          clockInAt: r.clock_in_at,
          clockOutAt: r.clock_out_at,
          status: r.attendance_status,
          totalElapsedSeconds: r.total_elapsed_seconds,
          netWorkSeconds: r.net_work_seconds,
          lateSeconds: r.late_seconds,
          overtimeSeconds: r.overtime_seconds,
          createdAt: r.created_at
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
    console.error('Get attendance error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get attendance records'
    });
  }
};

/**
 * GET /api/attendance/summary
 * Attendance summary dashboard metrics
 */
const getAttendanceSummary = async (req, res) => {
  try {
    const { startDate, endDate, departmentId } = req.query;
    const today = new Date().toISOString().split('T')[0];
    const start = startDate || today;
    const end = endDate || today;
    const companyScope = req.user.role === 'system_admin' ? null : req.user.company_id;

    let deptFilter = '';
    let companyFilter = '';
    let filterParamCount = 0;
    const filterParams = [];

    if (departmentId) {
      filterParamCount++;
      deptFilter = `AND e.department_id = $${filterParamCount}`;
      filterParams.push(departmentId);
    }

    // Apply company scope
    if (companyScope) {
      filterParamCount++;
      companyFilter = `AND e.company_id = $${filterParamCount}`;
      filterParams.push(companyScope);
    }

    // Total active employees - no date params needed
    const totalParams = [...filterParams];
    const totalResult = await query(
      `SELECT COUNT(*) as cnt FROM employees e WHERE e.employment_status = 'active' ${companyFilter} ${deptFilter}`,
      totalParams
    );
    const totalActive = parseInt(totalResult.rows[0].cnt);

    // Single-date queries: use $1 for date, then $2+ for filters
    const dateParams = [start, ...filterParams];
    const clockedInResult = await query(
      `SELECT COUNT(*) as cnt FROM attendance_records ar
       JOIN employees e ON ar.employee_id = e.id
       WHERE ar.clock_out_at IS NULL
         AND DATE(ar.created_at) = $1
         AND e.employment_status = 'active' ${companyFilter} ${deptFilter}`,
      dateParams
    );
    const clockedIn = parseInt(clockedInResult.rows[0].cnt);

    // On break
    const onBreakResult = await query(
      `SELECT COUNT(*) as cnt FROM attendance_records ar
       JOIN employees e ON ar.employee_id = e.id
       WHERE ar.attendance_status = 'on_break'
         AND DATE(ar.created_at) = $1
         AND e.employment_status = 'active' ${companyFilter} ${deptFilter}`,
      dateParams
    );
    const onBreak = parseInt(onBreakResult.rows[0].cnt);

    // Clocked out
    const clockedOutResult = await query(
      `SELECT COUNT(*) as cnt FROM attendance_records ar
       JOIN employees e ON ar.employee_id = e.id
       WHERE ar.clock_out_at IS NOT NULL
         AND DATE(ar.created_at) = $1
         AND e.employment_status = 'active' ${companyFilter} ${deptFilter}`,
      dateParams
    );
    const clockedOut = parseInt(clockedOutResult.rows[0].cnt);

    // Late arrivals
    const lateResult = await query(
      `SELECT COUNT(*) as cnt FROM attendance_records ar
       JOIN employees e ON ar.employee_id = e.id
       WHERE ar.attendance_status = 'late'
         AND DATE(ar.created_at) = $1
         AND e.employment_status = 'active' ${companyFilter} ${deptFilter}`,
      dateParams
    );
    const late = parseInt(lateResult.rows[0].cnt);

    // Absent (scheduled but no record)
    const absentResult = await query(
      `SELECT COUNT(*) as cnt FROM attendance_records ar
       JOIN employees e ON ar.employee_id = e.id
       WHERE ar.attendance_status = 'absent'
         AND DATE(ar.created_at) = $1
         AND e.employment_status = 'active' ${companyFilter} ${deptFilter}`,
      dateParams
    );
    const absent = parseInt(absentResult.rows[0].cnt);

    // Total net work hours - date range query: $1=$start, $2=$end, then filters
    const rangeParams = [start, end, ...filterParams];
    const hoursResult = await query(
      `SELECT COALESCE(SUM(net_work_seconds), 0) as total_seconds FROM attendance_records ar
       JOIN employees e ON ar.employee_id = e.id
       WHERE DATE(ar.created_at) BETWEEN $1 AND $2
         AND e.employment_status = 'active' ${companyFilter} ${deptFilter}`,
      rangeParams
    );
    const totalNetSeconds = parseInt(hoursResult.rows[0].total_seconds) || 0;

    // Average working hours
    const avgResult = await query(
      `SELECT AVG(net_work_seconds) as avg_seconds FROM attendance_records ar
       JOIN employees e ON ar.employee_id = e.id
       WHERE DATE(ar.created_at) BETWEEN $1 AND $2
         AND ar.clock_out_at IS NOT NULL
         AND e.employment_status = 'active' ${companyFilter} ${deptFilter}`,
      rangeParams
    );
    const avgSeconds = parseInt(avgResult.rows[0].avg_seconds) || 0;

    const attendanceRate = totalActive > 0 ? ((clockedIn + clockedOut) / totalActive * 100).toFixed(2) : 0;
    const punctualityRate = (clockedIn + clockedOut) > 0 ? (((clockedIn + clockedOut - late) / (clockedIn + clockedOut)) * 100).toFixed(2) : 0;

    res.json({
      success: true,
      data: {
        period: { start, end },
        totalActiveEmployees: totalActive,
        clockedIn,
        onBreak,
        clockedOut,
        late,
        absent,
        attendanceRate: parseFloat(attendanceRate),
        punctualityRate: parseFloat(punctualityRate),
        totalNetWorkSeconds: totalNetSeconds,
        totalNetWorkHours: formatDuration(totalNetSeconds),
        averageWorkingHours: formatDuration(avgSeconds)
      }
    });
  } catch (error) {
    console.error('Get attendance summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get attendance summary'
    });
  }
};

/**
 * POST /api/attendance/adjustments
 * Request an attendance correction
 */
const requestAdjustment = async (req, res) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const { attendanceRecordId, proposedValues, reason } = req.body;

    const empResult = await client.query(
      'SELECT * FROM employees WHERE user_id = $1',
      [req.user.id]
    );
    if (empResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Employee record not found'
      });
    }

    // Verify the record exists and belongs to employee (or they're HR)
    const recordResult = await client.query(
      'SELECT * FROM attendance_records WHERE id = $1 AND employee_id = $2',
      [attendanceRecordId, empResult.rows[0].id]
    );
    if (recordResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Attendance record not found'
      });
    }

    const originalValues = {
      clockInAt: recordResult.rows[0].clock_in_at,
      clockOutAt: recordResult.rows[0].clock_out_at,
      status: recordResult.rows[0].attendance_status
    };

    const result = await client.query(
      `INSERT INTO attendance_adjustments (
        attendance_record_id, requested_by, original_values, proposed_values, reason, status, created_at
      ) VALUES ($1, $2, $3, $4, $5, 'pending', CURRENT_TIMESTAMP)
      RETURNING *`,
      [
        attendanceRecordId,
        req.user.id,
        JSON.stringify(originalValues),
        JSON.stringify(proposedValues),
        reason
      ]
    );

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Attendance correction requested',
      data: { adjustmentId: result.rows[0].id, status: 'pending' }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Request adjustment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to request adjustment'
    });
  } finally {
    client.release();
  }
};

/**
 * PATCH /api/attendance/adjustments/:id/review
 * Approve or reject an attendance adjustment (HR/Manager)
 */
const reviewAdjustment = async (req, res) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const { decision, reviewedBy } = req.body; // decision: 'approved' | 'rejected'

    if (!['approved', 'rejected'].includes(decision)) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Decision must be approved or rejected'
      });
    }

    const result = await client.query(
      `UPDATE attendance_adjustments
       SET status = $1, reviewed_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND status = 'pending'
       RETURNING *`,
      [decision, id]
    );

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Adjustment not found or already reviewed'
      });
    }

    const adj = result.rows[0];

    // If approved, apply proposed values to the attendance record
    if (decision === 'approved' && adj.proposed_values) {
      const pv = adj.proposed_values;
      const updates = [];
      const values = [];
      let paramCount = 0;

      if (pv.clockInAt !== undefined) {
        paramCount++;
        updates.push(`clock_in_at = $${paramCount}`);
        values.push(pv.clockInAt);
      }
      if (pv.clockOutAt !== undefined) {
        paramCount++;
        updates.push(`clock_out_at = $${paramCount}`);
        values.push(pv.clockOutAt);
      }
      if (pv.status !== undefined) {
        paramCount++;
        updates.push(`attendance_status = $${paramCount}`);
        values.push(pv.status);
      }

      if (updates.length > 0) {
        paramCount++;
        updates.push(`updated_at = CURRENT_TIMESTAMP`);
        values.push(adj.attendance_record_id);

        await client.query(
          `UPDATE attendance_records SET ${updates.join(', ')} WHERE id = $${paramCount}`,
          values
        );
      }
    }

    await client.query('COMMIT');

    res.json({
      success: true,
      message: `Adjustment ${decision}`,
      data: { adjustmentId: id, decision }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Review adjustment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to review adjustment'
    });
  } finally {
    client.release();
  }
};

module.exports = {
  clockIn,
  clockOut,
  startBreak,
  endBreak,
  getMyAttendance,
  getAttendance,
  getAttendanceSummary,
  requestAdjustment,
  reviewAdjustment
};
