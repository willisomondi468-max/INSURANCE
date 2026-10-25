const { query, getClient } = require('../config/db');
const { v4: uuidv4 } = require('uuid');

/**
 * Helper: format task row for API response
 */
const formatTask = (row) => ({
  id: row.id,
  taskNumber: row.task_number,
  title: row.title,
  description: row.description,
  departmentId: row.department_id,
  taskCategory: row.task_category,
  priority: row.priority,
  complexityLevel: row.complexity_level,
  estimatedEffortMinutes: row.estimated_effort_minutes,
  startAt: row.start_at,
  dueAt: row.due_at,
  status: row.status,
  createdBy: row.created_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

/**
 * Generate a unique task number
 */
const generateTaskNumber = async (client) => {
  const date = new Date();
  const prefix = `TASK-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
  const result = await client.query(
    `SELECT COUNT(*) as cnt FROM tasks WHERE task_number LIKE $1`,
    [prefix + '%']
  );
  const seq = parseInt(result.rows[0].cnt) + 1;
  return `${prefix}-${String(seq).padStart(4, '0')}`;
};

/**
 * GET /api/tasks
 * List tasks with filters, search, pagination
 * Access: Employee, Supervisor, Department Manager, HR, Super Admin
 */
const getAllTasks = async (req, res) => {
  try {
    const {
      page = 1, limit = 20, search, status, priority, departmentId,
      taskCategory, assignedTo, createdBy, startDate, endDate
    } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let queryText = `
      SELECT t.*, d.name as department_name,
             u.email as created_by_email,
             (SELECT COUNT(*) FROM task_assignments ta WHERE ta.task_id = t.id) as assignment_count
      FROM tasks t
      LEFT JOIN departments d ON t.department_id = d.id
      LEFT JOIN users u ON t.created_by = u.id
      WHERE 1=1
    `;
    const queryParams = [];
    let paramCount = 0;

    if (search) {
      paramCount++;
      queryText += ` AND (t.title ILIKE $${paramCount} OR t.description ILIKE $${paramCount} OR t.task_number ILIKE $${paramCount})`;
      queryParams.push(`%${search}%`);
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
    if (departmentId) {
      paramCount++;
      queryText += ` AND t.department_id = $${paramCount}`;
      queryParams.push(departmentId);
    }
    if (taskCategory) {
      paramCount++;
      queryText += ` AND t.task_category = $${paramCount}`;
      queryParams.push(taskCategory);
    }
    if (createdBy) {
      paramCount++;
      queryText += ` AND t.created_by = $${paramCount}`;
      queryParams.push(createdBy);
    }
    if (startDate) {
      paramCount++;
      queryText += ` AND t.due_at >= $${paramCount}`;
      queryParams.push(startDate);
    }
    if (endDate) {
      paramCount++;
      queryText += ` AND t.due_at <= $${paramCount}`;
      queryParams.push(endDate);
    }

    // Filter by assigned employee
    if (assignedTo) {
      paramCount++;
      queryText += ` AND t.id IN (SELECT task_id FROM task_assignments WHERE employee_id = $${paramCount})`;
      queryParams.push(assignedTo);
    }

    const countResult = await query(
      `SELECT COUNT(*) FROM (${queryText}) as filtered`,
      queryParams
    );
    const total = parseInt(countResult.rows[0].count);

    paramCount++;
    queryText += ` ORDER BY t.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    queryParams.push(limit, offset);

    const result = await query(queryText, queryParams);

    res.json({
      success: true,
      data: {
        tasks: result.rows.map(formatTask),
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get all tasks error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get tasks'
    });
  }
};

/**
 * POST /api/tasks
 * Create a new task
 * Access: Department Manager, HR, Super Admin, Supervisor
 */
const createTask = async (req, res) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const {
      title, description, departmentId, taskCategory, priority,
      complexityLevel, estimatedEffortMinutes, startAt, dueAt,
      assigneeIds
    } = req.body;

    const taskNumber = await generateTaskNumber(client);

    const taskResult = await client.query(
      `INSERT INTO tasks (
        task_number, title, description, department_id, task_category,
        priority, complexity_level, estimated_effort_minutes,
        start_at, due_at, status, created_by, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'draft', $11, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *`,
      [
        taskNumber, title, description, departmentId || null, taskCategory,
        priority || 'normal', complexityLevel || 1, estimatedEffortMinutes || 60,
        startAt || null, dueAt || null, req.user.id
      ]
    );

    const task = taskResult.rows[0];

    // Create assignments
    if (assigneeIds && assigneeIds.length > 0) {
      for (const assigneeId of assigneeIds) {
        await client.query(
          `INSERT INTO task_assignments (task_id, employee_id, assigned_by, assigned_at, assignment_status)
           VALUES ($1, $2, $3, CURRENT_TIMESTAMP, 'active')`,
          [task.id, assigneeId, req.user.id]
        );
      }
    }

    // Create audit log
    await client.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address)
       VALUES ($1, 'create', 'task', $2, $3, $4)`,
      [req.user.id, task.id, JSON.stringify(req.body), req.ip]
    );

    await client.query('COMMIT');

    // Fetch full task with assignments
    const fullTask = await query(
      `SELECT t.*, d.name as department_name,
              u.email as created_by_email
       FROM tasks t
       LEFT JOIN departments d ON t.department_id = d.id
       LEFT JOIN users u ON t.created_by = u.id
       WHERE t.id = $1`,
      [task.id]
    );

    res.status(201).json({
      success: true,
      message: 'Task created successfully',
      data: { task: formatTask(fullTask.rows[0]) }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create task error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create task'
    });
  } finally {
    client.release();
  }
};

/**
 * GET /api/tasks/:id
 * Get task by ID with assignments and reviews
 * Access: Employee (assigned), Supervisor, Department Manager, HR, Super Admin
 */
const getTaskById = async (req, res) => {
  try {
    const { id } = req.params;

    const taskResult = await query(
      `SELECT t.*, d.name as department_name,
              u.email as created_by_email
       FROM tasks t
       LEFT JOIN departments d ON t.department_id = d.id
       LEFT JOIN users u ON t.created_by = u.id
       WHERE t.id = $1`,
      [id]
    );

    if (taskResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Get assignments
    const assignmentsResult = await query(
      `SELECT ta.*, e.employee_number, e.job_title, u.email as assignee_email
       FROM task_assignments ta
       JOIN employees e ON ta.employee_id = e.id
       LEFT JOIN users u ON e.user_id = u.id
       WHERE ta.task_id = $1`,
      [id]
    );

    // Get reviews
    const reviewsResult = await query(
      `SELECT tr.*, u.email as reviewer_email
       FROM task_reviews tr
       JOIN users u ON tr.reviewer_id = u.id
       WHERE tr.task_id = $1
       ORDER BY tr.reviewed_at DESC`,
      [id]
    );

    // Get updates
    const updatesResult = await query(
      `SELECT tu.*, e.employee_number
       FROM task_updates tu
       LEFT JOIN employees e ON tu.employee_id = e.id
       WHERE tu.task_id = $1
       ORDER BY tu.created_at DESC`,
      [id]
    );

    // Get submissions
    const submissionsResult = await query(
      `SELECT ts.*, u.email as submitted_by_email
       FROM task_submissions ts
       JOIN users u ON ts.submitted_by = u.id
       WHERE ts.task_id = $1
       ORDER BY ts.submitted_at DESC`,
      [id]
    );

    const task = formatTask(taskResult.rows[0]);
    task.assignments = assignmentsResult.rows;
    task.reviews = reviewsResult.rows;
    task.updates = updatesResult.rows;
    task.submissions = submissionsResult.rows;

    res.json({
      success: true,
      data: { task }
    });
  } catch (error) {
    console.error('Get task by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get task'
    });
  }
};

/**
 * PATCH /api/tasks/:id
 * Update task details
 * Access: Department Manager, HR, Super Admin, Supervisor (created by)
 */
const updateTask = async (req, res) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const {
      title, description, departmentId, taskCategory, priority,
      complexityLevel, estimatedEffortMinutes, startAt, dueAt, status
    } = req.body;

    // Check task exists
    const existing = await client.query('SELECT * FROM tasks WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    const updateResult = await client.query(
      `UPDATE tasks
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           department_id = COALESCE($3, department_id),
           task_category = COALESCE($4, task_category),
           priority = COALESCE($5, priority),
           complexity_level = COALESCE($6, complexity_level),
           estimated_effort_minutes = COALESCE($7, estimated_effort_minutes),
           start_at = COALESCE($8, start_at),
           due_at = COALESCE($9, due_at),
           status = COALESCE($10, status),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $11
       RETURNING *`,
      [
        title, description, departmentId, taskCategory, priority,
        complexityLevel, estimatedEffortMinutes, startAt, dueAt, status, id
      ]
    );

    // Create audit log
    await client.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address)
       VALUES ($1, 'update', 'task', $2, $3, $4)`,
      [req.user.id, id, JSON.stringify(req.body), req.ip]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Task updated successfully',
      data: { task: formatTask(updateResult.rows[0]) }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Update task error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update task'
    });
  } finally {
    client.release();
  }
};

