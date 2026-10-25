const { query } = require('../config/db');
const PDFDocument = require('pdfkit');
const { Parser } = require('json2csv');

/**
 * Get admin dashboard statistics
 * GET /api/dashboard/stats
 */
const getDashboardStats = async (req, res) => {
  try {
    // Total customers
    const customerCountResult = await query(
      "SELECT COUNT(*) FROM users WHERE role = 'customer'"
    );

    // Active policies
    const activePoliciesResult = await query(
      "SELECT COUNT(*) FROM policies WHERE status = 'active'"
    );

    // Pending claims
    const pendingClaimsResult = await query(
      "SELECT COUNT(*) FROM claims WHERE status IN ('pending', 'under_review')"
    );

    // Total revenue (completed payments)
    const revenueResult = await query(
      "SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE status = 'completed'"
    );

    // Open tickets
    const openTicketsResult = await query(
      "SELECT COUNT(*) FROM tickets WHERE status IN ('open', 'in_progress')"
    );

    // Recent registrations
    const recentRegistrationsResult = await query(
      `SELECT COUNT(*) FROM users 
       WHERE role = 'customer' 
       AND created_at > NOW() - INTERVAL '30 days'`
    );

    // Policy status breakdown
    const policyStatusResult = await query(
      `SELECT status, COUNT(*) as count FROM policies GROUP BY status`
    );

    // Claim status breakdown
    const claimStatusResult = await query(
      `SELECT status, COUNT(*) as count FROM claims GROUP BY status`
    );

    // Top plans by enrollment
    const topPlansResult = await query(
      `SELECT ip.name, COUNT(p.id) as policy_count
       FROM insurance_plans ip
       LEFT JOIN policies p ON ip.id = p.plan_id
       GROUP BY ip.id, ip.name
       ORDER BY policy_count DESC
       LIMIT 5`
    );

    // Monthly revenue (last 6 months)
    const monthlyRevenueResult = await query(
      `SELECT 
         DATE_TRUNC('month', payment_date) as month,
         SUM(amount) as revenue,
         COUNT(*) as payment_count
       FROM payments 
       WHERE status = 'completed' 
       AND payment_date > NOW() - INTERVAL '6 months'
       GROUP BY DATE_TRUNC('month', payment_date)
       ORDER BY month`
    );

    res.json({
      success: true,
      data: {
        stats: {
          totalCustomers: parseInt(customerCountResult.rows[0].count),
          activePolicies: parseInt(activePoliciesResult.rows[0].count),
          pendingClaims: parseInt(pendingClaimsResult.rows[0].count),
          totalRevenue: parseFloat(revenueResult.rows[0].total),
          openTickets: parseInt(openTicketsResult.rows[0].count),
          recentRegistrations: parseInt(recentRegistrationsResult.rows[0].count)
        },
        policyStatusBreakdown: policyStatusResult.rows,
        claimStatusBreakdown: claimStatusResult.rows,
        topPlans: topPlansResult.rows,
        monthlyRevenue: monthlyRevenueResult.rows
      }
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get dashboard statistics'
    });
  }
};

/**
 * Get service provider dashboard
 * GET /api/dashboard/provider
 */
const getProviderDashboard = async (req, res) => {
  try {
    const providerId = req.user.id;

    // Assigned tickets
    const assignedTicketsResult = await query(
      `SELECT COUNT(*) FROM tickets 
       WHERE assigned_provider_id = $1 AND status IN ('open', 'in_progress')`,
      [providerId]
    );

    // Tickets by status
    const ticketStatusResult = await query(
      `SELECT status, COUNT(*) as count 
       FROM tickets 
       WHERE assigned_provider_id = $1 
       GROUP BY status`,
      [providerId]
    );

    // Recent tickets
    const recentTicketsResult = await query(
      `SELECT t.*, cd.full_name as customer_name
       FROM tickets t
       LEFT JOIN customer_details cd ON t.customer_id = cd.user_id
       WHERE t.assigned_provider_id = $1
       ORDER BY t.created_at DESC
       LIMIT 10`,
      [providerId]
    );

    // Recent claims to review
    const claimsToReviewResult = await query(
      `SELECT c.*, p.policy_number, cd.full_name as customer_name
       FROM claims c
       LEFT JOIN policies p ON c.policy_id = p.id
       LEFT JOIN customer_details cd ON c.customer_id = cd.user_id
       WHERE c.status = 'pending'
       ORDER BY c.created_at DESC
       LIMIT 5`
    );

    res.json({
      success: true,
      data: {
        stats: {
          assignedTickets: parseInt(assignedTicketsResult.rows[0].count)
        },
        ticketStatusBreakdown: ticketStatusResult.rows,
        recentTickets: recentTicketsResult.rows,
        claimsToReview: claimsToReviewResult.rows
      }
    });
  } catch (error) {
    console.error('Get provider dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get provider dashboard'
    });
  }
};

/**
 * Generate PDF report
 * GET /api/reports/pdf/:type
 */
