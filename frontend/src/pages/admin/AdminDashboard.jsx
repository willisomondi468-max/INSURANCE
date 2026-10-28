import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api.js';
import CinematicDashboardHero from '../components/CinematicDashboardHero.jsx';

/**
 * AdminDashboard - Company-level admin dashboard
 * Company-specific KPIs, employee attendance, task status, quick actions
 */
const AdminDashboard = () => {
  const [token] = useState(localStorage.getItem('token'));
  const [stats, setStats] = useState(null);
  const [recentTasks, setRecentTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const [companyRes, tasksRes, attRes] = await Promise.all([
        api.get('/company/stats', token),
        api.get('/tasks/summary', token),
        api.get('/attendance/summary', token)
      ]);
      if (companyRes.success) setStats(companyRes.data);
      if (tasksRes.success) setRecentTasks(tasksRes.data.tasks || []);
      if (attRes.success) {
        setStats(prev => ({ ...prev, ...attRes.data }));
      }
    } catch (err) {
      console.error('Fetch admin dashboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [token]);

  const s = stats || {};
  const totalTasks = s.tasks_due || 0;
  const completedTasks = s.verified_completed || 0;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div className="fade-in">
      <CinematicDashboardHero
        title="Company Administration"
        subtitle="Manage your company's employees, tasks, and performance"
        role="company_admin"
        actions={[
          <button key="employees" className="btn btn-primary btn-sm" onClick={() => navigate('/workforce/employees')}>
            Add Employee
          </button>,
          <button key="tasks" className="btn btn-primary btn-sm" onClick={() => navigate('/workforce/tasks')}>
            Create Task
          </button>,
          <button key="reports" className="btn btn-ghost btn-sm" onClick={() => navigate('/workforce/reports')}>
            Generate Report
          </button>
        ]}
      />

      <div style={{ padding: '0 24px 48px 24px', maxWidth: '1400px', margin: '0 auto' }}>
        {/* Top KPI Cards */}
        <div className="grid-4" style={{ marginBottom: '32px' }}>
          <div className="stat-card-premium stat-icon.secondary">
            <div className="stat-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            </div>
            <div className="stat-value">{s.total_employees || 0}</div>
            <div className="stat-label">Total Employees</div>
          </div>
          <div className="stat-card-premium stat-icon.info">
            <div className="stat-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            </div>
            <div className="stat-value">{totalTasks}</div>
            <div className="stat-label">Tasks Due</div>
          </div>
          <div className="stat-card-premium stat-icon.success">
            <div className="stat-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <div className="stat-value">{completedTasks}</div>
            <div className="stat-label">Tasks Completed</div>
            <div className="stat-change positive"><span>▲</span>{completionRate}% rate</div>
          </div>
          <div className="stat-card-premium stat-icon.warning">
            <div className="stat-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            </div>
            <div className="stat-value">{s.clocked_in || 0}</div>
            <div className="stat-label">Clocked In</div>
          </div>
        </div>

        <div className="grid-2" style={{ gap: '24px' }}>
          {/* Recent Tasks */}
          <div className="card" style={{ marginBottom: '24px' }}>
            <div className="card-header">
              <h3 className="card-title">Recent Tasks</h3>
              <button className="btn btn-sm btn-outline" onClick={() => navigate('/workforce/tasks')}>View All</button>
            </div>
            <div style={{ padding: '0 24px 24px' }}>
              {recentTasks && recentTasks.length > 0 ? (
                recentTasks.map((task, idx) => (
                  <div key={task.id} style={{ padding: '16px 24px', borderBottom: '1px solid rgba(6,27,51,0.06)', display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>{task.taskNumber || `TK-${1000 + idx}`}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>{task.title}</div>
                      <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{task.department_name || 'General'}</div>
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)' }}>{task.priority}</div>
                    <span className={`badge ${task.status === 'completed' ? 'badge-success' : task.status === 'overdue' ? 'badge-danger' : task.status === 'in_progress' ? 'badge-warning' : 'badge-primary'}`}>
                      {task.status}
                    </span>
                  </div>
                ))
              ) : (
                <div style={{ padding: '32px 24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  No tasks assigned yet.
                </div>
              )}
            </div>
          </div>

          {/* Department Performance */}
          <div className="card" style={{ marginBottom: '24px' }}>
            <div className="card-header">
              <h3 className="card-title">Department Performance</h3>
            </div>
            <div style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Operations</span>
                <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>{s.department_tasks || 0} tasks</div>
              </div>
              <div style={{ width: '100%', height: '10px', background: 'rgba(6,19,33,0.08)', borderRadius: '4px', overflow: 'hidden', marginBottom: '16px' }}>
                <div style={{ width: '72%', height: '100%', background: 'linear-gradient(90deg, var(--royal-blue) 0%, #4ade80 100%)', borderRadius: '4px' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Claims</span>
                <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>{s.department_claims || 0} tasks</div>
              </div>
              <div style={{ width: '100%', height: '8px', background: 'rgba(6,19,33,0.08)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: '58%', height: '100%', background: 'linear-gradient(90deg, var(--warning) 0%, #fbbf24 100%)', borderRadius: '4px' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '14px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Finance</span>
                <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>{s.department_finance || 0} tasks</div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card" style={{ marginBottom: '24px' }}>
          <div className="card-header">
            <h3 className="card-title">Quick Actions</h3>
          </div>
          <div style={{ padding: '24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
            <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => navigate('/workforce/employees')}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '8px' }}><path d="M18 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/></svg>
              Manage Employees
            </button>
            <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => navigate('/workforce/tasks')}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '8px' }}><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
              Manage Tasks
            </button>
            <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => navigate('/workforce/attendance')}>
              <svg width="20" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '8px' }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="6" x2="12" y2="12"/><line x1="12" y1="12" x2="16" y2="14"/></svg>
              Attendance
            </button>
            <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => navigate('/workforce/reports')}>
              <svg width="20" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '8px' }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              Reports
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
