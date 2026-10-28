import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../components/AuthContext';
import api from '../../api.js';
import Icons from '../../components/Icons';

/**
 * CustomerDashboard - Premium customer portal dashboard
 * Personalized welcome, policy cards, claims tracker, premium analytics
 */
const CustomerDashboard = () => {
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
        const res = await api.get('/customers/dashboard', token);
        if (res.success) setData(res.data);
      } catch (err) {
        // Fallback mock data for demo
        setData({
          customer: { fullName: user?.fullName || 'Valued Customer', email: user?.email || 'customer@example.com', memberSince: '2024' },
          stats: { totalPolicies: 3, activePolicies: 2, pendingClaims: 1, totalPaid: 12500 },
          activePolicies: [
            { id: 1, plan_name: 'Comprehensive Life Insurance', policy_number: 'POL-LIFE-2024-001', status: 'active', coverage: '$500,000', premium: '$85/mo', nextRenewal: '2027-03-15' },
            { id: 2, plan_name: 'Auto Shield Plus', policy_number: 'POL-MOT-2024-014', status: 'active', coverage: '$250,000', premium: '$120/mo', nextRenewal: '2026-11-20' },
            { id: 3, plan_name: 'Home Protection Plus', policy_number: 'POL-PRP-2024-007', status: 'pending', coverage: '$400,000', premium: '$95/mo', nextRenewal: '2027-01-10' }
          ],
          recentPayments: [
            { id: 1, amount: '$85.00', status: 'completed', payment_date: '2026-10-01', description: 'Life Insurance Premium' },
            { id: 2, amount: '$120.00', status: 'completed', payment_date: '2026-09-20', description: 'Auto Insurance Premium' },
            { id: 3, amount: '$95.00', status: 'pending', payment_date: '2026-10-15', description: 'Home Insurance Premium' }
          ],
          recentClaims: [
            { id: 1, claim_number: 'CLM-2024-089', type: 'Auto Collision', amount: '$3,200', status: 'approved', submitted_date: '2026-09-10' },
            { id: 2, claim_number: 'CLM-2024-102', type: 'Property Damage', amount: '$1,500', status: 'pending', submitted_date: '2026-10-05' }
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

  const customer = data?.customer || { fullName: 'Valued Customer', email: 'customer@example.com', memberSince: '2024' };
  const stats = data?.stats || { totalPolicies: 0, activePolicies: 0, pendingClaims: 0, totalPaid: 0 };
  const activePolicies = data?.activePolicies || [];
  const recentPayments = data?.recentPayments || [];
  const recentClaims = data?.recentClaims || [];

  return (
    <div className="fade-in">
      <CinematicDashboardHero
        title="Customer Portal"
        subtitle="Manage your policies, claims, and payments"
        role="customer"
        actions={[
          <button key="policies" className="btn btn-primary btn-sm" onClick={() => navigate('/customer/policies')}>
            View My Policies
          </button>,
          <button key="claims" className="btn btn-primary btn-sm" onClick={() => navigate('/customer/claims')}>
            Submit a Claim
          </button>
        ]}
      />

      <div style={{ padding: '0 24px 48px 24px', maxWidth: '1400px', margin: '0 auto' }}>
        {/* Stats Cards */}
        <div className="grid-4" style={{ marginBottom: '32px' }}>
          <div className="stat-card-premium stat-icon.secondary">
            <div className="stat-icon">
              <Icons.FileText />
            </div>
            <div className="stat-value">{stats.totalPolicies}</div>
            <div className="stat-label">Total Policies</div>
          </div>
          <div className="stat-card-premium stat-icon.accent">
            <div className="stat-icon">
              <Icons.Check />
            </div>
            <div className="stat-value">{stats.activePolicies}</div>
            <div className="stat-label">Active Policies</div>
          </div>
          <div className="stat-card-premium stat-icon.warning">
            <div className="stat-icon">
              <Icons.Clock />
            </div>
            <div className="stat-value">{stats.pendingClaims}</div>
            <div className="stat-label">Pending Claims</div>
          </div>
          <div className="stat-card-premium stat-icon.info">
            <div className="stat-icon">
              <Icons.CreditCard />
            </div>
            <div className="stat-value">${stats.totalPaid?.toLocaleString() || '0'}</div>
            <div className="stat-label">Total Paid</div>
          </div>
        </div>

        <div className="grid-2">
          {/* Active Policies */}
          <div className="card" style={{ marginBottom: '24px' }}>
            <div className="card-header">
              <h3 className="card-title">My Active Policies</h3>
              <button className="btn btn-sm btn-outline" onClick={() => navigate('/customer/policies')}>View All</button>
            </div>
            <div style={{ padding: '0 24px 24px' }}>
              {activePolicies.length > 0 ? (
                activePolicies.map((policy, idx) => (
                  <div key={policy.id} className="policy-row" style={{ padding: '16px 24px', borderBottom: '1px solid rgba(6,27,51,0.06)', display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-md)', background: 'rgba(6,19,33,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icons.FileText />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>{policy.plan_name}</div>
                      <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{policy.policy_number}</div>
                    </div>
                    <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>{policy.premium}</div>
                    <span className={`badge ${policy.status === 'active' ? 'badge-success' : 'badge-warning'}`}>
                      {policy.status}
                    </span>
                  </div>
                ))
              ) : (
                <div className="empty-state-premium" style={{ padding: '48px 24px' }}>
                  <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(6,27,51,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', flexShrink: 0 }}>
                    <Icons.FileText />
                  </div>
                  <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>No Active Policies</h3>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>You don't have any active insurance policies yet.</p>
                  <button className="btn btn-primary" onClick={() => navigate('/customer/policies')}>Browse Insurance Plans</button>
                </div>
              )}
            </div>
          </div>

          {/* Claims Tracker */}
          <div className="card" style={{ marginBottom: '24px' }}>
            <div className="card-header">
              <h3 className="card-title">My Claims</h3>
              <button className="btn btn-sm btn-outline" onClick={() => navigate('/customer/claims')}>View All</button>
            </div>
            <div style={{ padding: '0 24px 24px' }}>
              {recentClaims.length > 0 ? (
                recentClaims.map((claim, idx) => (
                  <div key={claim.id} style={{ padding: '16px 24px', borderBottom: '1px solid rgba(6,27,51,0.06)', display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-md)', background: 'rgba(6,27,51,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icons.BarChart />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>{claim.claim_number}</div>
                      <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{claim.type}</div>
                    </div>
                    <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>{claim.amount}</div>
                    <span className={`badge ${claim.status === 'approved' ? 'badge-success' : claim.status === 'pending' ? 'badge-warning' : 'badge-danger'}`}>
                      {claim.status}
                    </span>
                  </div>
                ))
              ) : (
                <div className="empty-state-premium" style={{ padding: '32px 24px' }}>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: '0' }}>No recent claims.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent Payments */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Recent Payments</h3>
          </div>
          <div style={{ padding: '0 24px 24px' }}>
            {recentPayments.length > 0 ? (
              recentPayments.map((payment, idx) => (
                <div key={payment.id} style={{ padding: '16px 24px', borderBottom: '1px solid rgba(6,27,51,0.06)', display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-md)', background: 'rgba(22, 163, 74, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--success)', flexShrink: 0 }}>
                    <Icons.CreditCard />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>{payment.description}</div>
                    <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{new Date(payment.payment_date).toLocaleDateString()}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>{payment.amount}</div>
                    <span className={`badge ${payment.status === 'completed' ? 'badge-success' : 'badge-warning'}`}>
                      {payment.status}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state-premium" style={{ padding: '32px 24px' }}>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '0' }}>No recent payments.</p>
              </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerDashboard;
