import React, { useState, useEffect, useCallback } from 'react';
import api from '../../api';

// WorkforceMonthly - Monthly Performance Comparison
const WorkforceMonthly = () => {
  const [token] = useState(localStorage.getItem('token'));
  const [months, setMonths] = useState([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());

  const fetchMonthly = useCallback(async () => {
    try {
      const res = await api.get(`/analytics/monthly?year=${year}`, token);
      if (res.success) setMonths(res.data.months);
    } catch (err) {
      console.error('Fetch monthly comparison error:', err);
    } finally {
      setLoading(false);
    }
  }, [year, token]);

  useEffect(() => {
    fetchMonthly();
  }, [fetchMonthly]);

  const safePct = (num, den) => den ? ((num / den) * 100).toFixed(2) : '0.00';

  return (
    <div className="fade-in">
      <div className="dashboard-header">
        <h1 className="dashboard-title">Monthly Performance Comparison</h1>
        <select className="form-input" value={year} onChange={(e) => setYear(parseInt(e.target.value))} style={{ marginLeft: '16px' }}>
          {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="loading-spinner"><div className="spinner"></div></div>
      ) : (
        <div className="card">
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '2px solid #eee' }}>
                  <th style={{ padding: '12px' }}>Month</th>
                  <th style={{ padding: '12px' }}>Tasks Due</th>
                  <th style={{ padding: '12px' }}>Verified Completed</th>
                  <th style={{ padding: '12px' }}>Completion Rate</th>
                  <th style={{ padding: '12px' }}>Attendance Rate</th>
                  <th style={{ padding: '12px' }}>Punctuality Rate</th>
                  <th style={{ padding: '12px' }}>Overdue Tasks</th>
                </tr>
              </thead>
              <tbody>
                {months.map(m => (
                  <tr key={m.month} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '12px', fontWeight: 'bold' }}>{m.monthName}</td>
                    <td style={{ padding: '12px' }}>{m.tasksDue}</td>
                    <td style={{ padding: '12px' }}>{m.verifiedCompleted}</td>
                    <td style={{ padding: '12px' }}>{safePct(m.verifiedCompleted, m.tasksDue)}%</td>
                    <td style={{ padding: '12px' }}>{m.attendanceRate}%</td>
                    <td style={{ padding: '12px' }}>{m.punctualityRate}%</td>
                    <td style={{ padding: '12px' }}>{m.overdueTasks}</td>
                  </tr>
                ))}
                {months.length === 0 && (
                  <tr>
                    <td colSpan="7" style={{ padding: '24px', textAlign: 'center', color: '#666' }}>
                      No monthly data available for the selected year.
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

export default WorkforceMonthly;


