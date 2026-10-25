import React, { useState, useEffect } from 'react';
import api from '../../api';

// WorkforcePerformance - Staff Performance Analytics
const WorkforcePerformance = () => {
  const [token, setToken] = useState(localStorage.getItem('token'));
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
      <div className="dashboard-header">
        <h1 className="dashboard-title">Staff Performance</h1>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <select className="form-input" value={year} onChange={(e) => setYear(parseInt(e.target.value))}>
            {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select className="form-input" value={month} onChange={(e) => setMonth(parseInt(e.target.value))}>
            {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => <option key={m} value={m}>{new Date(2026, m-1).toLocaleDateString('en-US', {month: 'long'})}</option>)}
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
                  <th style={{ padding: '12px' }}>Employee</th>
                  <th style={{ padding: '12px' }}>Department</th>
                  <th style={{ padding: '12px' }}>Tasks Assigned</th>
                  <th style={{ padding: '12px' }}>Tasks Completed</th>
                  <th style={{ padding: '12px' }}>Completion Rate</th>
                  <th style={{ padding: '12px' }}>Net Work Hours</th>
                  <th style={{ padding: '12px' }}>Overtime</th>
                </tr>
              </thead>
              <tbody>
                {staff.map(s => (
                  <tr key={s.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '12px', fontWeight: 'bold' }}>{s.employeeNumber}</td>
                    <td style={{ padding: '12px' }}>{s.departmentName || '—'}</td>
                    <td style={{ padding: '12px' }}>{s.tasksAssigned}</td>
                    <td style={{ padding: '12px' }}>{s.tasksCompleted}</td>
                    <td style={{ padding: '12px' }}>{safePct(s.tasksCompleted, s.tasksAssigned)}%</td>
                    <td style={{ padding: '12px' }}>{(s.totalNetWorkSeconds / 3600).toFixed(2)}h</td>
                    <td style={{ padding: '12px' }}>{(s.totalOvertimeSeconds / 3600).toFixed(2)}h</td>
                  </tr>
                ))}
                {staff.length === 0 && (
                  <tr>
                    <td colSpan="7" style={{ padding: '24px', textAlign: 'center', color: '#666' }}>
                      No staff data available for the selected period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkforcePerformance;


