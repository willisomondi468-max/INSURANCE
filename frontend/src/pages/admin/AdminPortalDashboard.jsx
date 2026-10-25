import React, { useState, useEffect } from 'react';
import api from '../../api';
import { Toaster, toast } from 'react-hot-toast';
import { dateTime, humanize } from '../../api';

const AdminDashboard = () => {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/dashboard');
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
  const s = d.stats || {};

  return (
    <div className="fade-in">
      <Toaster position="top-right" />
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Administrator Portal</h1>
          <p className="dashboard-subtitle">Company-wide control center and system administration</p>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid-4" style={{ marginBottom: '32px' }}>
        <div className="stat-card-premium">
          <div className="stat-label">Total Customers</div>
          <div className="stat-value">{s.totalCustomers || 0}</div>
        </div>
        <div className="stat-card-premium">
          <div className="stat-label">Active Policies</div>
          <div className="stat-value">{s.activePolicies || 0}</div>
        </div>
        <div className="stat-card-premium">
          <div className="stat-label">Pending Claims</div>
          <div className="stat-value">{s.pendingClaims || 0}</div>
        </div>
        <div className="stat-card-premium">
          <div className="stat-label">Employees</div>
          <div className="stat-value">{s.totalEmployees || 0}</div>
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
                  <th style={{ padding: '12px' }}>Employees</th>
                </tr>
              </thead>
              <tbody>
                {(d.departments || []).length === 0 ? (
                  <tr><td colSpan="2" style={{ padding: '32px', textAlign: 'center', color: '#666' }}>No departments found.</td></tr>
                ) : (
                  (d.departments || []).map((dept) => (
                    <tr key={dept.id} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '12px', fontWeight: '600' }}>{dept.name}</td>
                      <td style={{ padding: '12px' }}>{dept.employee_count}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid-4" style={{ marginBottom: '24px' }}>
        <div className="card">
          <div className="card-body" style={{ padding: '24px' }}>
            <div className="card-title">User Management</div>
            <p style={{ color: '#666', marginBottom: '16px', fontSize: '14px' }}>
              Create accounts, assign roles, deactivate users.
            </p>
            <button className="btn btn-primary" style={{ width: '100%' }}>
              Manage Users
            </button>
          </div>
        </div>
        <div className="card">
          <div className="card-body" style={{ padding: '24px' }}>
            <div className="card-title">Audit Logs</div>
            <p style={{ color: '#666', marginBottom: '16px', fontSize: '14px' }}>
              Review security events and system changes.
            </p>
            <button className="btn btn-primary" style={{ width: '100%' }}>
              View Logs
            </button>
          </div>
        </div>
        <div className="card">
          <div className="card-body" style={{ padding: '24px' }}>
            <div className="card-title">Departments</div>
            <p style={{ color: '#666', marginBottom: '16px', fontSize: '14px' }}>
              Manage department structure and hierarchy.
            </p>
            <button className="btn btn-primary" style={{ width: '100%' }}>
              Manage Departments
            </button>
          </div>
        </div>
        <div className="card">
          <div className="card-body" style={{ padding: '24px' }}>
            <div className="card-title">Reports</div>
            <p style={{ color: '#666', marginBottom: '16px', fontSize: '14px' }}>
              Generate company-wide performance reports.
            </p>
            <button className="btn btn-primary" style={{ width: '100%' }}>
              Generate Report
            </button>
          </div>
        </div>
      </div>

      {/* Recent Audit Logs */}
      <div className="card">
        <div className="card-body">
          <div className="card-header">
            <span className="card-title">Recent Audit Logs</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '2px solid #eee' }}>
                  <th style={{ padding: '12px' }}>Time</th>
                  <th style={{ padding: '12px' }}>Actor</th>
                  <th style={{ padding: '12px' }}>Action</th>
                  <th style={{ padding: '12px' }}>Entity</th>
                </tr>
              </thead>
              <tbody>
                {(d.auditLogs || []).length === 0 ? (
                  <tr><td colSpan="4" style={{ padding: '32px', textAlign: 'center', color: '#666' }}>No audit logs found.</td></tr>
                ) : (
                  (d.auditLogs || []).map((log) => (
                    <tr key={log.id} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '12px' }}>{dateTime(log.created_at)}</td>
                      <td style={{ padding: '12px' }}>{log.actor_email || 'System'}</td>
                      <td style={{ padding: '12px' }}>{humanize(log.action)}</td>
                      <td style={{ padding: '12px' }}>{humanize(log.entity_type)}</td>
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

export default AdminDashboard;
