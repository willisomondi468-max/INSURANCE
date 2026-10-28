import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api.js';
import CinematicDashboardHero from '../components/CinematicDashboardHero.jsx';

/**
 * SystemDashboardPage - System-wide overview for System Admin
 * Cinematic command center with cross-company visibility
 */
const SystemDashboardPage = () => {
  const [token] = useState(localStorage.getItem('token'));
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchStats = async () => {
    try {
      const res = await api.get('/system/dashboard', token);
      if (res.success) setStats(res.data);
    } catch (err) {
      console.error('Fetch system dashboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [token]);

  const statsData = stats?.stats || {
    total_companies: 0,
    total_users: 0,
    active_companies: 0,
    total_tasks: 0,
    completed_tasks: 0,
    pending_claims: 0,
    overdue_tasks: 0
  };

  const companiesData = stats?.companies || {
    total: 0,
    active: 0
  };

  const usersByRole = stats?.users_by_role || {};

  return (
    <div className="fade-in">
      <CinematicDashboardHero
        title="System Command Center"
        subtitle="Cross-company oversight, workforce analytics, and operational control"
        role="system_admin"
        actions={[
          <button key="companies" className="btn btn-primary btn-sm" onClick={() => navigate('/system/companies')}>
            Manage Companies
          </button>,
          <button key="reports" className="btn btn-ghost btn-sm" onClick={() => navigate('/workforce/reports')}>
            System Reports
          </button>
        ]}
      />

      <div style={{ padding: '0 24px 48px 24px', maxWidth: '1400px', margin: '0 auto' }}>
        {/* Top KPI Row */}
        <div className="grid-4" style={{ marginBottom: '32px' }}>
          <div className="stat-card-premium stat-icon.secondary">
            <div className="stat-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="11" x2="21" y2="11"/><line x1="11" y1="3" x2="11" y2="21"/></svg>
            </div>
            <div className="stat-value">{companiesData.total}</div>
            <div className="stat-label">Total Companies</div>
          </div>
          <div className="stat-card-premium stat-icon.success">
            <div className="stat-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M9 17l2 2 4-4"/></svg>
            </div>
            <div className="stat-value">{companiesData.active}</div>
            <div className="stat-label">Active Companies</div>
            <div className="stat-change positive"><span>▲</span>4.2% this month</div>
          </div>
          <div className="stat-card-premium stat-icon.info">
            <div className="stat-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zm2 16h12a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2z"/></svg>
            </div>
            <div className="stat-value">{Object.values(usersByRole).reduce((a,b) => a + parseInt(b || 0), 0)}</div>
            <div className="stat-label">Total Users</div>
          </div>
          <div className="stat-card-premium stat-icon.accent">
            <div className="stat-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="13 2 3 14 9 14 9 22"/><polyline points="22 12 22 4 z"/><polyline points="20 22 22 22"/></svg>
            </div>
            <div className="stat-value">{statsData.total_tasks}</div>
            <div className="stat-label">Total Tasks</div>
          </div>
          <div className="stat-card-premium stat-icon.warning">
            <div className="stat-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="11" r="10"/><line x1="12" y1="17" x2="12" y2="17"/><line x1="12" y1="9" x2="12" y2="9"/></svg>
            </div>
            <div className="stat-value">{statsData.pending_claims}</div>
            <div className="stat-label">Pending Claims</div>
            <div className="stat-change negative"><span>▼</span>2.1% this week</div>
          </div>
        </div>

        {/* Analytics Row */}
        <div className="grid-2" style={{ gap: '24px', marginBottom: '32px' }}>
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Tasks by Status</h3>
            </div>
            <div style={{ padding: '24px' }}>
              <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '14px', color: 'var(--text-primary)', fontWeight: 600 }}>Completed</span>
                <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>{statsData.completed_tasks}</div>
              </div>
              <div style={{ width: '100%', height: '8px', background: 'rgba(6,19,33,0.08)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: '75%', height: '100%', background: 'linear-gradient(90deg, #19C58B 0%, #4ade80 100%)', borderRadius: '4px' }} />
              </div>
              <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>On Track</span>
                <span style={{ color: 'var(--text-secondary)' }}>Completed</span>
              </div>
              <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '14px', color: 'var(--text-primary)', fontWeight: 600 }}>Overdue</span>
                <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>{statsData.overdue_tasks}</div>
              </div>
              <div style={{ width: '100%', height: '8px', background: 'rgba(6,19,33,0.08)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: '15%', height: '100%', background: 'linear-gradient(90deg, #ED6474 0%, #FFB26B 100%)', borderRadius: '4px' }} />
              </div>
              <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Low Risk</span>
                <span style={{ color: 'var(--text-secondary)' }}>Overdue</span>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Company Activity</h3>
            </div>
            <div style={{ padding: '24px' }}>
              {Object.entries(usersByRole).map(([role, count]) => (
                <div key={role} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{role.replace(/_/g, ' ')}</span>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>{count}</div>
                )
              ))}
            </div>
          </div>
        </div>

        {/* Alerts */}
        <div className="card" style={{ borderLeft: '4px solid var(--warning)', background: 'rgba(242,174,76,0.05)' }}>
          <div className="card-header">
            <h3 className="card-title">⚠️ Requires Attention</h3>
          </div>
          <div style={{ padding: '24px' }}>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>
              {statsData.overdue_tasks > 0 ? `There are ${statsData.overdue_tasks} overdue tasks requiring immediate attention.` : 'All systems operational. No critical alerts.'}
            </p>
            <button className="btn btn-primary" onClick={() => navigate('/tasks')} style={{ padding: '10px 24px' }}>
              View All Tasks
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemDashboardPage;