const generatePDFReport = async (req, res) => {
  try {
    const { type } = req.params;
    const { startDate, endDate } = req.query;

    const doc = new PDFDocument();

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${type}-report.pdf`);

    doc.pipe(res);

    // Add title
    doc.fontSize(20).text(`${type.toUpperCase()} Report`, { align: 'center' });
    doc.moveDown();
    
    if (startDate && endDate) {
      doc.fontSize(12).text(`Period: ${startDate} to ${endDate}`, { align: 'center' });
    }
    
    doc.moveDown();

    let data;
    let headers;

    switch (type) {
      case 'customers':
        data = await query(`
          SELECT cd.full_name, cd.email, cd.phone, u.is_active, u.created_at
          FROM customer_details cd
          JOIN users u ON cd.user_id = u.id
          WHERE u.role = 'customer'
          ORDER BY u.created_at DESC
        `);
        headers = ['Name', 'Email', 'Phone', 'Active', 'Created'];
        break;
        
      case 'policies':
        data = await query(`
          SELECT p.policy_number, cd.full_name as customer, ip.name as plan, 
                 p.status, p.start_date, p.end_date
          FROM policies p
          LEFT JOIN customer_details cd ON p.customer_id = cd.user_id
          LEFT JOIN insurance_plans ip ON p.plan_id = ip.id
          ORDER BY p.created_at DESC
        `);
        headers = ['Policy #', 'Customer', 'Plan', 'Status', 'Start', 'End'];
        break;
        
      case 'claims':
        data = await query(`
          SELECT c.claim_number, cd.full_name as customer, c.claim_type,
                 c.amount_claimed, c.status, c.created_at
          FROM claims c
          LEFT JOIN customer_details cd ON c.customer_id = cd.user_id
          ORDER BY c.created_at DESC
        `);
        headers = ['Claim #', 'Customer', 'Type', 'Amount', 'Status', 'Date'];
        break;
        
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid report type'
        });
    }

    // Add table
    doc.fontSize(12);
    
    // Headers
    let y = 150;
    headers.forEach((header, i) => {
      doc.text(header, 50 + (i * 100), y);
    });
    
    y += 20;
    
    // Data rows
    doc.fontSize(10);
    data.rows.slice(0, 30).forEach(row => {
      let x = 50;
      Object.values(row).forEach(value => {
        doc.text(String(value || ''), x, y);
        x += 100;
      });
      y += 20;
    });

    // Add generation timestamp
    doc.fontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 50, 750);

    doc.end();
  } catch (error) {
    console.error('Generate PDF report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate PDF report'
    });
  }
};

/**
 * Generate CSV report
 * GET /api/reports/csv/:type
 */
const generateCSVReport = async (req, res) => {
  try {
    const { type } = req.params;

    let data;
    const fields = [];

    switch (type) {
      case 'customers':
        data = await query(`
          SELECT cd.full_name, cd.id_number, cd.email, cd.phone, 
                 cd.address, u.is_active, u.created_at
          FROM customer_details cd
          JOIN users u ON cd.user_id = u.id
          WHERE u.role = 'customer'
          ORDER BY u.created_at DESC
        `);
        fields = ['full_name', 'id_number', 'email', 'phone', 'address', 'is_active', 'created_at'];
        break;
        
      case 'policies':
        data = await query(`
          SELECT p.policy_number, cd.full_name as customer_name, ip.name as plan_name, 
                 p.status, p.premium_amount, p.coverage_amount, p.start_date, p.end_date
          FROM policies p
          LEFT JOIN customer_details cd ON p.customer_id = cd.user_id
          LEFT JOIN insurance_plans ip ON p.plan_id = ip.id
          ORDER BY p.created_at DESC
        `);
        fields = ['policy_number', 'customer_name', 'plan_name', 'status', 'premium_amount', 'coverage_amount', 'start_date', 'end_date'];
        break;
        
      case 'claims':
        data = await query(`
          SELECT c.claim_number, cd.full_name as customer_name, c.claim_type,
                 c.amount_claimed, c.status, c.description, c.created_at
          FROM claims c
          LEFT JOIN customer_details cd ON c.customer_id = cd.user_id
          ORDER BY c.created_at DESC
        `);
        fields = ['claim_number', 'customer_name', 'claim_type', 'amount_claimed', 'status', 'description', 'created_at'];
        break;
        
      case 'payments':
        data = await query(`
          SELECT pay.transaction_id, cd.full_name as customer_name,
                 p.policy_number, pay.amount, pay.payment_method, pay.status, pay.payment_date
          FROM payments pay
          LEFT JOIN customer_details cd ON pay.customer_id = cd.user_id
          LEFT JOIN policies p ON pay.policy_id = p.id
          ORDER BY pay.payment_date DESC
        `);
        fields = ['transaction_id', 'customer_name', 'policy_number', 'amount', 'payment_method', 'status', 'payment_date'];
        break;
        
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid report type'
        });
    }

    // Convert to CSV
    const parser = new Parser({ fields });
    const csv = parser.parse(data.rows);

    // Set response headers
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=${type}-report.csv`);

    res.send(csv);
  } catch (error) {
    console.error('Generate CSV report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate CSV report'
    });
  }
};

/**
 * Get audit logs (Admin only)
 * GET /api/audit-logs
 */
const getAuditLogs = async (req, res) => {
  try {
    const { page = 1, limit = 50, userId, action, entityType } = req.query;
    const offset = (page - 1) * limit;

    let queryText = `
      SELECT al.*, u.email as user_email
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE 1=1
    `;
    const queryParams = [];
    let paramCount = 0;

    if (userId) {
      paramCount++;
      queryText += ` AND al.user_id = $${paramCount}`;
      queryParams.push(userId);
    }

    if (action) {
      paramCount++;
      queryText += ` AND al.action = $${paramCount}`;
      queryParams.push(action);
    }

    if (entityType) {
      paramCount++;
      queryText += ` AND al.entity_type = $${paramCount}`;
      queryParams.push(entityType);
    }

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) FROM (${queryText}) as filtered`,
      queryParams
    );
    const total = parseInt(countResult.rows[0].count);

    // Add pagination
    paramCount++;
    queryText += ` ORDER BY al.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    queryParams.push(limit, offset);

    const result = await query(queryText, queryParams);

    res.json({
      success: true,
      data: {
        logs: result.rows,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get audit logs'
    });
  }
};

module.exports = {
  getDashboardStats,
  getProviderDashboard,
  generatePDFReport,
  generateCSVReport,
  getAuditLogs
};
