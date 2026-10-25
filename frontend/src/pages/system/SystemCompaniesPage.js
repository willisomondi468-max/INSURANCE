import React, { useState, useEffect } from 'react';
import api from '../../api';

// SystemCompaniesPage - Company management for System Admin
const SystemCompaniesPage = () => {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '', legal_name: '', email: '', phone: '', address: '', website: '', subscription_plan: 'basic'
  });

  const fetchCompanies = async () => {
    try {
      const res = await api.get('/system/companies', token);
      if (res.success) setCompanies(res.data.companies);
    } catch (err) {
      console.error('Fetch companies error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/system/companies', formData, token);
      if (res.success) {
        setShowForm(false);
        setFormData({ name: '', legal_name: '', email: '', phone: '', address: '', website: '', subscription_plan: 'basic' });
        fetchCompanies();
      } else {
        alert(res.message || 'Failed to create company');
      }
    } catch (err) {
      alert('Failed to create company');
    }
  };

  return (
    <div className="fade-in">
      <div className="dashboard-header">
        <h1 className="dashboard-title">Company Management</h1>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>
          + Add Company
        </button>
      </div>

      {loading ? (
        <div className="loading-spinner"><div className="spinner"></div></div>
      ) : (
        <div className="card">
          <div style={{ padding: '16px', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              className="form-input"
              placeholder="Search companies..."
              style={{ flex: 1, minWidth: '250px' }}
            />
          </div>
        </div>
      )}

      {loading ? (
        <div className="loading-spinner"><div className="spinner"></div></div>
      ) : (
        <div className="card" style={{ marginTop: '16px' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '2px solid #eee' }}>
                  <th style={{ padding: '12px' }}>Company Name</th>
                  <th style={{ padding: '12px' }}>Legal Name</th>
                  <th style={{ padding: '12px' }}>Email</th>
                  <th style={{ padding: '12px' }}>Phone</th>
                  <th style={{ padding: '12px' }}>Plan</th>
                  <th style={{ padding: '12px' }}>Status</th>
                  <th style={{ padding: '12px' }}>Users</th>
                  <th style={{ padding: '12px' }}>Admins</th>
                  <th style={{ padding: '12px' }}>Employees</th>
                  <th style={{ padding: '12px' }}>Customers</th>
                </tr>
              </thead>
              <tbody>
                {companies.map(c => (
                  <tr key={c.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '12px', fontWeight: 'bold' }}>{c.name}</td>
                    <td style={{ padding: '12px' }}>{c.legal_name || '—'}</td>
                    <td style={{ padding: '12px' }}>{c.email || '—'}</td>
                    <td style={{ padding: '12px' }}>{c.phone || '—'}</td>
                    <td style={{ padding: '12px' }}>{c.subscription_plan}</td>
                    <td style={{ padding: '12px' }}>
                      <span className={`badge ${c.is_active ? 'badge-accent' : 'badge-danger'}`}>
                        {c.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ padding: '12px' }}>{c.total_users}</td>
                    <td style={{ padding: '12px' }}>{c.company_admins}</td>
                    <td style={{ padding: '12px' }}>{c.employees}</td>
                    <td style={{ padding: '12px' }}>{c.customers}</td>
                  </tr>
                ))}
                {companies.length === 0 && (
                  <tr>
                    <td colSpan="10" style={{ padding: '24px', textAlign: 'center', color: '#666' }}>
                      No companies found. Add your first company to get started.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showForm && (
        <div className="card" style={{ marginTop: '24px' }}>
          <div className="card-header">
            <h3 className="card-title">Create New Company</h3>
          </div>
          <form onSubmit={handleCreate} style={{ padding: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Company Name *</label>
              <input className="form-input" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
            </div>
            <div className="form-group">
              <label className="form-label">Legal Name</label>
              <input className="form-input" value={formData.legal_name} onChange={(e) => setFormData({ ...formData, legal_name: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input type="email" className="form-input" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Phone</label>
              <input className="form-input" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Address</label>
              <input className="form-input" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Website</label>
              <input className="form-input" value={formData.website} onChange={(e) => setFormData({ ...formData, website: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Subscription Plan</label>
              <select className="form-input" value={formData.subscription_plan} onChange={(e) => setFormData({ ...formData, subscription_plan: e.target.value })}>
                <option value="basic">Basic</option>
                <option value="professional">Professional</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>
            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-sm btn-outline" onClick={() => setShowForm(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Create Company</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default SystemCompaniesPage;

