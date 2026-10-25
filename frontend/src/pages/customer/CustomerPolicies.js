import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { date, money } from '../../api';
import {
  DataTable,
  EmptyState,
  ErrorState,
  Field,
  Icons,
  Loading,
  Modal,
  PageHeader,
  Pagination,
  StatusBadge
} from '../../components/ui';

const LIMIT = 10;

/**
 * Customer -> My Policies
 * Lists the signed-in customer's policies and shows cover details.
 * Applying for a new policy happens on /customer/plans.
 */
const CustomerPolicies = () => {
  const [policies, setPolicies] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [detail, setDetail] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/policies?page=${page}&limit=${LIMIT}`);
      setPolicies(res.data.policies);
      setPagination(res.data.pagination);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { load(); }, [load]);

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

  const columns = [
    { key: 'policy_number', header: 'Policy #', render: (r) => <strong>{r.policy_number}</strong> },
    { key: 'plan_name', header: 'Plan', render: (r) => r.plan_name || '—' },
    { key: 'premium_amount', header: 'Premium', render: (r) => money(r.premium_amount) },
    { key: 'coverage_amount', header: 'Coverage', render: (r) => money(r.coverage_amount) },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    { key: 'start_date', header: 'Start', render: (r) => date(r.start_date) },
    { key: 'end_date', header: 'Expires', render: (r) => date(r.end_date) },
    {
      key: 'actions',
      header: '',
      render: (r) => (
        <button className="btn btn-outline btn-sm" onClick={() => openDetail(r)}>Details</button>
      )
    }
  ];

  return (
    <div className="fade-in">
      <PageHeader
        title="My Policies"
        subtitle="Cover you currently hold with us"
        action={
          <Link className="btn btn-primary" to="/customer/plans">
            <Icons.Plus /> Buy a Policy
          </Link>
        }
      />

      <div className="card">
        {error && <ErrorState message={error} onRetry={load} />}

        {loading ? (
          <Loading label="Loading your policies..." />
        ) : (
          <>
            <DataTable
              columns={columns}
              rows={policies}
              empty={
                <EmptyState
                  title="No policies yet"
                  message="Browse our plans to find cover that suits you."
                  action={
                    <Link className="btn btn-primary mt-3" to="/customer/plans">
                      Browse Plans
                    </Link>
                  }
                />
              }
            />
            <Pagination pagination={pagination} onPageChange={setPage} />
          </>
        )}
      </div>

      {detail && (
        <Modal
          title={`Policy ${detail.policy_number || ''}`}
          onClose={() => setDetail(null)}
          footer={<button className="btn btn-outline" onClick={() => setDetail(null)}>Close</button>}
        >
          {detail.loading ? (
            <Loading label="Loading policy..." />
          ) : (
            <>
              <div className="grid-2">
                <Field label="Status"><StatusBadge status={detail.status} /></Field>
                <Field label="Plan">{detail.plan_name || '—'}</Field>
                <Field label="Premium">{money(detail.premium_amount)}</Field>
                <Field label="Coverage">{money(detail.coverage_amount)}</Field>
                <Field label="Start Date">{date(detail.start_date)}</Field>
                <Field label="End Date">{date(detail.end_date)}</Field>
              </div>

              {Array.isArray(detail.plan_features) && detail.plan_features.length > 0 && (
                <Field label="What's Covered">
                  <ul style={{ paddingLeft: '18px' }}>
                    {detail.plan_features.map((f, i) => (
                      <li key={i} className="text-secondary">{f}</li>
                    ))}
                  </ul>
                </Field>
              )}

              <h3 className="mt-3 mb-2">Payments ({detail.payments?.length || 0})</h3>
              <DataTable
                columns={[
                  { key: 'amount', header: 'Amount', render: (r) => money(r.amount) },
                  { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
                  { key: 'payment_date', header: 'Date', render: (r) => date(r.payment_date) }
                ]}
                rows={detail.payments}
                empty={<p className="text-secondary">No payments recorded.</p>}
              />

              <h3 className="mt-3 mb-2">Claims ({detail.claims?.length || 0})</h3>
              <DataTable
                columns={[
                  { key: 'claim_number', header: 'Claim #' },
                  { key: 'amount_claimed', header: 'Amount', render: (r) => money(r.amount_claimed) },
                  { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> }
                ]}
                rows={detail.claims}
                empty={<p className="text-secondary">No claims on this policy.</p>}
              />
            </>
          )}
        </Modal>
      )}
    </div>
  );
};

export default CustomerPolicies;


