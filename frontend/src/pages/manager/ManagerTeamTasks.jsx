import React, { useState, useEffect, useCallback } from 'react';
import api from '../../api';
import { Toaster, toast } from 'react-hot-toast';
import { date, statusVariant, humanize } from '../../api';

// Manager Team Tasks - view and manage team tasks
const ManagerTeamTasks = () => {
  const [tasks, setTasks] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 50, pages: 0 });
  const [filters, setFilters] = useState({ status: '', priority: '', employeeId: '' });

  const fetchTasks = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      params.set('page', pagination.page);
      params.set('limit', pagination.limit);
      if (filters.status) params.set('status', filters.status);
      if (filters.priority) params.set('priority', filters.priority);
      if (filters.employeeId) params.set('employeeId', filters.employeeId);

      const res = await api.get(`/manager/tasks?${params.toString()}`);
      if (res.success) {
        setTasks(res.data.tasks);
        setPagination(res.data.pagination);
      }
    } catch (err) {
      toast.error('Failed to load tasks');
    }
  }, [pagination.page, pagination.limit, filters.status, filters.priority, filters.employeeId]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  return (
    <div className="fade-in">
      <Toaster position="top-right" />
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Team Tasks</h1>
          <p className="dashboard-subtitle">Monitor task assignments, completion, and overdue items</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            <div>
              <label className="form-label">Status</label>
              <select
                value={filters.status}
                onChange={e => setFilters({ ...filters, status: e.target.value })}
                className="form-input"
              >
                <option value="">All Status</option>
                <option value="assigned">Assigned</option>
                <option value="in_progress">In Progress</option>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
                <option value="overdue">Overdue</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div>
              <label className="form-label">Priority</label>
              <select
                value={filters.priority}
                onChange={e => setFilters({ ...filters, priority: e.target.value })}
                className="form-input"
              >
                <option value="">All Priority</option>
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '2px solid #eee' }}>
                  <th style={{ padding: '12px' }}>Task</th>
                  <th style={{ padding: '12px' }}>Category</th>
                  <th style={{ padding: '12px' }}>Priority</th>
                  <th style={{ padding: '12px' }}>Assignee</th>
                  <th style={{ padding: '12px' }}>Status</th>
                  <th style={{ padding: '12px' }}>Due Date</th>
                </tr>
              </thead>
              <tbody>
                {tasks.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
                      No tasks found.
                    </td>
                  </tr>
                ) : (
                  tasks.map((t) => (
                    <tr key={t.id} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '12px', fontWeight: '600' }}>{t.title}</td>
                      <td style={{ padding: '12px' }}>{humanize(t.task_category)}</td>
                      <td style={{ padding: '12px' }}>
                        <span className={`badge ${t.priority === 'urgent' ? 'badge-danger' : t.priority === 'high' ? 'badge-warning' : 'badge-primary'}`}>
                          {humanize(t.priority)}
                        </span>
                      </td>
                      <td style={{ padding: '12px' }}>{t.assigned_email || 'Unassigned'}</td>
                      <td style={{ padding: '12px' }}>
                        <span className={`badge ${statusVariant(t.status)}`}>
                          {humanize(t.status)}
                        </span>
                      </td>
                      <td style={{ padding: '12px' }}>{date(t.due_at)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManagerTeamTasks;
