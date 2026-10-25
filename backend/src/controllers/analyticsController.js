const { query } = require('../config/db');

/**
 * Helper: safe percentage calculation (avoid division by zero)
 */
const safePct = (numerator, denominator) => {
  if (!denominator || denominator === 0) return 0;
  return parseFloat(((numerator / denominator) * 100).toFixed(2));
};

/**
 * GET /api/analytics/staff
 * Individual staff performance metrics
 * Access: Department Manager, HR, Super Admin, Supervisor
 */
const getStaffAnalytics = async (req, res) => {
  try {
    const { employeeId, year, month } = req.query;
    const reportingYear = year ? parseInt(year) : new Date().getFullYear();
    const reportingMonth = month ? parseInt(month) : new Date().getMonth() + 1;

    let empFilter = '';
    const params = [reportingYear, reportingMonth];
    let paramCount = 2;
    const companyScope = req.user.role === 'system_admin' ? null : req.user.company_id;

    if (companyScope) {
      paramCount++;
      empFilter = `AND e.company_id = $${paramCount}`;
      params.push(companyScope);
    }
    if (employeeId) {
      paramCount++;
      empFilter += ` AND e.id = $${paramCount}`;
      params.push(employeeId);
    }

    // Get employees with their task and attendance stats for the period
    const startDate = new Date(reportingYear, reportingMonth - 1, 1);
    const endDate = new Date(reportingYear, reportingMonth, 1);

    const result = await query(
      `SELECT e.id, e.employee_number, e.job_title, e.contracted_hours,
              d.name as department_name,
              COALESCE(ts.tasks_assigned, 0) as tasks_assigned,
              COALESCE(ts.tasks_completed, 0) as tasks_completed,
              COALESCE(ts.tasks_overdue, 0) as tasks_overdue,
              COALESCE(ts.tasks_in_progress, 0) as tasks_in_progress,
              COALESCE(atd.attendance_days, 0) as attendance_days,
              COALESCE(atd.total_net_work_seconds, 0) as total_net_work_seconds,
              COALESCE(atd.total_late_seconds, 0) as total_late_seconds,
              COALESCE(atd.total_overtime_seconds, 0) as total_overtime_seconds
       FROM employees e
       LEFT JOIN departments d ON e.department_id = d.id
       LEFT JOIN (
         SELECT ta.employee_id,
                COUNT(*) as tasks_assigned,
                COUNT(CASE WHEN t.status = 'completed' THEN 1 END) as tasks_completed,
                COUNT(CASE WHEN t.status = 'overdue' THEN 1 END) as tasks_overdue,
                COUNT(CASE WHEN t.status = 'in_progress' THEN 1 END) as tasks_in_progress
         FROM task_assignments ta
         JOIN tasks t ON ta.task_id = t.id
         WHERE t.due_at >= $1 AND t.due_at < $2
         GROUP BY ta.employee_id
       ) ts ON e.id = ts.employee_id
       LEFT JOIN (
         SELECT ar.employee_id,
                COUNT(*) as attendance_days,
                SUM(ar.net_work_seconds) as total_net_work_seconds,
                SUM(ar.late_seconds) as total_late_seconds,
                SUM(ar.overtime_seconds) as total_overtime_seconds
         FROM attendance_records ar
         WHERE ar.created_at >= $1 AND ar.created_at < $2
         GROUP BY ar.employee_id
       ) atd ON e.id = atd.employee_id
       WHERE e.employment_status = 'active' ${empFilter}
       ORDER BY e.employee_number`,
      params
    );

    const staff = result.rows.map(row => {
      const tasksAssigned = parseInt(row.tasks_assigned) || 0;
      const tasksCompleted = parseInt(row.tasks_completed) || 0;
      const completionRate = safePct(tasksCompleted, tasksAssigned);

      return {
        id: row.id,
        employeeNumber: row.employee_number,
        jobTitle: row.job_title,
        departmentName: row.department_name,
        contractedHours: row.contracted_hours,
        tasksAssigned,
        tasksCompleted,
        tasksOverdue: parseInt(row.tasks_overdue) || 0,
        tasksInProgress: parseInt(row.tasks_in_progress) || 0,
        completionRate,
        attendanceDays: parseInt(row.attendance_days) || 0,
        totalNetWorkSeconds: parseInt(row.total_net_work_seconds) || 0,
        totalNetWorkHours: (parseInt(row.total_net_work_seconds) || 0) / 3600,
        totalLateSeconds: parseInt(row.total_late_seconds) || 0,
        totalOvertimeSeconds: parseInt(row.total_overtime_seconds) || 0
      };
    });

    res.json({
      success: true,
      data: {
        reportingYear,
        reportingMonth,
        staff
      }
    });
  } catch (error) {
    console.error('Get staff analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get staff analytics'
    });
  }
};

