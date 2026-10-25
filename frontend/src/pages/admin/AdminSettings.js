import React, { useCallback, useEffect, useState } from 'react';
import api, { dateTime, humanize } from '../../api';
import {
  DataTable,
  EmptyState,
  ErrorState,
  Field,
  Icons,
  Loading,
  PageHeader
} from '../../components/ui';
import { useAuth } from '../../components/AuthContext';

/**
 * Admin -> Settings
 * System configuration, report exports and the audit trail.
 *
 * The backend exposes reports and audit logs under /api/dashboard/*; the
 * "settings" surface is where an administrator finds them alongside account
 * details.
 */
const AdminSettings = () => {
  const { user, logout } = useAuth();
  const [auditLogs, setAuditLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState('');

  const loadLogs = useCallback(async () => {
    setLogsLoading(true);
    setError('');
    try {
      const res = await api.get('/dashboard/audit-logs?limit=25');
      // Accept either { data: { logs } } or { data: [...] }.
      setAuditLogs(res.data.logs || res.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLogsLoading(false);
    }
  }, []);

  useEffect(() => { loadLogs(); }, [loadLogs]);

  const downloadReport = async (type, format) => {
    const key = `${type}-${format}`;
    setDownloading(key);
    setError('');
    try {
      await api.download(`/dashboard/${format}/${type}`, `${type}-report.${format}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setDownloading('');
    }
  };

  const REPORTS = [
    { type: 'policies', label: 'Policies Report', description: 'All issued policies with customer and status detail.' },
    { type: 'claims', label: 'Claims Report', description: 'Every claim filed, including decisions and amounts.' },
    { type: 'payments', label: 'Payments Report', description: 'Full payment ledger with totals by period.' },
    { type: 'customers', label: 'Customers Report', description: 'Registered customers and their active policies.' }
  ];

  return (
    <div className="fade-in">
      <PageHeader title="Settings" subtitle="Account, reports and system activity" />

      {error && <ErrorState message={error} onRetry={loadLogs} />}

      <div className="card mb-3">
        <h3 className="mb-3">Your Account</h3>
        <div className="grid-2">
          <Field label="Name">{user?.fullName || '—'}</Field>
          <Field label="Email">{user?.email || '—'}</Field>
          <Field label="Role">{humanize(user?.role || 'admin')}</Field>
          <Field label="Account ID">{user?.id || '—'}</Field>
        </div>
        <button className="btn btn-outline mt-2" onClick={logout}>
          <Icons.LogOut /> Sign Out
        </button>
      </div>

      <div className="card mb-3">
        <h3 className="mb-1">Reports</h3>
        <p className="text-secondary mb-3">
          Export system data as a PDF summary or a CSV for further analysis.
        </p>

        <div className="report-grid">
          {REPORTS.map((report) => (
            <div key={report.type} className="report-card">
              <div>
                <strong>{report.label}</strong>
                <p className="text-secondary" style={{ fontSize: '13px', marginTop: '4px' }}>
                  {report.description}
                </p>
              </div>
              <div className="d-flex gap-2 mt-3">
                <button
                  className="btn btn-primary btn-sm"
                  disabled={downloading === `${report.type}-pdf`}
                  onClick={() => downloadReport(report.type, 'pdf')}
                >
                  {downloading === `${report.type}-pdf` ? 'Generating...' : 'PDF'}
                </button>
                <button
                  className="btn btn-outline btn-sm"
                  disabled={downloading === `${report.type}-csv`}
                  onClick={() => downloadReport(report.type, 'csv')}
                >
                  {downloading === `${report.type}-csv` ? 'Generating...' : 'CSV'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="d-flex justify-between align-center mb-3">
          <div>
            <h3>Audit Log</h3>
            <p className="text-secondary">Recent actions taken across the system</p>
          </div>
          <button className="btn btn-outline btn-sm" onClick={loadLogs} disabled={logsLoading}>
            Refresh
          </button>
        </div>

        {logsLoading ? (
          <Loading label="Loading activity..." />
        ) : (
          <DataTable
            columns={[
              { key: 'created_at', header: 'When', render: (r) => dateTime(r.created_at) },
              {
                key: 'user_name',
                header: 'User',
                render: (r) => r.user_name || r.user_email || 'System'
              },
              { key: 'action', header: 'Action', render: (r) => humanize(r.action) },
              { key: 'entity_type', header: 'Entity', render: (r) => humanize(r.entity_type) },
              { key: 'ip_address', header: 'IP', render: (r) => r.ip_address || '—' }
            ]}
            rows={auditLogs}
            empty={<EmptyState title="No activity recorded yet" />}
          />
        )}
      </div>
    </div>
  );
};

export default AdminSettings;


