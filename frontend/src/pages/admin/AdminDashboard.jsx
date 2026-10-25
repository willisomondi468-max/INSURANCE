import React, { useState, useEffect, useCallback } from 'react';
import api from '../../api';

// AdminDashboard - Company-level admin dashboard
// Shows company-specific KPIs, employee attendance, task status, and quick actions
const AdminDashboard = () => {
  const [token] = useState(localStorage.getItem('token'));
  const [stats, setStats] = useState(null);
  const [recentTasks, setRecentTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      const [companyRes, tasksRes, attRes] = await Promise.all([
        api.get('/company/stats', token),
        api.get('/tasks/summary', token),
        api.get('/attendance/summary', token)
      ]);
      if (companyRes.success) setStats(companyRes.data);
      if (tasksRes.success) setRecentTasks(tasksRes.data.tasks || []);
      if (attRes.success) {
        // Merge attendance data into stats
        setStats(prev => ({ ...prev, ...attRes.data }));
      }
    } catch (err) {
      console.error('Fetch admin dashboard error:', err);
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
        <h1 className="dashboard-title">Company Administration</h1>
        <p className="text-secondary">Manage your company's employees, tasks, and performance</p>
      </div>

      {loading ? (
        <div className="loading-spinner"><div className="spinner"></div></div>
      ) : (
        <>
          {/* Company KPI Cards */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Company Overview</h3>
            </div>
            <div style={{ padding: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
              <div style={{ textAlign: 'center' }}>
                <div className="text-secondary" style={{ fontSize: '12px' }}>Total Employees</div>
                <div style={{ fontSize: '32px; font-weight: bold; color: #247BFF' }}>{stats?.totalEmployees || 0}</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div className="text-secondary" style={{ fontSize: '12px' }}>Tasks Due</div>
                <div style={{ fontSize: '32px; font-weight: bold; color: #F39C12' }}>{stats?.tasksDue || 0}</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div className="text-secondary" style={{ fontSize: '12px' }}>Tasks Completed</div>
                <div style={{ fontSize: '32px; font-weight: bold; color: #27AE60' }}>{stats?.verifiedCompleted || 0}</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div className="text-secondary" style={{ fontSize: '12px' }}>Completion Rate</div>
                <div style={{ fontSize: '32px; font-weight: bold' }}>{stats?.completionRate?.toFixed(1) || 0}%</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div className="text-secondary" style={{ fontSize: '12px' }}>Clocked In</div>
                <div style={{ fontSize: '32px; font-weight: bold; color: #27AE60' }}>{stats?.clockedIn || 0}</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div className="text-secondary" style={{ fontSize: '12px' }}>Attendance Rate</div>
                <div style={{ fontSize: '32px; font-weight: bold' }}>{stats?.attendanceRate?.toFixed(1) || 0}%</div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="card" style={{ marginTop: '24px' }}>
            <div className="card-header">
              <h3 className="card-title">Quick Actions</h3>
            </div>
            <div style={{ padding: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => {}}>
                + Add Employee
              </button>
              <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => {}}>
                + Create Task
              </button>
              <button className="btn btn-outline" style={{ width: '100%' }} onClick={() => {}}>
                View Attendance
              </button>
              <button className="btn btn-outline" style={{ width: '100%' }} onClick={() => {}}>
                View Reports
              </button>
            </div>
          </div>

          {/* Recent Tasks */}
          <div className="card" style={{ marginTop: '24px' }}>
            <div className="card-header">
              <h3 className="card-title">Recent Tasks</h3>
            </div>
            <div style={{ padding: '16px', overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: '2px solid #eee' }}>
                    <th style={{ padding: '12px' }}>Task #</th>
                    <th style={{ padding: '12px' }}>Title</th>
                    <th style={{ padding: '12px' }}>Status</th>
                    <th style={{ padding: '12px' }}>Priority</th>
                    <th style={{ padding: '12px' }}>Due Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTasks?.slice(0, 5).map((t) => (
                    <tr key={t.id} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '12px', fontWeight: 'bold' }}>{t.taskNumber || 'N/A'}</td>
                      <td style={{ padding: '12px' }}>{t.title || '—'}</td>
                      <td style={{ padding: '12px' }}>
                        <span className={`badge ${t.status === 'completed' ? 'badge-accent' : t.status === 'overdue' ? 'badge-danger' : 'badge-warning'}`}>
                          {t.status?.replace(/_/g, ' ') || '—'}
                        </span>
                      </td>
                      <td style={{ padding: '12px' }}>{t.priority || '—'}</td>
                      <td style={{ padding: '12px' }}>{t.dueAt ? new Date(t.dueAt).toLocaleDateString() : '—'}</td>
                    </tr>
                  ))}
                  {(recentTasks?.length || 0) === 0 && (
                    <tr>
                      <td colSpan="5" style={{ padding: '24px', textAlign: 'center', color: '#666' }}>
                        No recent tasks found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminDashboard;

