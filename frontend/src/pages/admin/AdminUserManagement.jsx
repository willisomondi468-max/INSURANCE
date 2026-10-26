import React, { useState, useEffect, useCallback } from 'react';
import api from '../../api';
import { Toaster, toast } from 'react-hot-toast';
import { humanize } from '../../api';

// Admin User Management - create users, assign roles, deactivate users
const AdminUserManagement = () => {
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 50, pages: 0 });
  const [filters, setFilters] = useState({ search: '', role: '', isActive: '' });
  const [creating, setCreating] = useState(false);
  const [newUser, setNewUser] = useState({
    email: '', password: '', role: 'customer', phone: '', companyId: ''
  });
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({ role: '', isActive: true });

  const fetchUsers = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      params.set('page', pagination.page);
      params.set('limit', pagination.limit);
      if (filters.search) params.set('search', filters.search);
      if (filters.role) params.set('role', filters.role);
      if (filters.isActive) params.set('isActive', filters.isActive);

      const res = await api.get(`/admin/users?${params.toString()}`);
      if (res.success) {
        setUsers(res.data.users);
        setPagination(res.data.pagination);
      }
    } catch (err) {
      toast.error('Failed to load users');
    }
  }, [pagination.page, pagination.limit, filters.search, filters.role, filters.isActive]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      setCreating(true);
      const res = await api.post('/admin/users', newUser);
      if (res.success) {
        setCreating(false);
        setNewUser({ email: '', password: '', role: 'customer', phone: '', companyId: '' });
        fetchUsers();
        toast.success('User created successfully');
      }
    } catch (err) {
      setCreating(false);
      toast.error(err.message || 'Failed to create user');
    }
  };

  const handleUpdate = async (id) => {
    try {
      const res = await api.put(`/admin/users/${id}`, editData);
      if (res.success) {
        setEditingId(null);
        fetchUsers();
        toast.success('User updated successfully');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to update user');
    }
  };

  return (
    <div className="fade-in">
      <Toaster position="top-right" />
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">User Management</h1>
          <p className="dashboard-subtitle">Create accounts, assign roles, deactivate users</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-body">
          <form onSubmit={handleCreate} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div>
              <label className="form-label">Email</label>
              <input
                type="email"
                value={newUser.email}
                onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                className="form-input"
              />
            </div>
            <div>
              <label className="form-label">Password</label>
              <input
                type="password"
                value={newUser.password}
                onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                className="form-input"
              />
            </div>
            <div>
              <label className="form-label">Role</label>
              <select
                value={newUser.role}
                onChange={e => setNewUser({ ...newUser, role: e.target.value })}
                className="form-input"
              >
                <option value="customer">Customer</option>
                <option value="employee">Employee</option>
                <option value="supervisor">Supervisor</option>
                <option value="department_manager">Department Manager</option>
                <option value="hr_manager">HR Manager</option>
                <option value="company_admin">Company Admin</option>
                <option value="system_admin">System Admin</option>
              </select>
            </div>
            <div>
              <label className="form-label">Phone</label>
              <input
                type="text"
                value={newUser.phone}
                onChange={e => setNewUser({ ...newUser, phone: e.target.value })}
                className="form-input"
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={creating}
            >
              {creating ? 'Creating...' : 'Create User'}
            </button>
          </form>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '280px' }}>
              <input
                type="text"
                placeholder="Search by email or phone..."
                value={filters.search}
                onChange={e => { setFilters({ ...filters, search: e.target.value }); setPagination({ ...pagination, page: 1 }); }}
                className="form-input"
              />
            </div>
            <select
              value={filters.role}
              onChange={e => { setFilters({ ...filters, role: e.target.value }); setPagination({ ...pagination, page: 1 }); }}
              className="form-input"
            >
              <option value="">All Roles</option>
              <option value="customer">Customer</option>
              <option value="employee">Employee</option>
              <option value="admin">Admin</option>
              <option value="system_admin">System Admin</option>
            </select>
            <select
              value={filters.isActive}
              onChange={e => { setFilters({ ...filters, isActive: e.target.value }); setPagination({ ...pagination, page: 1 }); }}
              className="form-input"
            >
              <option value="">All Status</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '2px solid #eee' }}>
                  <th style={{ padding: '12px' }}>Email</th>
                  <th style={{ padding: '12px' }}>Role</th>
                  <th style={{ padding: '12px' }}>Phone</th>
                  <th style={{ padding: '12px' }}>Company</th>
                  <th style={{ padding: '12px' }}>Status</th>
                  <th style={{ padding: '12px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
                      No users found.
                    </td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr key={u.id} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '12px', fontWeight: '600' }}>{u.email}</td>
                      <td style={{ padding: '12px' }}>{humanize(u.role)}</td>
                      <td style={{ padding: '12px' }}>{u.phone || '—'}</td>
                      <td style={{ padding: '12px' }}>{u.companyName || '—'}</td>
                      <td style={{ padding: '12px' }}>
                        <span className={`badge ${u.isActive ? 'badge-success' : 'badge-danger'}`}>
                          {u.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td style={{ padding: '12px' }}>
                        {editingId === u.id ? (
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <select
                              value={editData.role}
                              onChange={e => setEditData({ ...editData, role: e.target.value })}
                              className="form-input"
                              style={{ padding: '6px 10px', fontSize: '13px' }}
                            >
                              <option value="customer">Customer</option>
                              <option value="employee">Employee</option>
                              <option value="supervisor">Supervisor</option>
                              <option value="department_manager">Department Manager</option>
                              <option value="hr_manager">HR Manager</option>
                              <option value="company_admin">Company Admin</option>
                              <option value="system_admin">System Admin</option>
                            </select>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                              <input
                                type="checkbox"
                                checked={editData.isActive}
                                onChange={e => setEditData({ ...editData, isActive: e.target.checked })}
                              />
                              Active
                            </label>
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => handleUpdate(u.id)}
                            >
                              Save
                            </button>
                            <button
                              className="btn btn-outline btn-sm"
                              onClick={() => setEditingId(null)}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              className="btn btn-outline btn-sm"
                              onClick={() => {
                                setEditingId(u.id);
                                setEditData({ role: u.role, isActive: u.isActive });
                              }}
                            >
                              Edit
                            </button>
                          </div>
                        )}
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

export default AdminUserManagement;