/**
 * DELETE /api/tasks/:id
 * Delete a task (only if draft or cancelled)
 * Access: Department Manager, HR, Super Admin
 */
const deleteTask = async (req, res) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const { id } = req.params;

    const existing = await client.query('SELECT status FROM tasks WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    if (!['draft', 'cancelled'].includes(existing.rows[0].status)) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Cannot delete a task that is not in draft or cancelled status'
      });
    }

    await client.query('DELETE FROM tasks WHERE id = $1', [id]);

    await client.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address)
       VALUES ($1, 'delete', 'task', $2, $3, $4)`,
      [req.user.id, id, JSON.stringify({}), req.ip]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Task deleted successfully'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Delete task error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete task'
    });
  } finally {
    client.release();
  }
};

/**
 * POST /api/tasks/:id/assign
 * Assign employees to a task
 * Access: Department Manager, HR, Super Admin, Supervisor
 */
const assignTask = async (req, res) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const { employeeIds } = req.body;

    if (!employeeIds || !Array.isArray(employeeIds) || employeeIds.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'employeeIds array is required'
      });
    }

    // Verify task exists
    const taskResult = await client.query('SELECT id, status FROM tasks WHERE id = $1', [id]);
    if (taskResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    const createdAssignments = [];
    for (const employeeId of employeeIds) {
      // Prevent duplicate active assignments
      const existing = await client.query(
        `SELECT id FROM task_assignments WHERE task_id = $1 AND employee_id = $2 AND assignment_status = 'active'`,
        [id, employeeId]
      );
      if (existing.rows.length > 0) continue;

      const result = await client.query(
        `INSERT INTO task_assignments (task_id, employee_id, assigned_by, assigned_at, assignment_status)
         VALUES ($1, $2, $3, CURRENT_TIMESTAMP, 'active')
         RETURNING *`,
        [id, employeeId, req.user.id]
      );
      createdAssignments.push(result.rows[0]);
    }

    // Update task status to assigned if it was draft
    if (taskResult.rows[0].status === 'draft') {
      await client.query(
        `UPDATE tasks SET status = 'assigned', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [id]
      );
    }

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Task assigned successfully',
      data: { assignments: createdAssignments }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Assign task error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to assign task'
    });
  } finally {
    client.release();
  }
};

