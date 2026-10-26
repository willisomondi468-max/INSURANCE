import React, { useState, useEffect, useCallback } from 'react';
import api from '../../api';
import { Toaster, toast } from 'react-hot-toast';
import { date, humanize } from '../../api';

// Manager Approvals - review attendance corrections and leave requests
const ManagerApprovals = () => {
  const [corrections, setCorrections] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchApprovals = useCallback(async () => {
    try {
      setLoading(true);
      const [dashRes] = await Promise.all([
        api.get('/manager/dashboard')
      ]);
      if (dashRes.success) {
        setCorrections(dashRes.data.pendingCorrections || []);
        setLeaves(dashRes.data.pendingLeaves || []);
      }
    } catch (err) {
      toast.error('Failed to load approvals');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchApprovals();
  }, [fetchApprovals]);

  const handleCorrectionDecision = async (id, approved, reason) => {
    try {
      const res = await api.post(`/manager/attendance-corrections/${id}/approve`, {
        approved,
        reason
      });
      if (res.success) {
        setCorrections(corrections.filter(c => c.id !== id));
        toast.success(`Correction ${approved ? 'approved' : 'rejected'}`);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to process correction');
    }
  };

  const handleLeaveDecision = async (id, approved, reason) => {
    try {
      const res = await api.post(`/manager/leave-requests/${id}/approve`, {
        approved,
        reason
      });
      if (res.success) {
        setLeaves(leaves.filter(l => l.id !== id));
        toast.success(`Leave request ${approved ? 'approved' : 'rejected'}`);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to process leave request');
    }
  };

  if (loading) {
    return (
      <div className="fade-in">
        <div className="loading-spinner"><div className="spinner"></div></div>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <Toaster position="top-right" />
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Pending Approvals</h1>
          <p className="dashboard-subtitle">Review attendance corrections and leave requests</p>
        </div>
      </div>

      <div className="grid-2" style={{ marginBottom: '24px' }}>
        <div className="card">
          <div className="card-body">
            <div className="card-header">
              <span className="card-title">Attendance Corrections ({corrections.length})</span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: '2px solid #eee' }}>
                    <th style={{ padding: '12px' }}>Employee</th>
                    <th style={{ padding: '12px' }}>Reason</th>
                    <th style={{ padding: '12px' }}>Requested</th>
                    <th style={{ padding: '12px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {corrections.length === 0 ? (
                    <tr><td colSpan="4" style={{ padding: '32px', textAlign: 'center', color: '#666' }}>No pending corrections.</td></tr>
                  ) : (
                    corrections.map((c) => (
                      <tr key={c.id} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '12px' }}>{c.requester_email}</td>
                        <td style={{ padding: '12px' }}>{humanize(c.reason || 'correction')}</td>
                        <td style={{ padding: '12px' }}>{date(c.created_at)}</td>
                        <td style={{ padding: '12px' }}>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => handleCorrectionDecision(c.id, true, '')}
                            >
                              Approve
                            </button>
                            <button
                              className="btn btn-outline btn-sm"
                              onClick={() => handleCorrectionDecision(c.id, false, '')}
                            >
                              Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-body">
            <div className="card-header">
              <span className="card-title">Leave Requests ({leaves.length})</span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: '2px solid #eee' }}>
                    <th style={{ padding: '12px' }}>Employee</th>
                    <th style={{ padding: '12px' }}>Leave Type</th>
                    <th style={{ padding: '12px' }}>Dates</th>
                    <th style={{ padding: '12px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {leaves.length === 0 ? (
                    <tr><td colSpan="4" style={{ padding: '32px', textAlign: 'center', color: '#666' }}>No pending leave requests.</td></tr>
                  ) : (
                    leaves.map((l) => (
                      <tr key={l.id} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '12px' }}>{l.employee_email}</td>
                        <td style={{ padding: '12px' }}>{humanize(l.leave_type)}</td>
                        <td style={{ padding: '12px' }}>{date(l.start_date)} - {date(l.end_date)}</td>
                        <td style={{ padding: '12px' }}>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => handleLeaveDecision(l.id, true, '')}
                            >
                              Approve
                            </button>
                            <button
                              className="btn btn-outline btn-sm"
                              onClick={() => handleLeaveDecision(l.id, false, '')}
                            >
                              Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManagerApprovals;