/**
 * GET /api/analytics/departments
 * Department-level performance comparison
 * Access: Department Manager, HR, Super Admin, Senior Management
 */
const getDepartmentAnalytics = async (req, res) => {
  try {
    const { year, month } = req.query;
    const reportingYear = year ? parseInt(year) : new Date().getFullYear();
    const reportingMonth = month ? parseInt(month) : new Date().getMonth() + 1;
    const startDate = new Date(reportingYear, reportingMonth - 1, 1);
    const endDate = new Date(reportingYear, reportingMonth, 1);

    const result = await query(
      `SELECT d.id, d.name, d.monthly_target,
              COUNT(e.id) as employee_count,
              COALESCE(ts.tasks_assigned, 0) as tasks_assigned,
              COALESCE(ts.tasks_completed, 0) as tasks_completed,
              COALESCE(ts.tasks_overdue, 0) as tasks_overdue,
              COALESCE(atd.total_net_work_seconds, 0) as total_net_work_seconds,
              COALESCE(atd.total_late_seconds, 0) as total_late_seconds
       FROM departments d
       LEFT JOIN employees e ON e.department_id = d.id AND e.employment_status = 'active'
       LEFT JOIN (
         SELECT e.department_id,
                COUNT(*) as tasks_assigned,
                COUNT(CASE WHEN t.status = 'completed' THEN 1 END) as tasks_completed,
                COUNT(CASE WHEN t.status = 'overdue' THEN 1 END) as tasks_overdue
         FROM task_assignments ta
         JOIN tasks t ON ta.task_id = t.id
         JOIN employees e ON ta.employee_id = e.id
         WHERE t.due_at >= $1 AND t.due_at < $2
         GROUP BY e.department_id
       ) ts ON d.id = ts.department_id
       LEFT JOIN (
         SELECT e.department_id,
                SUM(ar.net_work_seconds) as total_net_work_seconds,
                SUM(ar.late_seconds) as total_late_seconds
         FROM attendance_records ar
         JOIN employees e ON ar.employee_id = e.id
         WHERE ar.created_at >= $1 AND ar.created_at < $2
         GROUP BY e.department_id
       ) atd ON d.id = atd.department_id
       WHERE d.status = 'active'
       GROUP BY d.id, d.name, d.monthly_target, ts.tasks_assigned, ts.tasks_completed,
                ts.tasks_overdue, atd.total_net_work_seconds, atd.total_late_seconds
       ORDER BY d.name`,
      [startDate, endDate]
    );

    const departments = result.rows.map(row => {
      const tasksAssigned = parseInt(row.tasks_assigned) || 0;
      const tasksCompleted = parseInt(row.tasks_completed) || 0;
      const completionRate = safePct(tasksCompleted, tasksAssigned);
      const employeeCount = parseInt(row.employee_count) || 0;

      return {
        id: row.id,
        name: row.name,
        monthlyTarget: row.monthly_target,
        employeeCount,
        tasksAssigned,
        tasksCompleted,
        tasksOverdue: parseInt(row.tasks_overdue) || 0,
        completionRate,
        totalNetWorkSeconds: parseInt(row.total_net_work_seconds) || 0,
        totalNetWorkHours: (parseInt(row.total_net_work_seconds) || 0) / 3600,
        totalLateSeconds: parseInt(row.total_late_seconds) || 0,
        targetAchievement: tasksAssigned > 0 ? safePct(tasksCompleted, row.monthly_target || tasksAssigned) : 0
      };
    });

    res.json({
      success: true,
      data: {
        reportingYear,
        reportingMonth,
        departments
      }
    });
  } catch (error) {
    console.error('Get department analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get department analytics'
    });
  }
};

/**
 * GET /api/analytics/company
 * Company-wide performance metrics
 * Access: Super Admin, HR, Senior Management
 */
