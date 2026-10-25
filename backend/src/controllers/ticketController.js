const { query, getClient } = require('../config/db');

/**
 * Get all tickets (with filters)
 * GET /api/tickets
 */
const getAllTickets = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, priority, assignedTo } = req.query;
    const offset = (page - 1) * limit;

    let queryText = `
      SELECT t.*, cd.full_name as customer_name,
             au.full_name as assigned_to_name
      FROM tickets t
      LEFT JOIN customer_details cd ON t.customer_id = cd.user_id
      LEFT JOIN users au ON t.assigned_provider_id = au.id
      WHERE 1=1
    `;
    const queryParams = [];
    let paramCount = 0;

    // Customers see only their tickets, providers see assigned or all
    if (req.user.role === 'customer') {
      paramCount++;
      queryText += ` AND t.customer_id = $${paramCount}`;
      queryParams.push(req.user.id);
    } else if (req.user.role === 'provider') {
      // Providers see tickets assigned to them or unassigned
      paramCount++;
      queryText += ` AND (t.assigned_provider_id = $${paramCount} OR t.assigned_provider_id IS NULL)`;
      queryParams.push(req.user.id);
    }

    if (status) {
      paramCount++;
      queryText += ` AND t.status = $${paramCount}`;
      queryParams.push(status);
    }

    if (priority) {
      paramCount++;
      queryText += ` AND t.priority = $${paramCount}`;
      queryParams.push(priority);
    }

    if (assignedTo) {
      paramCount++;
      queryText += ` AND t.assigned_provider_id = $${paramCount}`;
      queryParams.push(assignedTo);
    }

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) FROM (${queryText}) as filtered`,
      queryParams
    );
    const total = parseInt(countResult.rows[0].count);

    // Add pagination
    paramCount++;
    queryText += ` ORDER BY 
      CASE t.priority 
        WHEN 'urgent' THEN 1 
        WHEN 'high' THEN 2 
        WHEN 'medium' THEN 3 
        ELSE 4 
      END, 
      t.created_at DESC 
      LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    queryParams.push(limit, offset);

    const result = await query(queryText, queryParams);

    res.json({
      success: true,
      data: {
        tickets: result.rows,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get all tickets error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get tickets'
    });
  }
};

/**
 * Get ticket by ID
 * GET /api/tickets/:id
 */
const getTicketById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT t.*, cd.full_name as customer_name, cd.email as customer_email,
              au.full_name as assigned_to_name
       FROM tickets t
       LEFT JOIN customer_details cd ON t.customer_id = cd.user_id
       LEFT JOIN users au ON t.assigned_provider_id = au.id
       WHERE t.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    const ticket = result.rows[0];

    // Check access
    if (req.user.role === 'customer' && ticket.customer_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Get ticket responses
    const responsesResult = await query(
      `SELECT tr.*, u.email as user_email, 
              CASE WHEN u.role = 'admin' THEN 'Admin'
                   WHEN u.role = 'provider' THEN 'Support Agent'
                   ELSE 'Customer' END as user_role
       FROM ticket_responses tr
       JOIN users u ON tr.user_id = u.id
       WHERE tr.ticket_id = $1
       ORDER BY tr.created_at ASC`,
      [id]
    );

    res.json({
      success: true,
      data: {
        ...ticket,
        responses: responsesResult.rows
      }
    });
  } catch (error) {
    console.error('Get ticket by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get ticket'
    });
  }
};

/**
 * Create a new ticket (Customer)
 * POST /api/tickets
 */
