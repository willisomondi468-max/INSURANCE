import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api.js';
import CinematicDashboardHero from '../../components/CinematicDashboardHero.jsx';

/**
 * WorkforceAttendance - Clock In/Out and Break Management
 */
const WorkforceAttendance = () => {
  const [token] = useState(localStorage.getItem('token'));
  const [attendance, setAttendance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [status, setStatus] = useState('not_clocked_in');
  const [breakType, setBreakType] = useState('lunch');
  const [paid, setPaid] = useState(true);
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    fetchMyAttendance();
    fetchRecords();
    fetchSummary();
    return () => clearInterval(timer);
  }, []);

  const fetchMyAttendance = async () => {
    try {
      const res = await api.get('/attendance/me', token);
      if (res.success) {
        setAttendance(res.data.record);
        setStatus(res.data.currentStatus);
      }
    } catch (err) {
      console.error('Fetch attendance error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecords = async () => {
    try {
      const res = await api.get('/attendance', token);
      if (res.success) setRecords(res.data.attendance);
    } catch (err) {
      console.error('Fetch records error:', err);
    }
  };

  const fetchSummary = async () => {
    try {
      const res = await api.get('/attendance/summary', token);
      if (res.success) setSummary(res.data);
    } catch (err) {
      console.error('Fetch summary error:', err);
    }
  };

  const handleClockIn = async () => {
    try {
      const res = await api.post('/attendance/clock-in', {}, token);
      if (res.success) {
        setStatus(res.data.status);
        fetchMyAttendance();
        fetchRecords();
      } else {
        alert(res.message || 'Clock in failed');
      }
    } catch (err) {
      alert('Clock in failed');
    }
  };

  const handleClockOut = async () => {
    try {
      const res = await api.post('/attendance/clock-out', {}, token);
      if (res.success) {
        setStatus(res.data.status);
        fetchMyAttendance();
        fetchRecords();
      } else {
        alert(res.message || 'Clock out failed');
      }
    } catch (err) {
      alert('Clock out failed');
    }
  };

  const handleStartBreak = async () => {
    try {
      const res = await api.post('/attendance/breaks/start', { breakType, paid }, token);
      if (res.success) {
        setStatus('on_break');
        fetchMyAttendance();
      } else {
        alert(res.message || 'Failed to start break');
      }
    } catch (err) {
      alert('Failed to start break');
    }
  };

  const handleEndBreak = async () => {
    try {
      const res = await api.post('/attendance/breaks/end', { breakId: attendance?.id }, token);
      if (res.success) {
        setStatus('present');
        fetchMyAttendance();
      } else {
        alert(res.message || 'Failed to end break');
      }
    } catch (err) {
      alert('Failed to end break');
    }
  };

  const formatTime = (seconds) => {
    if (!seconds) return '00:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  const getStatusColor = (s) => {
    switch (s) {
      case 'present': return '#19C58B';
      case 'late': return '#F2AE4C';
      case 'on_break': return '#1677FF';
      case 'clocked_out': return '#95A5A6';
      case 'absent': return '#ED6474';
      default: return '#7F8C8D';
    }
  };

  return (
    <div className="fade-in">
      <CinematicDashboardHero
        title="Attendance"
        subtitle="Record your daily entry and exit times"
        role="employee"
        actions={[
          <button key="clockIn" className="btn btn-primary btn-lg" onClick={handleClockIn} disabled={loading || status !== 'not_clocked_in'}>
            {loading ? 'Processing...' : '🕒 Clock In'}
          </button>,
          <button key="clockOut" className="btn btn-outline btn-lg" onClick={handleClockOut} disabled={loading || status !== 'present' && status !== 'on_break'}>
            🚪 Clock Out
          </button>
        ]}
      />

      <div style={{ padding: '0 24px 48px 24px', maxWidth: '1400px', margin: '0 auto' }}>
        {/* Current Status */}
        <div className="card" style={{ marginBottom: '24px' }}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '8px' }}>{currentTime.toLocaleDateString()}</div>
            <div style={{ fontSize: '48px', fontWeight: 'bold', marginBottom: '16px' }}>{currentTime.toLocaleTimeString()}</div>
            <div style={{ display: 'inline-block', padding: '8px 16px', borderRadius: '20px', background: getStatusColor(status), color: 'white', fontWeight: 'bold', textTransform: 'uppercase' }}>
              {status.replace(/_/g, ' ')}
            </div>
          </div>
          <div style={{ padding: '0 24px 24px 24px', display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            {status === 'not_clocked_in' && (
              <button className="btn btn-primary btn-lg" onClick={handleClockIn} disabled={loading}>
                {loading ? 'Processing...' : '🕒 Clock In'}
              </button>
            )}
            {status === 'present' && (
              <>
                <button className="btn btn-outline" onClick={handleStartBreak} disabled={loading}>
                  ☕ Start Break
                </button>
                <button className="btn btn-danger btn-lg" onClick={handleClockOut} disabled={loading}>
                  🚪 Clock Out
                </button>
              </>
            )}
            {status === 'on_break' && (
              <button className="btn btn-primary" onClick={handleEndBreak} disabled={loading}>
                ✅ End Break
              </button>
            )}
            {status === 'clocked_out' && (
              <span className="text-secondary">You have clocked out for today.</span>
            )}
          </div>
        </div>
      </div>

      <div style={{ padding: '0 24px 48px 24px', maxWidth: '1400px', margin: '0 auto' }}>
        {/* Today's Record */}
        {attendance && (
          <div className="card" style={{ marginBottom: '24px' }}>
            <div className="card-header">
              <h3 className="card-title">Today's Record</h3>
            </div>
            <div style={{ padding: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              <div>
                <div className="text-secondary" style={{ fontSize: '12px' }}>Clock In</div>
                <div>{attendance.clock_in_at ? new Date(attendance.clock_in_at).toLocaleTimeString() : '—'}</div>
              </div>
              <div>
                <div className="text-secondary" style={{ fontSize: '12px' }}>Clock Out</div>
                <div>{attendance.clock_out_at ? new Date(attendance.clock_out_at).toLocaleTimeString() : '—'}</div>
              </div>
              <div>
                <div className="text-secondary" style={{ fontSize: '12px' }}>Total Elapsed</div>
                <div>{formatTime(attendance.total_elapsed_seconds)}</div>
              </div>
              <div>
                <div className="text-secondary" style={{ fontSize: '12px' }}>Net Working Hours</div>
                <div>{formatTime(attendance.net_work_seconds)}</div>
              </div>
              <div>
                <div className="text-secondary" style={{ fontSize: '12px' }}>Break Time</div>
                <div>{formatTime(attendance.total_break_seconds || 0)}</div>
              </div>
              <div>
                <div className="text-secondary" style={{ fontSize: '12px' }}>Overtime</div>
                <div>{formatTime(attendance.overtime_seconds)}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Break Controls */}
        <div className="card" style={{ marginBottom: '24px' }}>
          <div className="card-header">
            <h3 className="card-title">Break Controls</h3>
          </div>
          <div style={{ padding: '16px', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <select className="form-input" value={breakType} onChange={(e) => setBreakType(e.target.value)}>
              <option value="lunch">Lunch Break</option>
              <option value="tea">Tea Break</option>
              <option value="personal">Personal Break</option>
              <option value="other">Other</option>
            </select>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <input type="checkbox" checked={paid} onChange={(e) => setPaid(e.target.value)} /> Paid Break
            </label>
            {status === 'present' && (
              <button className="btn btn-outline" onClick={handleStartBreak} disabled={loading}>
                Start Break
              </button>
            )}
            {status === 'on_break' && (
              <button className="btn btn-primary" onClick={handleEndBreak} disabled={loading}>
                End Break
              </button>
            )}
          </div>
        </div>
      </div>

      <div style={{ padding: '0 24px 48px 24px', maxWidth: '1400px', margin: '0 auto' }}>
        {/* Today's Summary */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Today's Summary</h3>
          </div>
          <div style={{ padding: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px' }}>
            {summary && (
              <>
                <div>
                  <div className="text-secondary" style={{ fontSize: '12px' }}>Total Active Employees</div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{summary.totalActiveEmployees}</div>
                </div>
                <div>
                  <div className="text-secondary" style={{ fontSize: '12px' }}>Clocked In</div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#19C58B' }}>{summary.clockedIn}</div>
                </div>
                <div>
                  <div className="text-secondary" style={{ fontSize: '12px' }}>On Break</div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1677FF' }}>{summary.onBreak}</div>
                </div>
                <div>
                  <div className="text-secondary" style={{ fontSize: '12px' }}>Clocked Out</div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#95A5A6' }}>{summary.clockedOut}</div>
                </div>
                <div>
                  <div className="text-secondary" style={{ fontSize: '12px' }}>Late Arrivals</div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#F2AE4C' }}>{summary.late}</div>
                </div>
                <div>
                  <div className="text-secondary" style={{ fontSize: '12px' }}>Attendance Rate</div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{summary.attendanceRate}%</div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkforceAttendance;