/**
 * POST /api/tasks/:id/start
 * Start working on a task (change status to in_progress)
 * Access: Employee (assigned to task)
 */
const startTask = async (req, res) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const { id } = req.params;

    // Verify employee is assigned to this task
    const empResult = await client.query(
      'SELECT id FROM employees WHERE user_id = $1',
      [req.user.id]
    );
    if (empResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Employee record not found'
      });
    }

    const assignment = await client.query(
      `SELECT * FROM task_assignments WHERE task_id = $1 AND employee_id = $2 AND assignment_status = 'active'`,
      [id, empResult.rows[0].id]
    );
    if (assignment.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(403).json({
        success: false,
        message: 'You are not assigned to this task'
      });
    }

    // Accept the task if not yet accepted
    if (!assignment.rows[0].accepted_at) {
      await client.query(
        `UPDATE task_assignments SET accepted_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [assignment.rows[0].id]
      );
    }

    // Update task status
    await client.query(
      `UPDATE tasks SET status = 'in_progress', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [id]
    );

    // Create task update record
    await client.query(
      `INSERT INTO task_updates (task_id, employee_id, old_status, new_status, progress_percentage, comment, created_at)
       VALUES ($1, $2, 'assigned', 'in_progress', 0, 'Task started', CURRENT_TIMESTAMP)`,
      [id, empResult.rows[0].id]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Task started successfully'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Start task error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start task'
    });
  } finally {
    client.release();
  }
};

