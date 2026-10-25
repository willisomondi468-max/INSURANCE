import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../App';
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
      } catch (e) {
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

  const customer = data?.customer || { fullName: 'Customer', email: 'customer@example.com', memberSince: '2024' };
  const stats = data?.stats || { totalPolicies: 0, activePolicies: 0, pendingClaims: 0, totalPaid: 0 };
  const activePolicies = data?.activePolicies || [];
  const recentPayments = data?.recentPayments || [];
  const recentClaims = data?.recentClaims || [];

  return (
    <div className="fade-in">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Welcome back, {customer.fullName?.split(' ')[0]}</h1>
          <p className="dashboard-subtitle">Here's what's happening with your InsuraVault policies today.</p>
        </div>
        <div className="user-menu">
          <span>{customer.fullName}</span>
          <div className="user-avatar">{customer.fullName?.charAt(0).toUpperCase()}</div>
          <button className="btn btn-ghost btn-sm" onClick={handleLogout} style={{ padding: '8px 16px', fontSize: '14px' }}>
            <Icons.LogOut /> Sign Out
          </button>
        </div>
      </div>

      {/* Welcome Card */}
      <div className="card card-glass" style={{ marginBottom: '32px' }}>
        <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'linear-gradient(135deg, #081B33 0%, #1769FF 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '28px', fontWeight: 800, flexShrink: 0 }}>
            {customer.fullName?.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '8px', color: 'var(--text-primary)' }}>{customer.fullName}</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '4px' }}>{customer.email}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '13px', background: 'rgba(22, 163, 74, 0.1)', color: 'var(--success)', padding: '6px 12px', borderRadius: '20px', fontWeight: 600 }}>
                Active Member
              </span>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Member since {customer.memberSince}</span>
            </div>
          </div>
          <div style={{ marginLeft: 'auto' }}>
            <button className="btn btn-primary" onClick={() => navigate('/customer/policies')} style={{ padding: '12px 24px' }}>
              View All Policies
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid-4" style={{ marginBottom: '32px' }}>
        <div className="stat-card-premium">
          <div className="stat-icon" style={{ backgroundColor: 'rgba(8,27,51,0.1)', color: 'var(--navy-deep)' }}>
            <Icons.FileText />
          </div>
          <div className="stat-value">{stats.totalPolicies}</div>
          <div className="stat-label">Total Policies</div>
        </div>
        <div className="stat-card-premium">
          <div className="stat-icon" style={{ backgroundColor: 'rgba(23,105,255,0.1)', color: 'var(--royal-blue)' }}>
            <Icons.Check />
          </div>
          <div className="stat-value">{stats.activePolicies}</div>
          <div className="stat-label">Active Policies</div>
        </div>
        <div className="stat-card-premium">
          <div className="stat-icon" style={{ backgroundColor: 'rgba(245,158,11,0.1)', color: 'var(--warning)' }}>
            <Icons.Clock />
          </div>
          <div className="stat-value">{stats.pendingClaims}</div>
          <div className="stat-label">Pending Claims</div>
        </div>
        <div className="stat-card-premium">
          <div className="stat-icon" style={{ backgroundColor: 'rgba(22,163,74,0.1)', color: 'var(--success)' }}>
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
                <div key={policy.id} className="photo-card" style={{ aspectRatio: 'auto', height: 'auto', position: 'relative', overflow: 'visible', cursor: 'pointer' }} onClick={() => navigate(`/customer/policies/${policy.id}`)}>
                  <img
                    src={idx % 2 === 0 ? 'https://images.unsplash.com/photo-1564494688057-614178e7eb8d?w=400&q=80' : 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=400&q=80'}
                    alt={policy.plan_name}
                    loading="lazy"
                    style={{ width: '100%', height: '160px', objectFit: 'cover', borderRadius: 'var(--radius-md) var(--radius-md) 0 0' }}
                  />
                  <div style={{ padding: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                      <span className="photo-card-category" style={{ fontSize: '11px', padding: '4px 10px' }}>{policy.status}</span>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{policy.policy_number}</span>
                    </div>
                    <h3 style={{ fontSize: '17px', fontWeight: 700, marginBottom: '8px', color: 'var(--text-primary)' }}>{policy.plan_name}</h3>
                    <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '16px' }}>{policy.coverage} coverage</p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Premium</div>
                        <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>{policy.premium}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Renewal</div>
                        <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>{new Date(policy.nextRenewal).toLocaleDateString()}</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state-premium" style={{ padding: '48px 24px' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(8,27,51,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', flexShrink: 0 }}>
                  <Icons.FileText />
                </div>
                <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>No Active Policies</h3>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>You don't have any active insurance policies yet.</p>
                <button className="btn btn-primary" onClick={() => navigate('/customer/plans')}>Browse Insurance Plans</button>
              </div>
            )}
          </div>
        </div>

        {/* Claims Tracker */}
        <div className="card" style={{ marginBottom: '24px' }}>
          <div className="card-header">
            <h3 className="card-title">Recent Claims</h3>
            <button className="btn btn-sm btn-outline" onClick={() => navigate('/customer/claims')}>View All</button>
          </div>
          <div style={{ padding: '0 24px 24px' }}>
            {recentClaims.length > 0 ? (
              recentClaims.map((claim, idx) => (
                <div key={claim.id} style={{ padding: '16px 24px', borderBottom: '1px solid rgba(8,27,51,0.06)', display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-md)', background: 'rgba(8,27,51,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
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
              <div key={payment.id} style={{ padding: '16px 24px', borderBottom: '1px solid rgba(8,27,51,0.06)', display: 'flex', alignItems: 'center', gap: '16px' }}>
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
  );
};

export default CustomerDashboard;
