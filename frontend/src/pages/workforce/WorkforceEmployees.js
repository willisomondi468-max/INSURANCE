import React, { useState, useEffect, useCallback } from 'react';
import api from '../../api';

// WorkforceEmployees - Employee Management Page
const WorkforceEmployees = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 10, pages: 0 });
  const [filters, setFilters] = useState({ search: '', status: '', departmentId: '' });
  const [departments, setDepartments] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    employeeNumber: '', jobTitle: '', employmentStatus: 'active',
    contractedHours: 40, monthlyPerformanceTarget: 0, departmentId: ''
  });
  const [editingId, setEditingId] = useState(null);
  const [token] = useState(localStorage.getItem('token'));

  const fetchEmployees = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filters.search) params.set('search', filters.search);
      if (filters.status) params.set('status', filters.status);
      if (filters.departmentId) params.set('departmentId', filters.departmentId);
      params.set('page', pagination.page);
      params.set('limit', pagination.limit);

      const res = await api.get(`/employees?${params.toString()}`, token);
      if (res.success) {
        setEmployees(res.data.employees);
        setPagination(res.data.pagination);
      }
    } catch (err) {
      console.error('Fetch employees error:', err);
    } finally {
      setLoading(false);
    }
  }, [token, filters.search, filters.status, filters.departmentId, pagination.page, pagination.limit]);

  const fetchDepartments = useCallback(async () => {
    try {
      const res = await api.get('/analytics/departments', token);
      if (res.success) {
        setDepartments(res.data.departments.map(d => ({ id: d.id, name: d.name })));
      }
    } catch (err) {
      console.error('Fetch departments error:', err);
    }
  }, [token]);

  useEffect(() => {
    fetchEmployees();
    fetchDepartments();
  }, [fetchEmployees, fetchDepartments]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/employees', formData, token);
      if (res.success) {
        setShowForm(false);
        setFormData({ employeeNumber: '', jobTitle: '', employmentStatus: 'active', contractedHours: 40, monthlyPerformanceTarget: 0, departmentId: '' });
        fetchEmployees();
      } else {
        alert(res.message || 'Failed to create employee');
      }
    } catch (err) {
      alert('Failed to create employee');
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const res = await api.patch(`/employees/${editingId}`, formData, token);
      if (res.success) {
        setShowForm(false);
        setEditingId(null);
        setFormData({ employeeNumber: '', jobTitle: '', employmentStatus: 'active', contractedHours: 40, monthlyPerformanceTarget: 0, departmentId: '' });
        fetchEmployees();
      } else {
        alert(res.message || 'Failed to update employee');
      }
    } catch (err) {
      alert('Failed to update employee');
    }
  };

  const handleDeactivate = async (id) => {
    if (!window.confirm('Are you sure you want to deactivate this employee?')) return;
    try {
      const res = await api.delete(`/employees/${id}`, token);
      if (res.success) {
        fetchEmployees();
      } else {
        alert(res.message || 'Failed to deactivate employee');
      }
    } catch (err) {
      alert('Failed to deactivate employee');
    }
  };

  return (
    <div className="fade-in">
      <div className="dashboard-header">
        <h1 className="dashboard-title">Employee Management</h1>
        <button className="btn btn-primary" onClick={() => { setEditingId(null); setShowForm(true); }}>
          + Add Employee
        </button>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Employees</h3>
        </div>
        <div style={{ padding: '16px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="form-group" style={{ flex: 1, minWidth: '200px' }}>
            <input
              className="form-input"
              placeholder="Search by employee number or job title"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            />
          </div>
          <select
            className="form-input"
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="on_leave">On Leave</option>
            <option value="suspended">Suspended</option>
            <option value="inactive">Inactive</option>
            <option value="former">Former</option>
          </select>
          <select
            className="form-input"
            value={filters.departmentId}
            onChange={(e) => setFilters({ ...filters, departmentId: e.target.value })}
          >
            <option value="">All Departments</option>
            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="loading-spinner"><div className="spinner"></div></div>
      ) : (
        <div className="card">
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '2px solid #eee' }}>
                  <th style={{ padding: '12px' }}>Employee Number</th>
                  <th style={{ padding: '12px' }}>Job Title</th>
                  <th style={{ padding: '12px' }}>Department</th>
                  <th style={{ padding: '12px' }}>Status</th>
                  <th style={{ padding: '12px' }}>Contracted Hours</th>
                  <th style={{ padding: '12px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {employees.map(emp => (
                  <tr key={emp.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '12px', fontWeight: 'bold' }}>{emp.employeeNumber}</td>
                    <td style={{ padding: '12px' }}>{emp.jobTitle || '—'}</td>
                    <td style={{ padding: '12px' }}>{emp.departmentName || '—'}</td>
                    <td style={{ padding: '12px' }}>
                      <span className={`badge ${emp.employmentStatus === 'active' ? 'badge-accent' : 'badge-warning'}`}>
                        {emp.employmentStatus.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td style={{ padding: '12px' }}>{emp.contractedHours}</td>
                    <td style={{ padding: '12px' }}>
                      <button className="btn btn-sm btn-outline" onClick={() => {
                        setEditingId(emp.id);
                        setFormData({
                          employeeNumber: emp.employeeNumber,
                          jobTitle: emp.jobTitle || '',
                          employmentStatus: emp.employmentStatus,
                          contractedHours: emp.contractedHours,
                          monthlyPerformanceTarget: emp.monthlyPerformanceTarget,
                          departmentId: emp.departmentId || ''
                        });
                        setShowForm(true);
                      }}>Edit</button>
                      <button className="btn btn-sm btn-danger" onClick={() => handleDeactivate(emp.id)}>
                        {emp.employmentStatus === 'active' ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
                {employees.length === 0 && (
                  <tr>
                    <td colSpan="6" style={{ padding: '24px', textAlign: 'center', color: '#666' }}>
                      No employees found. Add your first employee to get started.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderTop: '1px solid #eee' }}>
            <span>Page {pagination.page} of {pagination.pages}</span>
            <div style={{ display: 'flex', gap: '8px' }}>
              {pagination.page > 1 && (
                <button className="btn btn-sm btn-outline" onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}>Prev</button>
              )}
              {pagination.page < pagination.pages && (
                <button className="btn btn-sm btn-outline" onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}>Next</button>
              )}
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="card" style={{ marginTop: '24px' }}>
          <div className="card-header">
            <h3 className="card-title">{editingId ? 'Edit Employee' : 'Add New Employee'}</h3>
          </div>
          <form onSubmit={editingId ? handleUpdate : handleCreate} style={{ padding: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Employee Number *</label>
              <input className="form-input" value={formData.employeeNumber} onChange={(e) => setFormData({ ...formData, employeeNumber: e.target.value })} required />
            </div>
            <div className="form-group">
              <label className="form-label">Job Title</label>
              <input className="form-input" value={formData.jobTitle} onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Department</label>
              <select className="form-input" value={formData.departmentId} onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}>
                <option value="">None</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Employment Status</label>
              <select className="form-input" value={formData.employmentStatus} onChange={(e) => setFormData({ ...formData, employmentStatus: e.target.value })}>
                <option value="active">Active</option>
                <option value="on_leave">On Leave</option>
                <option value="suspended">Suspended</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Contracted Hours</label>
              <input type="number" className="form-input" value={formData.contractedHours} onChange={(e) => setFormData({ ...formData, contractedHours: parseInt(e.target.value) || 40 })} />
            </div>
            <div className="form-group">
              <label className="form-label">Monthly Target</label>
              <input type="number" className="form-input" value={formData.monthlyPerformanceTarget} onChange={(e) => setFormData({ ...formData, monthlyPerformanceTarget: parseInt(e.target.value) || 0 })} />
            </div>
            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-sm btn-outline" onClick={() => { setShowForm(false); setEditingId(null); }}>Cancel</button>
              <button type="submit" className="btn btn-primary">{editingId ? 'Update' : 'Create'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default WorkforceEmployees;


