import React, { useState, useEffect, useCallback } from 'react';
import api from '../../api';
import { Toaster, toast } from 'react-hot-toast';
import { humanize } from '../../api';

// Admin Audit Logs - audit logs and security events
const AdminAuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 50, pages: 0 });
  const [filters, setFilters] = useState({ action: '', entityType: '', userId: '' });

  const fetchLogs = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      params.set('page', pagination.page);
      params.set('limit', pagination.limit);
      if (filters.action) params.set('action', filters.action);
      if (filters.entityType) params.set('entityType', filters.entityType);
      if (filters.userId) params.set('userId', filters.userId);

      const res = await api.get(`/admin/audit-logs?${params.toString()}`);
      if (res.success) {
        setLogs(res.data.auditLogs);
        setPagination(res.data.pagination);
      }
    } catch (err) {
      toast.error('Failed to load audit logs');
    }
  }, [pagination.page, pagination.limit, filters.action, filters.entityType, filters.userId]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return (
    <div className="fade-in">
      <Toaster position="top-right" />
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Audit Logs</h1>
          <p className="dashboard-subtitle">Review security events and system changes</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            <div>
              <label className="form-label">Action</label>
              <input
                type="text"
                placeholder="Filter by action..."
                value={filters.action}
                onChange={e => { setFilters({ ...filters, action: e.target.value }); setPagination({ ...pagination, page: 1 }); }}
                className="form-input"
              />
            </div>
            <div>
              <label className="form-label">Entity Type</label>
              <input
                type="text"
                placeholder="Filter by entity type..."
                value={filters.entityType}
                onChange={e => { setFilters({ ...filters, entityType: e.target.value }); setPagination({ ...pagination, page: 1 }); }}
                className="form-input"
              />
            </div>
            <div>
              <label className="form-label">User ID</label>
              <input
                type="text"
                placeholder="Filter by user ID..."
                value={filters.userId}
                onChange={e => { setFilters({ ...filters, userId: e.target.value }); setPagination({ ...pagination, page: 1 }); }}
                className="form-input"
              />
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '2px solid #eee' }}>
                  <th style={{ padding: '12px' }}>Time</th>
                  <th style={{ padding: '12px' }}>Actor</th>
                  <th style={{ padding: '12px' }}>Role</th>
                  <th style={{ padding: '12px' }}>Action</th>
                  <th style={{ padding: '12px' }}>Entity</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
                      No audit logs found.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '12px' }}>{dateTime(log.created_at)}</td>
                      <td style={{ padding: '12px' }}>{log.actor_email || 'System'}</td>
                      <td style={{ padding: '12px' }}>{humanize(log.actor_role)}</td>
                      <td style={{ padding: '12px' }}>{humanize(log.action)}</td>
                      <td style={{ padding: '12px' }}>{log.entity_type}</td>
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

const dateTime = (value) =>
  value ? new Date(value).toLocaleString() : '—';

export default AdminAuditLogs;