const getCompanyAnalytics = async (req, res) => {
  try {
    const { year, month } = req.query;
    const reportingYear = year ? parseInt(year) : new Date().getFullYear();
    const reportingMonth = month ? parseInt(month) : new Date().getMonth() + 1;
    const startDate = new Date(reportingYear, reportingMonth - 1, 1);
    const endDate = new Date(reportingYear, reportingMonth, 1);
    const companyScope = req.user.role === 'system_admin' ? null : req.user.company_id;

    // Total active employees (company-scoped)
    let empQuery = `SELECT COUNT(*) as cnt FROM employees WHERE employment_status = 'active'`;
    const empQueryParams = [];
    let eParamCount = 0;

    if (companyScope) {
      eParamCount++;
      empQuery += ` AND company_id = $${eParamCount}`;
      empQueryParams.push(companyScope);
    }

    const empResult = await query(empQuery, empQueryParams);
    const totalEmployees = parseInt(empResult.rows[0].cnt);

    // Task metrics - join through task_assignments to employees for company scope
    let taskQuery = `
      SELECT
        COUNT(DISTINCT t.id) as tasks_due,
        COUNT(DISTINCT CASE WHEN t.status = 'completed' THEN t.id END) as tasks_completed,
        COUNT(DISTINCT CASE WHEN t.status = 'overdue' THEN t.id END) as tasks_overdue,
        COUNT(DISTINCT CASE WHEN t.status = 'in_progress' THEN t.id END) as tasks_in_progress,
        COUNT(DISTINCT CASE WHEN t.status = 'pending_review' THEN t.id END) as tasks_pending_review
      FROM tasks t
      LEFT JOIN task_assignments ta ON t.id = ta.task_id
      LEFT JOIN employees e ON ta.employee_id = e.id
      WHERE t.due_at >= $1 AND t.due_at < $2`;
    const taskQueryParams = [startDate, endDate];
    let tParamCount = 2;

    if (companyScope) {
      tParamCount++;
      taskQuery += ` AND e.company_id = $${tParamCount}`;
      taskQueryParams.push(companyScope);
    }

    const taskResult = await query(taskQuery, taskQueryParams);
    const tasks = taskResult.rows[0];
    const tasksDue = parseInt(tasks.tasks_due) || 0;
    const tasksCompleted = parseInt(tasks.tasks_completed) || 0;
    const completionRate = safePct(tasksCompleted, tasksDue);

    // Attendance metrics for current day - join through employees for company scope
    const today = new Date().toISOString().split('T')[0];
    let attQuery = `
      SELECT
        COUNT(CASE WHEN ar.clock_out_at IS NULL THEN 1 END) as clocked_in,
        COUNT(CASE WHEN ar.attendance_status = 'on_break' THEN 1 END) as on_break,
        COUNT(CASE WHEN ar.clock_out_at IS NOT NULL THEN 1 END) as clocked_out,
        COUNT(CASE WHEN ar.attendance_status = 'late' THEN 1 END) as late,
        SUM(ar.net_work_seconds) as total_net_seconds
      FROM attendance_records ar
      JOIN employees e ON ar.employee_id = e.id
      WHERE DATE(ar.created_at) = $1`;
    const attQueryParams = [today];
    let aParamCount = 1;

    if (companyScope) {
      aParamCount++;
      attQuery += ` AND e.company_id = $${aParamCount}`;
      attQueryParams.push(companyScope);
    }

    const attResult = await query(attQuery, attQueryParams);
    const att = attResult.rows[0];
    const clockedIn = parseInt(att.clocked_in) || 0;
    const clockedOut = parseInt(att.clocked_out) || 0;
    const attendanceRate = safePct(clockedIn + clockedOut, totalEmployees);

    // Monthly trends - last 6 months
    const trends = [];
    for (let i = 5; i >= 0; i--) {
      const m = new Date(reportingYear, reportingMonth - 1 - i, 1);
      const my = m.getFullYear();
      const mm = m.getMonth() + 1;
      const ms = new Date(my, mm - 1, 1);
      const me = new Date(my, mm, 1);

      const mt = await query(
        `SELECT
           COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
           COUNT(*) as total
         FROM tasks WHERE due_at >= $1 AND due_at < $2`,
        [ms, me]
      );
      const mtr = mt.rows[0];
      trends.push({
        month: m.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        tasksDue: parseInt(mtr.total) || 0,
        tasksCompleted: parseInt(mtr.completed) || 0,
        completionRate: safePct(parseInt(mtr.completed), parseInt(mtr.total))
      });
    }

    res.json({
      success: true,
      data: {
        reportingYear,
        reportingMonth,
        totalEmployees,
        tasksDue,
        verifiedCompleted: tasksCompleted,
        completionRate,
        onTimeCompletionRate: completionRate, // simplified
        overdueTasks: parseInt(tasks.tasks_overdue) || 0,
        averageQualityScore: 0, // placeholder - would come from task_reviews
        clockedIn: parseInt(att.clocked_in) || 0,
        onBreak: parseInt(att.on_break) || 0,
        clockedOut,
        late: parseInt(att.late) || 0,
        attendanceRate: parseFloat(attendanceRate),
        punctualityRate: 0, // would calculate from late data
        totalNetWorkSeconds: parseInt(att.total_net_seconds) || 0,
        monthlyTrends: trends
      }
    });
  } catch (error) {
    console.error('Get company analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get company analytics'
    });
  }
};

