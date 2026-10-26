import React, { useState, useEffect, useCallback } from 'react';
import api from '../../api';
import { Toaster, toast } from 'react-hot-toast';

// Admin Departments - department and reporting hierarchy management
const AdminDepartments = () => {
  const [departments, setDepartments] = useState([]);

  const fetchDepartments = useCallback(async () => {
    try {
      const res = await api.get('/admin/departments');
      if (res.success) {
        setDepartments(res.data.departments);
      }
    } catch (err) {
      toast.error('Failed to load departments');
    }
  }, []);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  return (
    <div className="fade-in">
      <Toaster position="top-right" />
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Departments</h1>
          <p className="dashboard-subtitle">Manage department structure and reporting hierarchy</p>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '2px solid #eee' }}>
                  <th style={{ padding: '12px' }}>Department</th>
                  <th style={{ padding: '12px' }}>Manager</th>
                  <th style={{ padding: '12px' }}>Employees</th>
                  <th style={{ padding: '12px' }}>Monthly Target</th>
                </tr>
              </thead>
              <tbody>
                {departments.length === 0 ? (
                  <tr>
                    <td colSpan="4" style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
                      No departments found.
                    </td>
                  </tr>
                ) : (
                  departments.map((d) => (
                    <tr key={d.id} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '12px', fontWeight: '600' }}>{d.name}</td>
                      <td style={{ padding: '12px' }}>{d.manager_email || '—'}</td>
                      <td style={{ padding: '12px' }}>{d.employee_count}</td>
                      <td style={{ padding: '12px' }}>{d.monthly_target}</td>
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

export default AdminDepartments;
