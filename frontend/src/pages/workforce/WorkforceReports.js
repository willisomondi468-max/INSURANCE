import React, { useState } from 'react';
import api from '../../api';

// WorkforceReports - Monthly Report Generation and Export
const WorkforceReports = () => {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [loading, setLoading] = useState(false);

  const handleGeneratePDF = async () => {
    setLoading(true);
    try {
      const res = await api.download(
        `/reports/monthly?year=${year}&month=${month}&format=pdf`,
        `monthly-report-${year}-${month}.pdf`,
        token
      );
      // download() triggers browser download automatically
    } catch (err) {
      alert('Failed to generate PDF report: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateCSV = async () => {
    setLoading(true);
    try {
      const res = await api.download(
        `/reports/monthly?year=${year}&month=${month}&format=csv`,
        `monthly-report-${year}-${month}.csv`,
        token
      );
    } catch (err) {
      alert('Failed to generate CSV report: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fade-in">
      <div className="dashboard-header">
        <h1 className="dashboard-title">Monthly Performance Reports</h1>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Generate Report</h3>
        </div>
        <div style={{ padding: '24px', display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="form-group">
            <label className="form-label">Year</label>
            <select className="form-input" value={year} onChange={(e) => setYear(parseInt(e.target.value))}>
              {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Month</label>
            <select className="form-input" value={month} onChange={(e) => setMonth(parseInt(e.target.value))}>
              {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => <option key={m} value={m}>{new Date(2026, m-1).toLocaleDateString('en-US', {month: 'long'})}</option>)}
            </select>
          </div>
          <button className="btn btn-primary" onClick={handleGeneratePDF} disabled={loading}>
            {loading ? 'Generating PDF...' : '📄 Generate PDF Report'}
          </button>
          <button className="btn btn-outline" onClick={handleGenerateCSV} disabled={loading}>
            {loading ? 'Generating CSV...' : '📊 Generate CSV Export'}
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Report Information</h3>
        </div>
        <div style={{ padding: '16px', lineHeight: '1.6' }}>
          <p><strong>Reporting Period:</strong> {new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
          <p><strong>Available Exports:</strong> PDF, CSV</p>
          <p><strong>Data Source:</strong> Real-time database records</p>
          <p><strong>Access:</strong> HR Manager, Department Manager, Senior Management</p>
        </div>
      </div>
    </div>
  );
};

export default WorkforceReports;


