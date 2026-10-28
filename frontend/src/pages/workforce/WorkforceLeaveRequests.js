import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api.js';
import CinematicDashboardHero from '../../components/CinematicDashboardHero.jsx';

/**
 * WorkforceLeaveRequests - Leave Requests Page
 * Submit, approve, reject leave requests
 */
const WorkforceLeaveRequests = () => {
  const navigate = useNavigate();
  const [token] = useState(localStorage.getItem('token'));
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: '', employeeId: '' });
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    employeeId: '', leaveType: 'annual', startDate: '', endDate: '', reason: ''
  });
  const [employees, setEmployees] = useState([]);

  const fetchLeaveRequests = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.status) params.set('status', filters.status);
      if (filters.employeeId) params.set('employeeId', filters.employeeId);
      const res = await api.get(`/leave-requests?${params.toString()}`, token);
      if (res.success) setLeaveRequests(res.data.leaveRequests);
    } catch (err) {
      console.error('Fetch leave requests error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await api.get('/employees', token);
      if (res.success) setEmployees(res.data.employees);
    } catch (err) {
      console.error('Fetch employees error:', err);
    }
  };

  useEffect(() => {
    fetchLeaveRequests();
    fetchEmployees();
  }, [fetchLeaveRequests, fetchEmployees]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/leave-requests', formData, token);
      if (res.success) {
        setShowForm(false);
        setFormData({ employeeId: '', leaveType: 'annual', startDate: '', endDate: '', reason: '' });
        fetchLeaveRequests();
      } else {
        alert(res.message || 'Failed to create leave request');
      }
    } catch (err) {
      alert('Failed to create leave request');
    }
  };

  const handleApprove = async (id, decision) => {
    if (!window.confirm(`Are you sure you want to ${decision} this leave request?`)) return;
    try {
      const res = await api.patch(`/leave-requests/${id}/approve`, { decision }, token);
      if (res.success) fetchLeaveRequests();
      else alert(res.message || 'Failed to review leave request');
    } catch (err) {
      alert('Failed to review leave request');
    }
  };

  const statusVariant = (status) => {
    switch (status) {
      case 'approved': return 'badge-success';
      case 'rejected': return 'badge-danger';
      case 'pending': return 'badge-warning';
      default: return 'badge-primary';
    }
  };

  return (
    <div className="fade-in">
      <CinematicDashboardHero
        title="Leave Requests"
        subtitle="Submit, approve, and manage leave applications"
        role="company_admin"
        actions={[
          <button key="requestLeave" className="btn btn-primary btn-sm" onClick={() => setShowForm(true)}>
            + Request Leave
          </button>
        ]}
      />

      <div style={{ padding: '0 24px 48px 24px', maxWidth: '1400px', margin: '0 auto' }}>
        {/* Filters */}
        <div className="card" style={{ marginBottom: '24px' }}>
          <div style={{ padding: '24px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
            <select className="form-input" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <select className="form-input" value={filters.employeeId} onChange={(e) => setFilters({ ...filters, employeeId: e.target.value })}>
              <option value="">All Employees</option>
              {employees.map(e => (
                <option key={e.id} value={e.id}>{e.employeeNumber} - {e.jobTitle}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="loading-spinner" style={{ padding: '60px 0' }}>
          <div className="spinner"></div>
        </div>
      ) : (
        <div className="card">
          <div style={{ padding: '0 24px', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '2px solid #eee' }}>
                  <th style={{ padding: '16px' }}>Employee</th>
                  <th style={{ padding: '16px' }}>Leave Type</th>
                  <th style={{ padding: '16px' }}>Start Date</th>
                  <th style={{ padding: '16px' }}>End Date</th>
                  <th style={{ padding: '16px' }}>Reason</th>
                  <th style={{ padding: '16px' }}>Status</th>
                  <th style={{ padding: '16px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {leaveRequests.map(lr => (
                  <tr key={lr.id} style={{ borderBottom: '1px solid rgba(6,27,51,0.06)' }}>
                    <td style={{ padding: '16px' }}>{lr.employeeNumber}</td>
                    <td style={{ padding: '16px' }}>{lr.leaveType.replace(/_/g, ' ')}</td>
                    <td style={{ padding: '16px' }}>{lr.startDate}</td>
                    <td style={{ padding: '16px' }}>{lr.endDate}</td>
                    <td style={{ padding: '16px' }}>{lr.reason || '—'}</td>
                    <td style={{ padding: '16px' }}>
                      <span className={`badge ${statusVariant(lr.approvalStatus)}`}>{lr.approvalStatus}</span>
                    </td>
                    <td style={{ padding: '16px' }}>
                      {lr.approvalStatus === 'pending' && (
                        <>
                          <button className="btn btn-sm btn-success" onClick={() => handleApprove(lr.id, 'approved')}>Approve</button>
                          <button className="btn btn-sm btn-danger" onClick={() => handleApprove(lr.id, 'rejected')}>Reject</button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
                {leaveRequests.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                      No leave requests found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showForm && (
        <div className="card" style={{ marginTop: '24px' }}>
          <div className="card-header">
            <h3 className="card-title">Request Leave</h3>
          </div>
          <form onSubmit={handleCreate} style={{ padding: '24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
            <div className="form-group">
              <label className="form-label">Employee *</label>
              <select className="form-input" value={formData.employeeId} onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })} required>
                <option value="">Select employee</option>
                {employees.map(e => (
                  <option key={e.id} value={e.id}>{e.employeeNumber} - {e.jobTitle}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Leave Type</label>
              <select className="form-input" value={formData.leaveType} onChange={(e) => setFormData({ ...formData, leaveType: e.target.value })}>
                <option value="annual">Annual Leave</option>
                <option value="sick">Sick Leave</option>
                <option value="personal">Personal Leave</option>
                <option value="maternity">Maternity Leave</option>
                <option value="paternity">Paternity Leave</option>
                <option value="unpaid">Unpaid Leave</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Start Date *</label>
              <input type="date" className="form-input" value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} required />
            </div>
            <div className="form-group">
              <label className="form-label">End Date *</label>
              <input type="date" className="form-input" value={formData.endDate} onChange={(e) => setFormData({ ...formData, endDate: e.target.value })} required />
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Reason *</label>
              <textarea className="form-input" value={formData.reason} onChange={(e) => setFormData({ ...formData, reason: e.target.value })} rows={3} required />
            </div>
            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-sm btn-outline" onClick={() => setShowForm(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">Submit Request</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default WorkforceLeaveRequests;
