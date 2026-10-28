import React, { useState, useEffect } from 'react';
import api from '../../api.js';
import CinematicDashboardHero from '../../components/CinematicDashboardHero.jsx';

/**
 * WorkforcePerformance - Staff Performance Analytics
 * Staff metrics with task completion, attendance, productivity
 */
const WorkforcePerformance = () => {
  const [token] = useState(localStorage.getItem('token'));
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);

  const fetchStaff = async () => {
    try {
      const res = await api.get(`/analytics/staff?year=${year}&month=${month}`, token);
      if (res.success) setStaff(res.data.staff);
    } catch (err) {
      console.error('Fetch staff analytics error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, [token, year, month]);

  const safePct = (num, den) => den ? ((num / den) * 100).toFixed(2) : '0.00';

  return (
    <div className="fade-in">
      <CinematicDashboardHero
        title="Staff Performance"
        subtitle="Individual staff performance metrics and productivity"
        role="department_manager"
        actions={[
          <button key="employees" className="btn btn-secondary btn-sm" onClick={() => navigate('/workforce/employees')}>
            Manage Employees
          </button>
        ]}
      />

      <div style={{ padding: '0 24px 48px 24px', maxWidth: '1400px', margin: '0 auto' }}>
        {/* Filters */}
        <div className="card" style={{ marginBottom: '24px' }}>
          <div style={{ padding: '24px', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <select className="form-input" value={year} onChange={(e) => setYear(parseInt(e.target.value))}>
              {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <select className="form-input" value={month} onChange={(e) => setMonth(parseInt(e.target.value))}>
              {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => (
                <option key={m} value={m}>{new Date(2026, m-1).toLocaleDateString('en-US', {month: 'long'})}</option>
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
        <div className="card" style={{ marginBottom: '24px' }}>
          <div style={{ padding: '24px', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '2px solid #eee' }}>
                  <th style={{ padding: '16px' }}>Employee</th>
                  <th style={{ padding: '16px' }}>Department</th>
                  <th style={{ padding: '16px' }}>Tasks Assigned</th>
                  <th style={{ padding: '16px' }}>Tasks Completed</th>
                  <th style={{ padding: '16px' }}>Completion Rate</th>
                  <th style={{ padding: '16px' }}>Net Work Hours</th>
                  <th style={{ padding: '16px' }}>Overtime</th>
                </tr>
              </thead>
              <tbody>
                {staff.map(s => (
                  <tr key={s.id} style={{ borderBottom: '1px solid rgba(6,27,51,0.06)' }}>
                    <td style={{ padding: '16px', fontWeight: 'bold' }}>{s.employeeNumber}</td>
                    <td style={{ padding: '16px' }}>{s.departmentName || '—'}</td>
                    <td style={{ padding: '16px' }}>{s.tasksAssigned}</td>
                    <td style={{ padding: '16px' }}>{s.tasksCompleted}</td>
                    <td style={{ padding: '16px' }}>{safePct(s.tasksCompleted, s.tasksAssigned)}%</td>
                    <td style={{ padding: '16px' }}>{(s.totalNetWorkSeconds / 3600).toFixed(2)}h</td>
                    <td style={{ padding: '16px' }}>{(s.totalOvertimeSeconds / 3600).toFixed(2)}h</td>
                  </tr>
                ))}
                {staff.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                      No staff data available for the selected period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkforcePerformance;