const createTicket = async (req, res) => {
  const client = await getClient();
  
  try {
    await client.query('BEGIN');

    const { subject, description, priority } = req.body;
    const customerId = req.user.id;

    // Create ticket
    const ticketResult = await client.query(
      `INSERT INTO tickets (customer_id, subject, description, priority, status)
       VALUES ($1, $2, $3, $4, 'open')
       RETURNING *`,
      [customerId, subject, description, priority || 'medium']
    );

    const ticket = ticketResult.rows[0];

    // Create initial response if description is provided
    await client.query(
      `INSERT INTO ticket_responses (ticket_id, user_id, response)
       VALUES ($1, $2, $3)`,
      [ticket.id, customerId, description]
    );

    // Create audit log
    await client.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address)
       VALUES ($1, 'create', 'ticket', $2, $3, $4)`,
      [customerId, ticket.id, JSON.stringify({ subject }), req.ip]
    );

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Ticket created successfully',
      data: ticket
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create ticket error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create ticket'
    });
  } finally {
    client.release();
  }
};

/**
 * Update ticket (Admin/Provider)
 * PUT /api/tickets/:id
 */
const updateTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, priority, assignedProviderId } = req.body;

    // Get current ticket
    const ticketResult = await query(
      'SELECT * FROM tickets WHERE id = $1',
      [id]
    );

    if (ticketResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    // Update ticket
    const result = await query(
      `UPDATE tickets 
       SET status = COALESCE($1, status),
           priority = COALESCE($2, priority),
           assigned_provider_id = COALESCE($3, assigned_provider_id),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING *`,
      [status, priority, assignedProviderId, id]
    );

    // Create audit log
    await query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address)
       VALUES ($1, 'update', 'ticket', $2, $3, $4)`,
      [req.user.id, id, JSON.stringify(req.body), req.ip]
    );

    // Notify customer of update
    const ticket = ticketResult.rows[0];
    await query(
      `INSERT INTO notifications (user_id, type, title, message)
       VALUES ($1, 'in_app', 'Ticket Update', $2)`,
      [ticket.customer_id, `Your support ticket has been updated to: ${status || 'In Progress'}`]
    );

    res.json({
      success: true,
      message: 'Ticket updated successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Update ticket error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update ticket'
    });
  }
};

/**
 * Respond to ticket (Customer/Provider/Admin)
 * POST /api/tickets/:id/respond
 */
const respondToTicket = async (req, res) => {
  const client = await getClient();
  
  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const { response } = req.body;
    const userId = req.user.id;

    // Verify ticket exists
    const ticketResult = await client.query(
      'SELECT * FROM tickets WHERE id = $1',
      [id]
    );

    if (ticketResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    const ticket = ticketResult.rows[0];

    // Check access
    if (req.user.role === 'customer' && ticket.customer_id !== userId) {
      await client.query('ROLLBACK');
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Add response
    const responseResult = await client.query(
      `INSERT INTO ticket_responses (ticket_id, user_id, response)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [id, userId, response]
    );

    // Update ticket status if provider/admin responds
    if (req.user.role !== 'customer') {
      await client.query(
        `UPDATE tickets SET status = 'in_progress', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [id]
      );

      // Notify customer
      await client.query(
        `INSERT INTO notifications (user_id, type, title, message)
         VALUES ($1, 'in_app', 'New Response', $2)`,
        [ticket.customer_id, 'You have a new response to your support ticket']
      );
    }

    // Create audit log
    await client.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address)
       VALUES ($1, 'respond', 'ticket', $2, $3, $4)`,
      [userId, id, JSON.stringify({ responded: true }), req.ip]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Response added successfully',
      data: responseResult.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Respond to ticket error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to respond to ticket'
    });
  } finally {
    client.release();
  }
};

/**
 * Escalate ticket to admin (Provider)
 * POST /api/tickets/:id/escalate
 */
const escalateTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    // Update ticket to escalated status
    const result = await query(
      `UPDATE tickets 
       SET status = 'escalated', 
           priority = 'high',
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    // Create audit log
    await query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address)
       VALUES ($1, 'escalate', 'ticket', $2, $3, $4)`,
      [req.user.id, id, JSON.stringify({ reason }), req.ip]
    );

    // Notify admin
    await query(
      `INSERT INTO notifications (user_id, type, title, message)
       SELECT id, 'in_app', 'Ticket Escalated', $1
       FROM users WHERE role = 'admin'`,
      [`Ticket has been escalated: ${reason}`]
    );

    res.json({
      success: true,
      message: 'Ticket escalated to admin',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Escalate ticket error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to escalate ticket'
    });
  }
};

module.exports = {
  getAllTickets,
  getTicketById,
  createTicket,
  updateTicket,
  respondToTicket,
  escalateTicket
};
