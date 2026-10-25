const { query } = require('../config/db');
const PDFDocument = require('pdfkit');

/**
 * Safe percentage calculation
 */
const safePct = (num, den) => den ? ((num / den) * 100).toFixed(2) : '0.00';

/**
 * GET /api/reports/monthly
 * Generate monthly performance report as PDF or CSV
 * Query: year, month, format (pdf|csv)
 */
const generateMonthlyReport = async (req, res) => {
  try {
    const { year, month, format } = req.query;
    const reportingYear = year ? parseInt(year) : new Date().getFullYear();
    const reportingMonth = month ? parseInt(month) : new Date().getMonth() + 1;
    const reportFormat = format || 'pdf';

    const startDate = new Date(reportingYear, reportingMonth - 1, 1);
    const endDate = new Date(reportingYear, reportingMonth, 1);
    const monthName = startDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    // Fetch all data needed for the report
    const [empResult, taskResult, attResult, deptResult, snapshotResult] = await Promise.all([
      query(`SELECT COUNT(*) as cnt FROM employees WHERE employment_status = 'active'`),
      query(`
        SELECT
          COUNT(*) as tasks_due,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as tasks_completed,
          COUNT(CASE WHEN status = 'overdue' THEN 1 END) as tasks_overdue,
          COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as tasks_in_progress,
          COUNT(CASE WHEN status = 'pending_review' THEN 1 END) as tasks_pending_review
        FROM tasks
        WHERE due_at >= $1 AND due_at < $2
      `, [startDate, endDate]),
      query(`
        SELECT
          COUNT(CASE WHEN clock_out_at IS NULL THEN 1 END) as clocked_in,
          COUNT(CASE WHEN attendance_status = 'on_break' THEN 1 END) as on_break,
          COUNT(CASE WHEN clock_out_at IS NOT NULL THEN 1 END) as clocked_out,
          COUNT(CASE WHEN attendance_status = 'late' THEN 1 END) as late,
          SUM(net_work_seconds) as total_net_seconds,
          SUM(late_seconds) as total_late_seconds
        FROM attendance_records
        WHERE created_at >= $1 AND created_at < $2
      `, [startDate, endDate]),
      query(`
        SELECT d.name as department_name,
               COUNT(DISTINCT e.id) as employee_count,
               COALESCE(SUM(CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END), 0) as tasks_completed,
               COALESCE(COUNT(DISTINCT t.id), 0) as tasks_assigned
        FROM departments d
        LEFT JOIN employees e ON e.department_id = d.id AND e.employment_status = 'active'
        LEFT JOIN task_assignments ta ON ta.employee_id = e.id
        LEFT JOIN tasks t ON ta.task_id = t.id AND t.due_at >= $1 AND t.due_at < $2
        GROUP BY d.id, d.name
        ORDER BY d.name
      `, [startDate, endDate]),
      query(`SELECT * FROM monthly_performance_snapshots WHERE reporting_year = $1 AND reporting_month = $2`, [reportingYear, reportingMonth])
    ]);

    const totalEmployees = parseInt(empResult.rows[0].cnt) || 0;
    const tasks = taskResult.rows[0];
    const tasksDue = parseInt(tasks.tasks_due) || 0;
    const tasksCompleted = parseInt(tasks.tasks_completed) || 0;
    const tasksOverdue = parseInt(tasks.tasks_overdue) || 0;
    const completionRate = safePct(tasksCompleted, tasksDue);

    const att = attResult.rows[0];
    const clockedIn = parseInt(att.clocked_in) || 0;
    const clockedOut = parseInt(att.clocked_out) || 0;
    const late = parseInt(att.late) || 0;
    const attendanceRate = safePct(clockedIn + clockedOut, totalEmployees);
    const punctualityRate = safePct(clockedIn + clockedOut - late, clockedIn + clockedOut);
    const totalNetSeconds = parseInt(att.total_net_seconds) || 0;

    if (reportFormat === 'csv') {
      // Generate CSV
      const csvLines = [];
      csvLines.push(`InsuraVault Monthly Performance Report`);
      csvLines.push(`Reporting Period: ${monthName}`);
      csvLines.push(`Generated: ${new Date().toISOString()}`);
      csvLines.push('');
      csvLines.push(`EXECUTIVE SUMMARY`);
      csvLines.push(`Total Active Employees,${totalEmployees}`);
      csvLines.push(`Tasks Due,${tasksDue}`);
      csvLines.push(`Verified Completed,${tasksCompleted}`);
      csvLines.push(`Completion Rate,${completionRate}%`);
      csvLines.push(`Overdue Tasks,${tasksOverdue}`);
      csvLines.push(`Attendance Rate,${attendanceRate}%`);
      csvLines.push(`Punctuality Rate,${punctualityRate}%`);
      csvLines.push(`Total Net Work Hours,${(totalNetSeconds / 3600).toFixed(2)}`);
      csvLines.push('');
      csvLines.push(`DEPARTMENT PERFORMANCE`);
      csvLines.push(`Department,Employees,Tasks Assigned,Tasks Completed,Completion Rate`);
      deptResult.rows.forEach(d => {
        const deptCompletionRate = safePct(parseInt(d.tasks_completed), parseInt(d.tasks_assigned));
        csvLines.push(`${d.department_name},${d.employee_count},${d.tasks_assigned},${d.tasks_completed},${deptCompletionRate}%`);
      });
      csvLines.push('');
      csvLines.push(`MONTHLY TRENDS (last 6 months)`);
      csvLines.push(`Month,Tasks Due,Tasks Completed,Completion Rate`);
      for (let i = 5; i >= 0; i--) {
        const m = new Date(reportingYear, reportingMonth - 1 - i, 1);
        const my = m.getFullYear();
        const mm = m.getMonth() + 1;
        const ms = new Date(my, mm - 1, 1);
        const me = new Date(my, mm, 1);
        const mt = await query(
          `SELECT COUNT(*) as total, COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed FROM tasks WHERE due_at >= $1 AND due_at < $2`,
          [ms, me]
        );
        const mtr = mt.rows[0];
        const mtDue = parseInt(mtr.total) || 0;
        const mtComp = parseInt(mtr.completed) || 0;
        csvLines.push(`${ms.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })},${mtDue},${mtComp},${safePct(mtComp, mtDue)}%`);
      }

      const csvContent = csvLines.join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="monthly-report-${reportingYear}-${reportingMonth}.csv"`);
      return res.send(csvContent);
    }

    // PDF generation using pdfkit
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const filename = `monthly-report-${reportingYear}-${reportingMonth}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    doc.pipe(res);

    // Header
    doc.fontSize(20).font('Helvetica-Bold').text('InsuraVault Insurance Management System', { align: 'center' });
    doc.fontSize(14).font('Helvetica').text('Monthly Performance Report', { align: 'center' });
    doc.fontSize(12).text(`Reporting Period: ${monthName}`, { align: 'center' });
    doc.fontSize(10).text(`Generated: ${new Date().toISOString()}`, { align: 'center' });
    doc.moveDown();

    // Executive Summary
    doc.fontSize(14).font('Helvetica-Bold').text('Executive Summary');
    doc.fontSize(10).font('Helvetica');
    const summaryData = [
      ['Total Active Employees', totalEmployees.toString()],
      ['Tasks Due', tasksDue.toString()],
      ['Verified Completed', tasksCompleted.toString()],
      ['Completion Rate', `${completionRate}%`],
      ['Overdue Tasks', tasksOverdue.toString()],
      ['Attendance Rate', `${attendanceRate}%`],
      ['Punctuality Rate', `${punctualityRate}%`],
      ['Total Net Work Hours', (totalNetSeconds / 3600).toFixed(2)],
    ];
    summaryData.forEach(([label, value]) => {
      doc.font('Helvetica-Bold').text(`${label}: `, { continued: true });
      doc.font('Helvetica').text(value);
    });
    doc.moveDown();

    // Department Performance
    doc.fontSize(14).font('Helvetica-Bold').text('Department Performance');
    doc.fontSize(10).font('Helvetica');
    deptResult.rows.forEach(d => {
      const deptCompletionRate = safePct(parseInt(d.tasks_completed), parseInt(d.tasks_assigned));
      doc.font('Helvetica-Bold').text(d.department_name, { continued: true });
      doc.font('Helvetica').text(` - Employees: ${d.employee_count}, Tasks: ${d.tasks_completed}/${d.tasks_assigned}, Completion: ${deptCompletionRate}%`);
    });
    doc.moveDown();

    // Monthly Trends
    doc.fontSize(14).font('Helvetica-Bold').text('Monthly Trends (Last 6 Months)');
    doc.fontSize(10).font('Helvetica');
    for (let i = 5; i >= 0; i--) {
      const m = new Date(reportingYear, reportingMonth - 1 - i, 1);
      const my = m.getFullYear();
      const mm = m.getMonth() + 1;
      const ms = new Date(my, mm - 1, 1);
      const me = new Date(my, mm, 1);
      const mt = await query(
        `SELECT COUNT(*) as total, COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed FROM tasks WHERE due_at >= $1 AND due_at < $2`,
        [ms, me]
      );
      const mtr = mt.rows[0];
      const mtDue = parseInt(mtr.total) || 0;
      const mtComp = parseInt(mtr.completed) || 0;
      doc.text(`${ms.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}: ${mtComp}/${mtDue} tasks completed (${safePct(mtComp, mtDue)}%)`);
    }
    doc.moveDown();

    // Footer
    doc.fontSize(8).font('Helvetica-Oblique').text('This report was generated from real-time database records.', { align: 'center' });

    doc.end();
  } catch (error) {
    console.error('Generate monthly report error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'Failed to generate report' });
    }
  }
};

module.exports = {
  generateMonthlyReport
};
