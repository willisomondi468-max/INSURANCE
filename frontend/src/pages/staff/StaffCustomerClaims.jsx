import React, { useState, useEffect, useCallback } from 'react';
import api from '../../api';
import { Toaster, toast } from 'react-hot-toast';
import { date, statusVariant, humanize, money } from '../../api';

// Staff Customer Claims - create and manage claims for customers
const StaffCustomerClaims = ({ customerId, customerName }) => {
  const [claims, setClaims] = useState([]);
  const [creating, setCreating] = useState(false);
  const [newClaim, setNewClaim] = useState({
    claimType: '',
    amountClaimed: '',
    description: '',
    policyId: ''
  });

  const fetchClaims = useCallback(async () => {
    try {
      const res = await api.get(`/staff/customers/${customerId}/claims`);
      if (res.success) {
        setClaims(res.data.claims);
      }
    } catch (err) {
      toast.error('Failed to load claims');
    }
  }, [customerId]);

  useEffect(() => {
    fetchClaims();
  }, [fetchClaims]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newClaim.claimType || !newClaim.amountClaimed) {
      toast.error('Claim type and amount are required');
      return;
    }
    try {
      setCreating(true);
      const res = await api.post(`/staff/customers/${customerId}/claims`, {
        claimType: newClaim.claimType,
        amountClaimed: parseFloat(newClaim.amountClaimed),
        description: newClaim.description,
        policyId: newClaim.policyId || null
      });
      if (res.success) {
        setClaims([res.data.claim, ...claims]);
        setNewClaim({ claimType: '', amountClaimed: '', description: '', policyId: '' });
        toast.success('Claim created successfully');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to create claim');
    } finally {
      setCreating(false);
    }
  };

  const handleStatusUpdate = async (claimId, status) => {
    try {
      const res = await api.put(`/staff/claims/${claimId}/status`, { status });
      if (res.success) {
        setClaims(claims.map(c =>
          c.id === claimId ? { ...c, status } : c
        ));
        toast.success(`Claim status updated to ${humanize(status)}`);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to update claim');
    }
  };

  return (
    <div className="fade-in">
      <Toaster position="top-right" />
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Claims Management</h1>
          <p className="dashboard-subtitle">
            Create and manage claims for {customerName}
          </p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-body">
          <form onSubmit={handleCreate} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div>
              <label className="form-label">Claim Type</label>
              <select
                value={newClaim.claimType}
                onChange={e => setNewClaim({ ...newClaim, claimType: e.target.value })}
                className="form-input"
              >
                <option value="">Select type</option>
                <option value="health">Health</option>
                <option value="life">Life</option>
                <option value="motor">Motor</option>
                <option value="property">Property</option>
                <option value="marine">Marine</option>
                <option value="travel">Travel</option>
              </select>
            </div>
            <div>
              <label className="form-label">Amount Claimed ($)</label>
              <input
                type="number"
                value={newClaim.amountClaimed}
                onChange={e => setNewClaim({ ...newClaim, amountClaimed: e.target.value })}
                className="form-input"
              />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label className="form-label">Description</label>
              <textarea
                value={newClaim.description}
                onChange={e => setNewClaim({ ...newClaim, description: e.target.value })}
                className="form-input"
                rows={3}
              />
            </div>
            <div>
              <label className="form-label">Policy ID (optional)</label>
              <input
                type="text"
                value={newClaim.policyId}
                onChange={e => setNewClaim({ ...newClaim, policyId: e.target.value })}
                className="form-input"
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={creating}
            >
              {creating ? 'Creating...' : 'Create Claim'}
            </button>
          </form>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <div className="card-header">
            <span className="card-title">Claims ({claims.length})</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '2px solid #eee' }}>
                  <th style={{ padding: '12px' }}>Claim #</th>
                  <th style={{ padding: '12px' }}>Type</th>
                  <th style={{ padding: '12px' }}>Amount</th>
                  <th style={{ padding: '12px' }}>Status</th>
                  <th style={{ padding: '12px' }}>Date</th>
                  <th style={{ padding: '12px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {claims.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
                      No claims found.
                    </td>
                  </tr>
                ) : (
                  claims.map((claim) => (
                    <tr key={claim.id} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '12px', fontWeight: '600' }}>{claim.claim_number}</td>
                      <td style={{ padding: '12px' }}>{humanize(claim.claim_type)}</td>
                      <td style={{ padding: '12px' }}>{money(claim.amount_claimed)}</td>
                      <td style={{ padding: '12px' }}>
                        <span className={`badge ${statusVariant(claim.status)}`}>
                          {humanize(claim.status)}
                        </span>
                      </td>
                      <td style={{ padding: '12px' }}>{date(claim.created_at)}</td>
                      <td style={{ padding: '12px' }}>
                        <select
                          value={claim.status}
                          onChange={e => handleStatusUpdate(claim.id, e.target.value)}
                          className="form-input"
                          style={{ padding: '6px 10px', fontSize: '13px' }}
                        >
                          <option value="pending">Pending</option>
                          <option value="under_review">Under Review</option>
                          <option value="approved">Approved</option>
                          <option value="rejected">Rejected</option>
                          <option value="paid">Paid</option>
                        </select>
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
  );
};

export default StaffCustomerClaims;