/**
 * GET /api/analytics/monthly
 * Monthly performance comparison data
 * Access: Super Admin, HR, Senior Management
 */
const getMonthlyComparison = async (req, res) => {
  try {
    const { year } = req.query;
    const reportingYear = year ? parseInt(year) : new Date().getFullYear();

    const months = [];
    for (let m = 1; m <= 12; m++) {
      const ms = new Date(reportingYear, m - 1, 1);
      const me = new Date(reportingYear, m, 1);

      const taskResult = await query(
        `SELECT
           COUNT(*) as tasks_due,
           COUNT(CASE WHEN status = 'completed' THEN 1 END) as tasks_completed,
           COUNT(CASE WHEN status = 'overdue' THEN 1 END) as tasks_overdue
         FROM tasks
         WHERE due_at >= $1 AND due_at < $2`,
        [ms, me]
      );
      const tr = taskResult.rows[0];
      const tasksDue = parseInt(tr.tasks_due) || 0;
      const tasksCompleted = parseInt(tr.tasks_completed) || 0;
      const completionRate = safePct(tasksCompleted, tasksDue);

      const attResult = await query(
        `SELECT
           COUNT(CASE WHEN clock_out_at IS NOT NULL THEN 1 END) as clocked_out,
           COUNT(CASE WHEN attendance_status = 'late' THEN 1 END) as late,
           AVG(CASE WHEN clock_out_at IS NOT NULL THEN net_work_seconds END) as avg_net_seconds
         FROM attendance_records
         WHERE created_at >= $1 AND created_at < $2`,
        [ms, me]
      );
      const ar = attResult.rows[0];
      const clockedOut = parseInt(ar.clocked_out) || 0;
      const late = parseInt(ar.late) || 0;

      months.push({
        month: m,
        monthName: ms.toLocaleDateString('en-US', { month: 'long' }),
        tasksDue,
        verifiedCompleted: tasksCompleted,
        completionRate,
        attendanceRate: clockedOut > 0 ? safePct(clockedOut - late, clockedOut) : 0,
        punctualityRate: clockedOut > 0 ? safePct(clockedOut - late, clockedOut) : 0,
        overdueTasks: parseInt(tr.tasks_overdue) || 0,
        avgNetWorkHours: ar.avg_net_seconds ? (parseFloat(ar.avg_net_seconds) / 3600).toFixed(2) : 0
      });
    }

    res.json({
      success: true,
      data: {
        reportingYear,
        months
      }
    });
  } catch (error) {
    console.error('Get monthly comparison error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get monthly comparison'
    });
  }
};

/**
 * GET /api/analytics/attendance
 * Attendance analytics with filters
 * Access: Department Manager, HR, Super Admin
 */
