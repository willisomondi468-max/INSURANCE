import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../components/AuthContext';
import api from '../../api.js';
import CinematicDashboardHero from '../components/CinematicDashboardHero.jsx';

/**
 * ProviderDashboard - Premium service provider portal dashboard
 * Assigned tickets, claims to review, provider performance metrics
 */
const ProviderDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { token, user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get('/dashboard/provider', token);
        if (res.success) setData(res.data);
      } catch (e) {
        // Fallback mock data
        setData({
          stats: { assignedTickets: 12, pendingClaims: 8, resolvedToday: 5 },
          recentTickets: [
            { id: 1, subject: 'Claim status inquiry', customer_name: 'John Doe', status: 'open', priority: 'high' },
            { id: 2, subject: 'Policy document request', customer_name: 'Jane Smith', status: 'in_progress', priority: 'normal' },
            { id: 3, subject: 'Premium payment question', customer_name: 'Robert Wilson', status: 'open', priority: 'urgent' }
          ],
          claimsToReview: [
            { id: 1, claim_number: 'CLM-2024-089', type: 'Auto Collision', amount_claimed: '$3,200', customer_name: 'John Doe', status: 'pending' },
            { id: 2, claim_number: 'CLM-2024-102', type: 'Property Damage', amount_claimed: '$1,500', customer_name: 'Jane Smith', status: 'pending' },
            { id: 3, claim_number: 'CLM-2024-105', type: 'Medical Claim', amount_claimed: '$850', customer_name: 'Robert Wilson', status: 'pending' }
          ]
        });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [token, user]);

  if (loading) {
    return (
      <div className="fade-in" style={{ padding: '40px' }}>
        <div className="loading-spinner" style={{ padding: 0 }}>
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  const stats = data?.stats || { assignedTickets: 0, pendingClaims: 0, resolvedToday: 0 };
  const recentTickets = data?.recentTickets || [];
  const claimsToReview = data?.claimsToReview || [];

  return (
    <div className="fade-in">
      <CinematicDashboardHero
        title="Provider Portal"
        subtitle="Manage assigned tickets and claims"
        role="provider"
        actions={[
          <button key="tickets" className="btn btn-primary btn-sm" onClick={() => navigate('/provider/tickets')}>
            View My Tickets
          </button>,
          <button key="claims" className="btn btn-primary btn-sm" onClick={() => navigate('/provider/claims')}>
            Review Claims
          </button>
        ]}
      />

      <div style={{ padding: '0 24px 48px 24px', maxWidth: '1400px', margin: '0 auto' }}>
        {/* Stats */}
        <div className="grid-4" style={{ marginBottom: '32px' }}>
          <div className="stat-card-premium stat-icon.secondary">
            <div className="stat-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            </div>
            <div className="stat-value">{stats.assignedTickets}</div>
            <div className="stat-label">Assigned Tickets</div>
          </div>
          <div className="stat-card-premium stat-icon.warning">
            <div className="stat-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            </div>
            <div className="stat-value">{stats.pendingClaims}</div>
            <div className="stat-label">Claims to Review</div>
          </div>
          <div className="stat-card-premium stat-icon.success">
            <div className="stat-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <div className="stat-value">{stats.resolvedToday}</div>
            <div className="stat-label">Resolved Today</div>
          </div>
          <div className="stat-card-premium stat-icon.info">
            <div className="stat-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="9"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="15"/></svg>
            </div>
            <div className="stat-value">94%</div>
            <div className="stat-label">Resolution Rate</div>
          </div>
        </div>

        <div className="grid-2" style={{ gap: '24px' }}>
          {/* Assigned Tickets */}
          <div className="card" style={{ marginBottom: '24px' }}>
            <div className="card-header">
              <h3 className="card-title">Assigned Tickets</h3>
              <button className="btn btn-sm btn-outline" onClick={() => navigate('/provider/tickets')}>View All</button>
            </div>
            <div style={{ padding: '0 24px 24px' }}>
              {recentTickets.length > 0 ? (
                recentTickets.map((ticket, idx) => (
                  <div key={ticket.id} style={{ padding: '16px 24px', borderBottom: '1px solid rgba(6,27,51,0.06)', display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>{`TK-${1000 + idx}`}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>{ticket.subject}</div>
                      <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{ticket.customer_name}</div>
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)' }}>{ticket.priority}</div>
                    <span className={`badge ${ticket.status === 'open' ? 'badge-danger' : ticket.status === 'in_progress' ? 'badge-warning' : 'badge-success'}`}>
                      {ticket.status}
                    </span>
                  </div>
                ))
              ) : (
                <div className="empty-state-premium" style={{ padding: '32px 24px' }}>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: '0' }}>No assigned tickets.</p>
                </div>
              )}
            </div>
          </div>

          {/* Claims to Review */}
          <div className="card" style={{ marginBottom: '24px' }}>
            <div className="card-header">
              <h3 className="card-title">Claims to Review</h3>
            </div>
            <div style={{ padding: '0 24px 24px' }}>
              {claimsToReview.length > 0 ? (
                claimsToReview.map((claim, idx) => (
                  <div key={claim.id} style={{ padding: '16px 24px', borderBottom: '1px solid rgba(6,27,51,0.06)', display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>{claim.claim_number}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>{claim.type}</div>
                      <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{claim.customer_name}</div>
                    </div>
                    <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>{claim.amount_claimed}</div>
                    <button className="btn btn-sm btn-primary" onClick={() => {}}>Review</button>
                  </div>
                ))
              ) : (
                <div className="empty-state-premium" style={{ padding: '32px 24px' }}>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: '0' }}>No claims pending review.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Quick Actions</h3>
          </div>
          <div style={{ padding: '24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
            <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => navigate('/provider/tickets')}>
              View My Tickets
            </button>
            <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => navigate('/provider/claims')}>
              Review Claims
            </button>
            <button className="btn btn-outline" style={{ width: '100%' }}>
              Update Ticket Status
            </button>
            <button className="btn btn-outline" style={{ width: '100%' }}>
              View Performance
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProviderDashboard;
