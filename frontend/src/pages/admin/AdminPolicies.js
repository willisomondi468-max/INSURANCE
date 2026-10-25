import React, { useCallback, useEffect, useState } from 'react';
import api, { date, money } from '../../api';
import {
  DataTable,
  EmptyState,
  ErrorState,
  Field,
  Loading,
  Modal,
  PageHeader,
  Pagination,
  SearchInput,
  StatusBadge
} from '../../components/ui';

const LIMIT = 10;
const STATUSES = ['pending', 'approved', 'active', 'cancelled', 'expired'];

/**
 * Admin -> Policies
 * Lists every policy with filters, and lets an admin change its status
 * (PUT /api/policies/:id/status) or delete it (DELETE /api/policies/:id).
 */
const AdminPolicies = () => {
  const [policies, setPolicies] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [detail, setDetail] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page, limit: LIMIT });
      if (search) params.set('search', search);
      if (status) params.set('status', status);

      const res = await api.get(`/policies?${params.toString()}`);
      setPolicies(res.data.policies);
      setPagination(res.data.pagination);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [page, search, status]);

  useEffect(() => {
    const timer = setTimeout(load, search ? 400 : 0);
    return () => clearTimeout(timer);
  }, [load, search]);

  const openDetail = async (policy) => {
    setDetail({ id: policy.id, loading: true });
    try {
      const res = await api.get(`/policies/${policy.id}`);
      setDetail({ ...res.data, loading: false });
    } catch (err) {
      setError(err.message);
      setDetail(null);
    }
  };

  const changeStatus = async (policyId, newStatus) => {
    setBusy(true);
    try {
      await api.put(`/policies/${policyId}/status`, { status: newStatus });
      await load();
      if (detail && detail.id === policyId) {
        setDetail((d) => ({ ...d, status: newStatus }));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const removePolicy = async (policyId) => {
    if (!window.confirm('Delete this policy permanently? This cannot be undone.')) return;
    setBusy(true);
    try {
      await api.delete(`/policies/${policyId}`);
      setDetail(null);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const columns = [
    { key: 'policy_number', header: 'Policy #', render: (r) => <strong>{r.policy_number}</strong> },
    { key: 'customer_name', header: 'Customer', render: (r) => r.customer_name || '—' },
    { key: 'plan_name', header: 'Plan', render: (r) => r.plan_name || '—' },
    { key: 'premium_amount', header: 'Premium', render: (r) => money(r.premium_amount) },
    { key: 'coverage_amount', header: 'Coverage', render: (r) => money(r.coverage_amount) },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    { key: 'end_date', header: 'Expires', render: (r) => date(r.end_date) },
    {
      key: 'actions',
      header: '',
      render: (r) => (
        <button className="btn btn-outline btn-sm" onClick={() => openDetail(r)}>
          Manage
        </button>
      )
    }
  ];

  return (
    <div className="fade-in">
      <PageHeader title="Policies" subtitle="Issue, approve and manage customer policies" />

      <div className="card">
        <div className="d-flex justify-between align-center mb-3 gap-2" style={{ flexWrap: 'wrap' }}>
          <SearchInput
            value={search}
            onChange={(v) => { setSearch(v); setPage(1); }}
            placeholder="Search by policy number or customer..."
          />
          <select
            className="form-select"
            style={{ maxWidth: '180px' }}
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          >
            <option value="">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {error && <ErrorState message={error} onRetry={load} />}

        {loading ? (
          <Loading label="Loading policies..." />
        ) : (
          <>
            <DataTable
              columns={columns}
              rows={policies}
              empty={
                <EmptyState
                  title="No policies found"
                  message={search || status ? 'Try adjusting your filters.' : 'No policies have been issued yet.'}
                />
              }
            />
            <Pagination pagination={pagination} onPageChange={setPage} />
          </>
        )}
      </div>

      {detail && (
        <Modal
          title="Policy Details"
          onClose={() => setDetail(null)}
          footer={
            <>
              <button className="btn btn-danger" disabled={busy} onClick={() => removePolicy(detail.id)}>
                Delete Policy
              </button>
              <button className="btn btn-outline" onClick={() => setDetail(null)}>Close</button>
            </>
          }
        >
          {detail.loading ? (
            <Loading label="Loading policy..." />
          ) : (
            <>
              <div className="grid-2">
                <Field label="Policy Number">{detail.policy_number}</Field>
                <Field label="Status"><StatusBadge status={detail.status} /></Field>
                <Field label="Customer">{detail.customer_name || '—'}</Field>
                <Field label="Customer Email">{detail.customer_email || '—'}</Field>
                <Field label="Plan">{detail.plan_name || '—'}</Field>
                <Field label="Premium">{money(detail.plan_premium ?? detail.premium_amount)}</Field>
                <Field label="Coverage">{money(detail.plan_coverage ?? detail.coverage_amount)}</Field>
                <Field label="Start Date">{date(detail.start_date)}</Field>
                <Field label="End Date">{date(detail.end_date)}</Field>
              </div>

              <Field label="Update Status" hint="Changing to 'active' approves and activates the policy.">
                <select
                  className="form-select"
                  value={detail.status}
                  disabled={busy}
                  onChange={(e) => changeStatus(detail.id, e.target.value)}
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </option>
                  ))}
                </select>
              </Field>

              <h3 className="mt-3 mb-2">Payments ({detail.payments?.length || 0})</h3>
              <DataTable
                columns={[
                  { key: 'transaction_id', header: 'Txn' },
                  { key: 'amount', header: 'Amount', render: (r) => money(r.amount) },
                  { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
                  { key: 'payment_date', header: 'Date', render: (r) => date(r.payment_date) }
                ]}
                rows={detail.payments}
                empty={<p className="text-secondary">No payments.</p>}
              />

              <h3 className="mt-3 mb-2">Claims ({detail.claims?.length || 0})</h3>
              <DataTable
                columns={[
                  { key: 'claim_number', header: 'Claim #' },
                  { key: 'amount_claimed', header: 'Amount', render: (r) => money(r.amount_claimed) },
                  { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
                  { key: 'created_at', header: 'Filed', render: (r) => date(r.created_at) }
                ]}
                rows={detail.claims}
                empty={<p className="text-secondary">No claims.</p>}
              />
            </>
          )}
        </Modal>
      )}
    </div>
  );
};

export default AdminPolicies;