const getAttendanceAnalytics = async (req, res) => {
  try {
    const { startDate, endDate, departmentId, status } = req.query;
    const start = startDate || new Date().toISOString().split('T')[0];
    const end = endDate || start;

    let deptFilter = '';
    const params = [start, end];
    if (departmentId) {
      params.push(departmentId);
      deptFilter = `AND e.department_id = $${params.length}`;
    }
    if (status) {
      params.push(status);
      deptFilter += ` AND ar.attendance_status = $${params.length}`;
    }

    const result = await query(
      `SELECT
         DATE(ar.created_at) as attendance_date,
         ar.attendance_status,
         COUNT(*) as employee_count,
         SUM(ar.net_work_seconds) as total_net_seconds,
         SUM(ar.late_seconds) as total_late_seconds
       FROM attendance_records ar
       JOIN employees e ON ar.employee_id = e.id
       WHERE DATE(ar.created_at) >= $1 AND DATE(ar.created_at) <= $2 ${deptFilter}
       GROUP BY DATE(ar.created_at), ar.attendance_status
       ORDER BY attendance_date DESC`,
      params
    );

    // Group by date
    const byDate = {};
    result.rows.forEach(row => {
      const date = row.attendance_date;
      if (!byDate[date]) byDate[date] = {};
      byDate[date][row.attendance_status] = {
        count: parseInt(row.employee_count),
        netSeconds: parseInt(row.total_net_seconds) || 0,
        lateSeconds: parseInt(row.total_late_seconds) || 0
      };
    });

    res.json({
      success: true,
      data: {
        period: { start, end },
        dailyAttendance: byDate
      }
    });
  } catch (error) {
    console.error('Get attendance analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get attendance analytics'
    });
  }
};

/**
 * GET /api/analytics/productivity
 * Productivity metrics for charts
 * Access: Department Manager, HR, Super Admin
 */
const getProductivityAnalytics = async (req, res) => {
  try {
    const { year, month } = req.query;
    const reportingYear = year ? parseInt(year) : new Date().getFullYear();
    const reportingMonth = month ? parseInt(month) : new Date().getMonth() + 1;
    const startDate = new Date(reportingYear, reportingMonth - 1, 1);
    const endDate = new Date(reportingYear, reportingMonth, 1);

    // Daily task completions
    const dailyResult = await query(
      `SELECT DATE(t.updated_at) as date,
              COUNT(CASE WHEN t.status = 'completed' THEN 1 END) as completions,
              COUNT(CASE WHEN t.status = 'submitted' OR t.status = 'pending_review' THEN 1 END) as submissions
       FROM tasks t
       WHERE t.updated_at >= $1 AND t.updated_at < $2
       GROUP BY DATE(t.updated_at)
       ORDER BY date`,
      [startDate, endDate]
    );

    // Work status distribution
    const statusResult = await query(
      `SELECT t.status, COUNT(*) as count
       FROM tasks t
       WHERE t.due_at >= $1 AND t.due_at < $2
       GROUP BY t.status`,
      [startDate, endDate]
    );

    const statusDistribution = {};
    statusResult.rows.forEach(row => {
      statusDistribution[row.status] = parseInt(row.count);
    });

    res.json({
      success: true,
      data: {
        reportingYear,
        reportingMonth,
        dailyProductivity: dailyResult.rows,
        statusDistribution
      }
    });
  } catch (error) {
    console.error('Get productivity analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get productivity analytics'
    });
  }
};

/**
 * GET /api/analytics/targets
 * Performance targets and achievement
 * Access: Department Manager, HR, Super Admin
 */
