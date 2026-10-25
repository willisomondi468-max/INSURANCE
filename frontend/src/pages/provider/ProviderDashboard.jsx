import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../App';
import api from '../../api.js';
import Icons from '../../components/Icons';

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
        // Fallback mock data for demo
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
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Provider Portal</h1>
          <p className="dashboard-subtitle">Manage assigned tickets and claims</p>
        </div>
        <div className="user-menu">
          <span>{user?.fullName || 'Service Provider'}</span>
          <div className="user-avatar">{user?.fullName?.charAt(0).toUpperCase() || 'P'}</div>
          <button className="btn btn-ghost btn-sm" onClick={handleLogout} style={{ padding: '8px 16px', fontSize: '14px' }}>
            <Icons.LogOut /> Sign Out
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid-4" style={{ marginBottom: '32px' }}>
        <div className="stat-card-premium">
          <div className="stat-icon" style={{ backgroundColor: 'rgba(23,105,255,0.1)', color: 'var(--royal-blue)' }}>
            <Icons.MessageSquare />
          </div>
          <div className="stat-value">{stats.assignedTickets}</div>
          <div className="stat-label">Assigned Tickets</div>
        </div>
        <div className="stat-card-premium">
          <div className="stat-icon" style={{ backgroundColor: 'rgba(245,158,11,0.1)', color: 'var(--warning)' }}>
            <Icons.BarChart />
          </div>
          <div className="stat-value">{stats.pendingClaims}</div>
          <div className="stat-label">Claims to Review</div>
        </div>
        <div className="stat-card-premium">
          <div className="stat-icon" style={{ backgroundColor: 'rgba(22,163,74,0.1)', color: 'var(--success)' }}>
            <Icons.Check />
          </div>
          <div className="stat-value">{stats.resolvedToday}</div>
          <div className="stat-label">Resolved Today</div>
        </div>
        <div className="stat-card-premium">
          <div className="stat-icon" style={{ backgroundColor: 'rgba(0,194,255,0.1)', color: 'var(--cyan-accent)' }}>
            <Icons.Task />
          </div>
          <div className="stat-value">94%</div>
          <div className="stat-label">Resolution Rate</div>
        </div>
      </div>

      <div className="grid-2">
        {/* Assigned Tickets */}
        <div className="card" style={{ marginBottom: '24px' }}>
          <div className="card-header">
            <h3 className="card-title">Assigned Tickets</h3>
            <button className="btn btn-sm btn-outline" onClick={() => navigate('/provider/tickets')}>View All</button>
          </div>
          <div style={{ padding: '0 24px 24px' }}>
            {recentTickets.length > 0 ? (
              recentTickets.map((ticket, idx) => (
                <div key={ticket.id} style={{ padding: '16px 24px', borderBottom: '1px solid rgba(8,27,51,0.06)', display: 'flex', alignItems: 'center', gap: '16px' }}>
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
                <div key={claim.id} style={{ padding: '16px 24px', borderBottom: '1px solid rgba(8,27,51,0.06)', display: 'flex', alignItems: 'center', gap: '16px' }}>
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
        <div style={{ padding: '24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <button className="btn btn-primary" onClick={() => navigate('/provider/tickets')} style={{ width: '100%' }}>
            View My Tickets
          </button>
          <button className="btn btn-primary" onClick={() => {}} style={{ width: '100%' }}>
            Review Claims
          </button>
          <button className="btn btn-outline" onClick={() => {}} style={{ width: '100%' }}>
            Update Ticket Status
          </button>
          <button className="btn btn-outline" onClick={() => {}} style={{ width: '100%' }}>
            View Performance
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProviderDashboard;
