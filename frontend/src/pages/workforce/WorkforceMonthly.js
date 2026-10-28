import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api.js';
import CinematicDashboardHero from '../../components/CinematicDashboardHero.jsx';

/**
 * WorkforceMonthly - Monthly Performance Comparison
 * Twelve-month performance trends and comparison table
 */
const WorkforceMonthly = () => {
  const [token] = useState(localStorage.getItem('token'));
  const [months, setMonths] = useState([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());

  const fetchMonthly = async () => {
    try {
      const res = await api.get(`/analytics/monthly?year=${year}`, token);
      if (res.success) setMonths(res.data.months);
    } catch (err) {
      console.error('Fetch monthly comparison error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMonthly();
  }, [token, year]);

  const safePct = (num, den) => den ? ((num / den) * 100).toFixed(2) : '0.00';

  return (
    <div className="fade-in">
      <CinematicDashboardHero
        title="Monthly Performance Comparison"
        subtitle="Twelve-month performance trends and department comparisons"
        role="company_admin"
        actions={[
          <button key="reports" className="btn btn-secondary btn-sm" onClick={() => navigate('/workforce/reports')}>
            Generate Report
          </button>
        ]}
      />

      <div style={{ padding: '0 24px 48px 24px', maxWidth: '1400px', margin: '0 auto' }}>
        {/* Year Selector */}
        <div className="card" style={{ marginBottom: '24px' }}>
          <div style={{ padding: '24px', display: 'flex', gap: '12px', alignItems: 'center' }}>
            <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Select Year:</span>
            <select className="form-input" value={year} onChange={(e) => setYear(parseInt(e.target.value))}>
              {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
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
                  <th style={{ padding: '16px' }}>Month</th>
                  <th style={{ padding: '16px' }}>Tasks Due</th>
                  <th style={{ padding: '16px' }}>Verified Completed</th>
                  <th style={{ padding: '16px' }}>Completion Rate</th>
                  <th style={{ padding: '16px' }}>Attendance Rate</th>
                  <th style={{ padding: '16px' }}>On-Time Rate</th>
                  <th style={{ padding: '16px' }}>Overdue Tasks</th>
                </tr>
              </thead>
              <tbody>
                {months.map((m, idx) => (
                  <tr key={m.month} style={{ borderBottom: '1px solid rgba(6,27,51,0.06)' }}>
                    <td style={{ padding: '16px', fontWeight: 'bold' }}>{m.monthName}</td>
                    <td style={{ padding: '16px' }}>{m.tasksDue}</td>
                    <td style={{ padding: '16px' }}>{m.verifiedCompleted}</td>
                    <td style={{ padding: '16px' }}>{safePct(m.verifiedCompleted, m.tasksDue)}%</td>
                    <td style={{ padding: '16px' }}>{m.attendanceRate}%</td>
                    <td style={{ padding: '16px' }}>{m.punctualityRate}%</td>
                    <td style={{ padding: '16px' }}>{m.overdueTasks}</td>
                  </tr>
                ))}
                {months.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                      No monthly data available for the selected year.
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

export default WorkforceMonthly;