/**
 * POST /api/tasks/:id/submit
 * Submit work for review
 * Access: Employee (assigned to task)
 */
const submitTask = async (req, res) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const { submissionNotes } = req.body;

    const empResult = await client.query(
      'SELECT id FROM employees WHERE user_id = $1',
      [req.user.id]
    );
    if (empResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Employee record not found'
      });
    }

    const assignment = await client.query(
      `SELECT * FROM task_assignments WHERE task_id = $1 AND employee_id = $2 AND assignment_status = 'active'`,
      [id, empResult.rows[0].id]
    );
    if (assignment.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(403).json({
        success: false,
        message: 'You are not assigned to this task'
      });
    }

    // Create submission
    const submission = await client.query(
      `INSERT INTO task_submissions (task_id, submitted_by, submission_notes, submitted_at, review_status)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP, 'pending')
       RETURNING *`,
      [id, req.user.id, submissionNotes || null]
    );

    // Update task status
    await client.query(
      `UPDATE tasks SET status = 'pending_review', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [id]
    );

    // Create task update record
    await client.query(
      `INSERT INTO task_updates (task_id, employee_id, old_status, new_status, progress_percentage, comment, created_at)
       VALUES ($1, $2, 'in_progress', 'pending_review', 100, 'Work submitted for review', CURRENT_TIMESTAMP)`,
      [id, empResult.rows[0].id]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Task submitted for review',
      data: { submissionId: submission.rows[0].id }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Submit task error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit task'
    });
  } finally {
    client.release();
  }
};

/**
 * POST /api/tasks/:id/review
 * Review a submitted task (approve/reject/revision)
 * Access: Department Manager, HR, Super Admin, Supervisor
 */
const reviewTask = async (req, res) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const { reviewDecision, qualityScore, feedback } = req.body;

    if (!['approved', 'revision_requested', 'rejected'].includes(reviewDecision)) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Invalid review decision'
      });
    }

    // Verify there's a pending submission
    const submission = await client.query(
      `SELECT * FROM task_submissions WHERE task_id = $1 AND review_status = 'pending' ORDER BY submitted_at DESC LIMIT 1`,
      [id]
    );
    if (submission.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'No pending submission found for this task'
      });
    }

    // Create review
    const review = await client.query(
      `INSERT INTO task_reviews (task_id, reviewer_id, review_decision, quality_score, feedback, reviewed_at)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
       RETURNING *`,
      [id, req.user.id, reviewDecision, qualityScore || null, feedback || null]
    );

    // Update submission status
    await client.query(
      `UPDATE task_submissions SET review_status = $1 WHERE id = $2`,
      [reviewDecision, submission.rows[0].id]
    );

    // Update task status based on decision
    let newStatus;
    if (reviewDecision === 'approved') {
      newStatus = 'completed';
    } else if (reviewDecision === 'rejected') {
      newStatus = 'rejected';
    } else {
      newStatus = 'revision_requested';
    }

    await client.query(
      `UPDATE tasks SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [newStatus, id]
    );

    // Create task update record
    await client.query(
      `INSERT INTO task_updates (task_id, employee_id, old_status, new_status, progress_percentage, comment, created_at)
       VALUES ($1, $2, 'pending_review', $3, $4, $5, CURRENT_TIMESTAMP)`,
      [id, null, newStatus, reviewDecision === 'approved' ? 100 : 0, feedback || `Review: ${reviewDecision}`]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      message: `Task ${reviewDecision}`,
      data: { reviewId: review.rows[0].id, decision: reviewDecision, qualityScore }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Review task error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to review task'
    });
  } finally {
    client.release();
  }
};

