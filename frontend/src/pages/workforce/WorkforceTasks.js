import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api';

// WorkforceTasks - Task Management Page
const WorkforceTasks = () => {
  const navigate = useNavigate();
  const [token] = useState(localStorage.getItem('token'));
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 10, pages: 0 });
  const [filters, setFilters] = useState({ search: '', status: '', priority: '', taskCategory: '', assignedTo: '' });
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '', description: '', taskCategory: 'administrative', priority: 'normal',
    complexityLevel: 1, estimatedEffortMinutes: 60, dueAt: '', assigneeIds: []
  });
  const [, setEditingId] = useState(null);

  const fetchTasks = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.search) params.set('search', filters.search);
      if (filters.status) params.set('status', filters.status);
      if (filters.priority) params.set('priority', filters.priority);
      if (filters.taskCategory) params.set('taskCategory', filters.taskCategory);
      params.set('page', pagination.page);
      params.set('limit', pagination.limit);

      const res = await api.get(`/tasks?${params.toString()}`, token);
      if (res.success) {
        setTasks(res.data.tasks);
        setPagination(res.data.pagination);
      }
    } catch (err) {
      console.error('Fetch tasks error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/tasks', { ...formData, assigneeIds: formData.assigneeIds.filter(Boolean) }, token);
      if (res.success) {
        setShowForm(false);
        setFormData({ title: '', description: '', taskCategory: 'administrative', priority: 'normal', complexityLevel: 1, estimatedEffortMinutes: 60, dueAt: '', assigneeIds: [] });
        fetchTasks();
      } else {
        alert(res.message || 'Failed to create task');
      }
    } catch (err) {
      alert('Failed to create task');
    }
  };

  const handleStart = async (id) => {
    try {
      const res = await api.post(`/tasks/${id}/start`, {}, token);
      if (res.success) fetchTasks();
      else alert(res.message || 'Failed to start task');
    } catch (err) {
      alert('Failed to start task');
    }
  };

  const handleSubmit = async (id) => {
    try {
      const res = await api.post(`/tasks/${id}/submit`, {}, token);
      if (res.success) fetchTasks();
      else alert(res.message || 'Failed to submit task');
    } catch (err) {
      alert('Failed to submit task');
    }
  };

  const handleReview = async (id, decision, qualityScore) => {
    try {
      const res = await api.post(`/tasks/${id}/review`, { reviewDecision: decision, qualityScore, feedback: '' }, token);
      if (res.success) fetchTasks();
      else alert(res.message || 'Failed to review task');
    } catch (err) {
      alert('Failed to review task');
    }
  };

  const statusVariant = (status) => {
    switch (status) {
      case 'completed': return 'badge-accent';
      case 'overdue': return 'badge-danger';
      case 'in_progress': return 'badge-warning';
      case 'pending_review': return 'badge-warning';
      case 'rejected': return 'badge-danger';
      case 'cancelled': return 'badge-primary';
      default: return 'badge-primary';
    }
  };

  return (
    <div className="fade-in">
      <div className="dashboard-header">
        <h1 className="dashboard-title">Task Management</h1>
        <button className="btn btn-primary" onClick={() => { setEditingId(null); setShowForm(true); }}>
          + Create Task
        </button>
      </div>

      <div className="card">
        <div style={{ padding: '16px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="form-group" style={{ flex: 1, minWidth: '200px' }}>
            <input
              className="form-input"
              placeholder="Search tasks..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            />
          </div>
          <select className="form-input" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
            <option value="">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="assigned">Assigned</option>
            <option value="in_progress">In Progress</option>
            <option value="pending_review">Pending Review</option>
            <option value="completed">Completed</option>
            <option value="overdue">Overdue</option>
            <option value="rejected">Rejected</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <select className="form-input" value={filters.priority} onChange={(e) => setFilters({ ...filters, priority: e.target.value })}>
            <option value="">All Priorities</option>
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="loading-spinner"><div className="spinner"></div></div>
      ) : (
        <div className="card">
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '2px solid #eee' }}>
                  <th style={{ padding: '12px' }}>Task Number</th>
                  <th style={{ padding: '12px' }}>Title</th>
                  <th style={{ padding: '12px' }}>Category</th>
                  <th style={{ padding: '12px' }}>Priority</th>
                  <th style={{ padding: '12px' }}>Status</th>
                  <th style={{ padding: '12px' }}>Due Date</th>
                  <th style={{ padding: '12px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map(task => (
                  <tr key={task.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '12px', fontWeight: 'bold' }}>{task.taskNumber}</td>
                    <td style={{ padding: '12px' }}>{task.title}</td>
                    <td style={{ padding: '12px' }}>{task.taskCategory.replace(/_/g, ' ')}</td>
                    <td style={{ padding: '12px' }}><span className={`badge ${statusVariant(task.priority)}`}>{task.priority}</span></td>
                    <td style={{ padding: '12px' }}><span className={`badge ${statusVariant(task.status)}`}>{task.status.replace(/_/g, ' ')}</span></td>
                    <td style={{ padding: '12px' }}>{task.dueAt ? new Date(task.dueAt).toLocaleDateString() : '—'}</td>
                    <td style={{ padding: '12px' }}>
                      <button className="btn btn-sm btn-outline" onClick={() => navigate(`/workforce/tasks/${task.id}`)}>View</button>
                      {task.status === 'assigned' && (
                        <button className="btn btn-sm btn-primary" onClick={() => handleStart(task.id)}>Start</button>
                      )}
                      {task.status === 'in_progress' && (
                        <button className="btn btn-sm btn-primary" onClick={() => handleSubmit(task.id)}>Submit</button>
                      )}
                      {(task.status === 'pending_review') && (
                        <>
                          <button className="btn btn-sm btn-success" onClick={() => handleReview(task.id, 'approved', 100)}>Approve</button>
                          <button className="btn btn-sm btn-danger" onClick={() => handleReview(task.id, 'revision_requested', 50)}>Revision</button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
                {tasks.length === 0 && (
                  <tr>
                    <td colSpan="7" style={{ padding: '24px', textAlign: 'center', color: '#666' }}>
                      No tasks found. Create your first task to get started.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showForm && (
        <div className="card" style={{ marginTop: '24px' }}>
          <div className="card-header">
            <h3 className="card-title">Create New Task</h3>
          </div>
          <form onSubmit={handleCreate} style={{ padding: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Title *</label>
              <input className="form-input" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required />
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Description</label>
              <textarea className="form-input" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3} />
            </div>
            <div className="form-group">
              <label className="form-label">Category</label>
              <select className="form-input" value={formData.taskCategory} onChange={(e) => setFormData({ ...formData, taskCategory: e.target.value })}>
                <option value="quotation_preparation">Quotation Preparation</option>
                <option value="customer_registration">Customer Registration</option>
                <option value="policy_application">Policy Application</option>
                <option value="policy_issuance">Policy Issuance</option>
                <option value="claims_review">Claims Review</option>
                <option value="claims_resolution">Claims Resolution</option>
                <option value="premium_reconciliation">Premium Reconciliation</option>
                <option value="customer_complaints">Customer Complaints</option>
                <option value="underwriting_assessment">Underwriting Assessment</option>
                <option value="renewals_processing">Renewals Processing</option>
                <option value="technical_support">Technical Support</option>
                <option value="administrative">Administrative</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Priority</label>
              <select className="form-input" value={formData.priority} onChange={(e) => setFormData({ ...formData, priority: e.target.value })}>
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Complexity (1-5)</label>
              <input type="number" min="1" max="5" className="form-input" value={formData.complexityLevel} onChange={(e) => setFormData({ ...formData, complexityLevel: parseInt(e.target.value) || 1 })} />
            </div>
            <div className="form-group">
              <label className="form-label">Estimated Effort (min)</label>
              <input type="number" className="form-input" value={formData.estimatedEffortMinutes} onChange={(e) => setFormData({ ...formData, estimatedEffortMinutes: parseInt(e.target.value) || 60 })} />
            </div>
            <div className="form-group">
              <label className="form-label">Due Date</label>
              <input type="datetime-local" className="form-input" value={formData.dueAt} onChange={(e) => setFormData({ ...formData, dueAt: e.target.value })} />
            </div>
            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-sm btn-outline" onClick={() => { setShowForm(false); }}>Cancel</button>
              <button type="submit" className="btn btn-primary">Create Task</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default WorkforceTasks;


