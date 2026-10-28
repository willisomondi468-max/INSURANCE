import React, { useState } from 'react';
import api from '../../api.js';
import CinematicDashboardHero from '../components/CinematicDashboardHero';

/**
 * WorkforceReports - Monthly Performance Reports
 * PDF and Excel export with download
 */
const WorkforceReports = () => {
  const [token] = useState(localStorage.getItem('token'));
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [loading, setLoading] = useState(false);

  const handleGeneratePDF = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/reports/monthly?year=${year}&month=${month}&format=pdf`, token, true);
      const url = window.URL.createObjectURL(res);
      const link = document.createElement('a');
      link.href = url;
      link.download = `monthly-report-${year}-${month}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to generate PDF report: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateCSV = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/reports/monthly?year=${year}&month=${month}&format=csv`, token, true);
      const url = window.URL.createObjectURL(res);
      const link = document.createElement('a');
      link.href = url;
      link.download = `monthly-report-${year}-${month}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to generate CSV report: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fade-in">
      <CinematicDashboardHero
        title="Monthly Performance Reports"
        subtitle="Generate management reports for selected reporting periods"
        role="company_admin"
        actions={[
          <button key="pdf" className="btn btn-primary btn-sm" onClick={handleGeneratePDF}>
            {loading ? 'Generating PDF...' : '📄 Generate PDF Report'}
          </button>,
          <button key="csv" className="btn btn-outline btn-sm" onClick={handleGenerateCSV}>
            {loading ? 'Generating CSV...' : '📊 Generate CSV Export'}
          </button>
        ]}
      />

      <div style={{ padding: '0 24px 48px 24px', maxWidth: '1400px', margin: '0 auto' }}>
        {/* Generate Report Card */}
        <div className="card" style={{ marginBottom: '24px' }}>
          <div className="card-header">
            <h3 className="card-title">Generate Report</h3>
          </div>
          <div style={{ padding: '24px', display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Year</label>
              <select className="form-input" value={year} onChange={(e) => setYear(parseInt(e.target.value))}>
                {[2024, 2025, 2026, 2027].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Month</label>
              <select className="form-input" value={month} onChange={(e) => setMonth(parseInt(e.target.value))}>
                {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => (
                  <option key={m} value={m}>{new Date(2026, m-1).toLocaleDateString('en-US', {month: 'long'})}</option>
                ))}
              </select>
            </div>
            <button className="btn btn-primary" onClick={handleGeneratePDF} disabled={loading} style={{ width: 'auto' }}>
              {loading ? 'Generating PDF...' : '📄 Generate PDF Report'}
            </button>
            <button className="btn btn-outline" onClick={handleGenerateCSV} disabled={loading} style={{ width: 'auto' }}>
              {loading ? 'Generating CSV...' : '📊 Generate CSV Export'}
            </button>
          </div>
        </div>
      </div>

      {/* Report Information */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Report Information</h3>
        </div>
        <div style={{ padding: '24px', lineHeight: '1.6' }}>
          <p style={{ marginBottom: '8px' }}>
            <strong>Reporting Period:</strong> {new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </p>
          <p style={{ marginBottom: '8px' }}>
            <strong>Available Exports:</strong> PDF, CSV
          </p>
          <p style={{ marginBottom: '8px' }}>
            <strong>Data Source:</strong> Real-time database records
          </p>
          <p style={{ marginBottom: '8px' }}>
            <strong>Access:</strong> HR Manager, Department Manager, Senior Management
          </p>
        </div>
      </div>
    </div>
  );
};

export default WorkforceReports;
