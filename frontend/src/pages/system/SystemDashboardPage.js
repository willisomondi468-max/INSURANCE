import React, { useState, useEffect, useCallback } from 'react';
import api from '../../api';

// SystemDashboardPage - System-wide overview for System Admin
const SystemDashboardPage = () => {
  const [token] = useState(localStorage.getItem('token'));
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      const res = await api.get('/system/dashboard', token);
      if (res.success) setStats(res.data);
    } catch (err) {
      console.error('Fetch system dashboard error:', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return (
    <div className="fade-in">
      <div className="dashboard-header">
        <h1 className="dashboard-title">System Administration Dashboard</h1>
        <p className="text-secondary">System-wide overview across all companies</p>
      </div>

      {loading ? (
        <div className="loading-spinner"><div className="spinner"></div></div>
      ) : (
        <>
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">System Overview</h3>
            </div>
            <div style={{ padding: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              <div>
                <div className="text-secondary" style={{ fontSize: '12px' }}>Total Companies</div>
                <div style={{ fontSize: '32px; font-weight: bold' }}>{stats?.companies?.cnt || 0}</div>
              </div>
              <div>
                <div className="text-secondary" style={{ fontSize: '12px' }}>Active Companies</div>
                <div style={{ fontSize: '32px; font-weight: bold; color: #27AE60' }}>{stats?.companies?.active || 0}</div>
              </div>
              <div>
                <div className="text-secondary" style={{ fontSize: '12px' }}>Total Users</div>
                <div style={{ fontSize: '32px; font-weight: bold' }}>
                  {Object.values(stats?.usersByRole || {}).reduce((a, b) => a + b, 0)}
                </div>
              </div>
              <div>
                <div className="text-secondary" style={{ fontSize: '12px' }}>Total Tasks</div>
                <div style={{ fontSize: '32px; font-weight: bold' }}>
                  {Object.values(stats?.tasksByStatus || {}).reduce((a, b) => a + b, 0)}
                </div>
              </div>
            </div>
          </div>

          <div className="card" style={{ marginTop: '24px' }}>
            <div className="card-header">
              <h3 className="card-title">Users by Role</h3>
            </div>
            <div style={{ padding: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              {Object.entries(stats?.usersByRole || {}).map(([role, count]) => (
                <div key={role}>
                  <div className="text-secondary" style={{ fontSize: '12px' }}>{role.replace(/_/g, ' ')}</div>
                  <div style={{ fontSize: '24px; font-weight: bold' }}>{count}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="card" style={{ marginTop: '24px' }}>
            <div className="card-header">
              <h3 className="card-title">Tasks by Status</h3>
            </div>
            <div style={{ padding: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              {Object.entries(stats?.tasksByStatus || {}).map(([status, count]) => (
                <div key={status}>
                  <div className="text-secondary" style={{ fontSize: '12px' }}>{status.replace(/_/g, ' ')}</div>
                  <div style={{ fontSize: '24px; font-weight: bold' }}>{count}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="card" style={{ marginTop: '24px' }}>
            <div className="card-header">
              <h3 className="card-title">Today's Attendance</h3>
            </div>
            <div style={{ padding: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              {Object.entries(stats?.attendanceToday || {}).map(([status, count]) => (
                <div key={status}>
                  <div className="text-secondary" style={{ fontSize: '12px' }}>{status.replace(/_/g, ' ')}</div>
                  <div style={{ fontSize: '24px; font-weight: bold' }}>{count}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default SystemDashboardPage;