const getTargetsAnalytics = async (req, res) => {
  try {
    const { employeeId, departmentId } = req.query;

    let queryText = `
      SELECT pt.*, e.employee_number, d.name as department_name
      FROM performance_targets pt
      LEFT JOIN employees e ON pt.employee_id = e.id
      LEFT JOIN departments d ON pt.department_id = d.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    if (employeeId) {
      paramCount++;
      queryText += ` AND pt.employee_id = $${paramCount}`;
      params.push(employeeId);
    }
    if (departmentId) {
      paramCount++;
      queryText += ` AND pt.department_id = $${paramCount}`;
      params.push(departmentId);
    }

    queryText += ` ORDER BY pt.effective_from DESC`;

    const result = await query(queryText, params);

    const targets = result.rows.map(row => ({
      id: row.id,
      employeeId: row.employee_id,
      departmentId: row.department_id,
      employeeNumber: row.employee_number,
      departmentName: row.department_name,
      targetType: row.target_type,
      targetValue: row.target_value,
      effectiveFrom: row.effective_from,
      effectiveTo: row.effective_to,
      approvedBy: row.approved_by,
      createdAt: row.created_at
    }));

    res.json({
      success: true,
      data: { targets }
    });
  } catch (error) {
    console.error('Get targets analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get targets'
    });
  }
};

/**
 * GET /api/analytics/insights
 * AI-style insights from calculated data
 * Access: Super Admin, HR, Senior Management
 */
const getInsights = async (req, res) => {
  try {
    const { year, month } = req.query;
    const reportingYear = year ? parseInt(year) : new Date().getFullYear();
    const reportingMonth = month ? parseInt(month) : new Date().getMonth() + 1;
    const startDate = new Date(reportingYear, reportingMonth - 1, 1);
    const endDate = new Date(reportingYear, reportingMonth, 1);
    const prevStart = new Date(reportingYear, reportingMonth - 2, 1);
    const prevEnd = new Date(reportingYear, reportingMonth - 1, 1);

    // Current month completion rate
    const currResult = await query(
      `SELECT
         COUNT(*) as total,
         COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed
       FROM tasks WHERE due_at >= $1 AND due_at < $2`,
      [startDate, endDate]
    );
    const curr = currResult.rows[0];
    const currTotal = parseInt(curr.total) || 0;
    const currCompleted = parseInt(curr.completed) || 0;
    const currRate = safePct(currCompleted, currTotal);

    // Previous month completion rate
    const prevResult = await query(
      `SELECT
         COUNT(*) as total,
         COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed
       FROM tasks WHERE due_at >= $1 AND due_at < $2`,
      [prevStart, prevEnd]
    );
    const prev = prevResult.rows[0];
    const prevTotal = parseInt(prev.total) || 0;
    const prevCompleted = parseInt(prev.completed) || 0;
    const prevRate = safePct(prevCompleted, prevTotal);

    const insights = [];

    if (currTotal > 0 && prevTotal > 0) {
      const change = currRate - prevRate;
      if (change > 5) {
        insights.push({
          type: 'improvement',
          title: 'Completion rate improved',
          description: `Task completion rate improved by ${change.toFixed(2)}% compared to last month.`,
          metric: 'completion_rate',
          change: change.toFixed(2)
        });
      } else if (change < -5) {
        insights.push({
          type: 'decline',
          title: 'Completion rate declined',
          description: `Task completion rate declined by ${Math.abs(change).toFixed(2)}% compared to last month.`,
          metric: 'completion_rate',
          change: -Math.abs(change).toFixed(2)
        });
      }
    }

    // Overdue tasks insight
    const overdueResult = await query(
      `SELECT COUNT(*) as cnt FROM tasks WHERE status = 'overdue' AND due_at >= $1 AND due_at < $2`,
      [startDate, endDate]
    );
    const overdue = parseInt(overdueResult.rows[0].cnt);
    if (overdue > 10) {
      insights.push({
        type: 'warning',
        title: 'High overdue workload',
        description: `${overdue} tasks are overdue this month. Management attention required.`,
        metric: 'overdue_tasks',
        change: overdue.toString()
      });
    }

    // Department comparison
    const deptResult = await query(
      `SELECT d.name,
              COUNT(CASE WHEN t.status = 'completed' THEN 1 END) as completed,
              COUNT(*) as total
       FROM departments d
       LEFT JOIN employees e ON e.department_id = d.id
       LEFT JOIN task_assignments ta ON ta.employee_id = e.id
       LEFT JOIN tasks t ON ta.task_id = t.id AND t.due_at >= $1 AND t.due_at < $2
       GROUP BY d.id, d.name
       HAVING COUNT(*) > 0
       ORDER BY completed DESC
       LIMIT 1`,
      [startDate, endDate]
    );
    if (deptResult.rows.length > 0) {
      const top = deptResult.rows[0];
      insights.push({
        type: 'info',
        title: 'Top performing department',
        description: `${top.name} completed the most tasks (${parseInt(top.completed)} of ${parseInt(top.total)}).`,
        metric: 'department_performance',
        change: top.name
      });
    }

    res.json({
      success: true,
      data: {
        reportingYear,
        reportingMonth,
        currentCompletionRate: currRate,
        previousCompletionRate: prevRate,
        monthOverMonthChange: prevTotal > 0 ? ((currRate - prevRate) * 100 / prevRate).toFixed(2) : null,
        insights
      }
    });
  } catch (error) {
    console.error('Get insights error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get insights'
    });
  }
};

module.exports = {
  getStaffAnalytics,
  getDepartmentAnalytics,
  getCompanyAnalytics,
  getMonthlyComparison,
  getAttendanceAnalytics,
  getProductivityAnalytics,
  getTargetsAnalytics,
  getInsights
};