/**
 * GET /api/tasks/summary
 * Task summary dashboard metrics
 * Access: Employee, Supervisor, Department Manager, HR, Super Admin
 */
const getTaskSummary = async (req, res) => {
  try {
    const { employeeId, departmentId, startDate, endDate } = req.query;
    const today = new Date().toISOString().split('T')[0];
    const start = startDate || today;
    const end = endDate || today;

    let deptFilter = '';
    const params = [start, end];
    if (departmentId) {
      params.push(departmentId);
      deptFilter = `AND t.department_id = $${params.length}`;
    }

    let empFilter = '';
    if (employeeId) {
      params.push(employeeId);
      empFilter = `AND ta.employee_id = $${params.length}`;
    }

    // Total tasks due
    const dueResult = await query(
      `SELECT COUNT(*) as cnt FROM tasks t
       LEFT JOIN task_assignments ta ON t.id = ta.task_id
       WHERE t.due_at >= $1 AND t.due_at <= $2 ${deptFilter} ${empFilter}`,
      params
    );
    const tasksDue = parseInt(dueResult.rows[0].cnt);

    // Verified completed
    const completedResult = await query(
      `SELECT COUNT(*) as cnt FROM tasks t
       LEFT JOIN task_assignments ta ON t.id = ta.task_id
       WHERE t.status = 'completed' ${deptFilter} ${empFilter}`,
      params
    );
    const completed = parseInt(completedResult.rows[0].cnt);

    // Overdue
    const overdueResult = await query(
      `SELECT COUNT(*) as cnt FROM tasks t
       LEFT JOIN task_assignments ta ON t.id = ta.task_id
       WHERE t.status = 'overdue' ${deptFilter} ${empFilter}`,
      params
    );
    const overdue = parseInt(overdueResult.rows[0].cnt);

    // In progress
    const inProgressResult = await query(
      `SELECT COUNT(*) as cnt FROM tasks t
       LEFT JOIN task_assignments ta ON t.id = ta.task_id
       WHERE t.status = 'in_progress' ${deptFilter} ${empFilter}`,
      params
    );
    const inProgress = parseInt(inProgressResult.rows[0].cnt);

    // Pending review
    const pendingReviewResult = await query(
      `SELECT COUNT(*) as cnt FROM tasks t
       LEFT JOIN task_assignments ta ON t.id = ta.task_id
       WHERE t.status = 'pending_review' ${deptFilter} ${empFilter}`,
      params
    );
    const pendingReview = parseInt(pendingReviewResult.rows[0].cnt);

    const completionRate = tasksDue > 0 ? ((completed / tasksDue) * 100).toFixed(2) : 0;

    res.json({
      success: true,
      data: {
        period: { start, end },
        tasksDue,
        verifiedCompleted: completed,
        overdue,
        inProgress,
        pendingReview,
        completionRate: parseFloat(completionRate)
      }
    });
  } catch (error) {
    console.error('Get task summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get task summary'
    });
  }
};

module.exports = {
  getAllTasks,
  createTask,
  getTaskById,
  updateTask,
  deleteTask,
  assignTask,
  startTask,
  submitTask,
  reviewTask,
  getTaskSummary
};
