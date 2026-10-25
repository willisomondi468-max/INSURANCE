import React, { useState, useEffect } from 'react';
import api from '../../api';
import { Toaster, toast } from 'react-hot-toast';
import { date, humanize } from '../../api';

const ManagerDashboard = () => {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await api.get('/manager/dashboard');
      if (res.success) {
        setDashboard(res.data);
      }
    } catch (err) {
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="fade-in">
        <div className="loading-spinner"><div className="spinner"></div></div>
      </div>
    );
  }

  const d = dashboard || {};
  const depts = d.departments || [];
  const att = d.attendance || {};
  const tasks = d.tasks || {};

  return (
    <div className="fade-in">
      <Toaster position="top-right" />
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Manager Dashboard</h1>
          <p className="dashboard-subtitle">Team oversight, attendance, and task management</p>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid-4" style={{ marginBottom: '32px' }}>
        <div className="stat-card-premium">
          <div className="stat-label">Departments</div>
          <div className="stat-value">{depts.length}</div>
        </div>
        <div className="stat-card-premium">
          <div className="stat-label">Employees</div>
          <div className="stat-value">{d.employees || 0}</div>
        </div>
        <div className="stat-card-premium">
          <div className="stat-label">Clocked In</div>
          <div className="stat-value">{att.clocked_in || 0}</div>
        </div>
        <div className="stat-card-premium">
          <div className="stat-label">Overdue Tasks</div>
          <div className="stat-value">{tasks.overdue_tasks || 0}</div>
        </div>
      </div>

      {/* Departments */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-body">
          <div className="card-header">
            <span className="card-title">Departments</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '2px solid #eee' }}>
                  <th style={{ padding: '12px' }}>Department</th>
                  <th style={{ padding: '12px' }}>Status</th>
                  <th style={{ padding: '12px' }}>Employees</th>
                  <th style={{ padding: '12px' }}>Monthly Target</th>
                </tr>
              </thead>
              <tbody>
                {depts.length === 0 ? (
                  <tr><td colSpan="4" style={{ padding: '32px', textAlign: 'center', color: '#666' }}>No departments found.</td></tr>
                ) : (
                  depts.map((dept) => (
                    <tr key={dept.id} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '12px', fontWeight: '600' }}>{dept.name}</td>
                      <td style={{ padding: '12px' }}>
                        <span className={`badge ${dept.status === 'active' ? 'badge-success' : 'badge-secondary'}`}>
                          {humanize(dept.status)}
                        </span>
                      </td>
                      <td style={{ padding: '12px' }}>{dept.employee_count}</td>
                      <td style={{ padding: '12px' }}>{dept.monthly_target}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid-3" style={{ marginBottom: '24px' }}>
        <div className="card">
          <div className="card-body" style={{ padding: '24px' }}>
            <div className="card-title">Team Attendance</div>
            <p style={{ color: '#666', marginBottom: '16px', fontSize: '14px' }}>
              View clock-in/out records and break times for your team.
            </p>
            <button className="btn btn-primary" style={{ width: '100%' }}>
              View Attendance
            </button>
          </div>
        </div>
        <div className="card">
          <div className="card-body" style={{ padding: '24px' }}>
            <div className="card-title">Team Tasks</div>
            <p style={{ color: '#666', marginBottom: '16px', fontSize: '14px' }}>
              Monitor task assignments, completion, and overdue items.
            </p>
            <button className="btn btn-primary" style={{ width: '100%' }}>
              View Tasks
            </button>
          </div>
        </div>
        <div className="card">
          <div className="card-body" style={{ padding: '24px' }}>
            <div className="card-title">Pending Approvals</div>
            <p style={{ color: '#666', marginBottom: '16px', fontSize: '14px' }}>
              Review attendance corrections and leave requests.
            </p>
            <button className="btn btn-primary" style={{ width: '100%' }}>
              Review Approvals
            </button>
          </div>
        </div>
      </div>

      {/* Pending Items */}
      <div className="grid-2" style={{ marginBottom: '24px' }}>
        <div className="card">
          <div className="card-body">
            <div className="card-header">
              <span className="card-title">Pending Attendance Corrections</span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: '2px solid #eee' }}>
                    <th style={{ padding: '12px' }}>Employee</th>
                    <th style={{ padding: '12px' }}>Type</th>
                    <th style={{ padding: '12px' }}>Requested</th>
                    <th style={{ padding: '12px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(d.pendingCorrections || []).length === 0 ? (
                    <tr><td colSpan="4" style={{ padding: '32px', textAlign: 'center', color: '#666' }}>No pending corrections.</td></tr>
                  ) : (
                    (d.pendingCorrections || []).map((c) => (
                      <tr key={c.id} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '12px' }}>{c.requester_email}</td>
                        <td style={{ padding: '12px' }}>{humanize(c.reason || 'correction')}</td>
                        <td style={{ padding: '12px' }}>{date(c.created_at)}</td>
                        <td style={{ padding: '12px' }}>
                          <button className="btn btn-outline btn-sm">Review</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-body">
            <div className="card-header">
              <span className="card-title">Pending Leave Requests</span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: '2px solid #eee' }}>
                    <th style={{ padding: '12px' }}>Employee</th>
                    <th style={{ padding: '12px' }}>Leave Type</th>
                    <th style={{ padding: '12px' }}>Dates</th>
                    <th style={{ padding: '12px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(d.pendingLeaves || []).length === 0 ? (
                    <tr><td colSpan="4" style={{ padding: '32px', textAlign: 'center', color: '#666' }}>No pending leave requests.</td></tr>
                  ) : (
                    (d.pendingLeaves || []).map((l) => (
                      <tr key={l.id} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '12px' }}>{l.employee_email}</td>
                        <td style={{ padding: '12px' }}>{humanize(l.leave_type)}</td>
                        <td style={{ padding: '12px' }}>{date(l.start_date)} - {date(l.end_date)}</td>
                        <td style={{ padding: '12px' }}>
                          <button className="btn btn-outline btn-sm">Review</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManagerDashboard;
