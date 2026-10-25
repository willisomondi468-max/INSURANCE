import React, { useCallback, useEffect, useState } from 'react';
import api, { date, humanize, money } from '../../api';
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

/**
 * Provider -> Claim Review
 * A focused queue for service providers: see claims awaiting review and move
 * them forward. The backend gates PUT /api/claims/:id/status behind
 * requireAdmin, so providers get a read/review view and any write attempt is
 * surfaced honestly rather than silently failing.
 */
const ProviderClaims = () => {
  const [claims, setClaims] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [detail, setDetail] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page, limit: LIMIT });
      if (search) params.set('search', search);
      if (status) params.set('status', status);

      const res = await api.get(`/claims?${params.toString()}`);
      setClaims(res.data.claims);
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

  const openDetail = async (claim) => {
    setDetail({ id: claim.id, loading: true });
    try {
      const res = await api.get(`/claims/${claim.id}`);
      setDetail({ ...res.data, loading: false });
    } catch (err) {
      setError(err.message);
      setDetail(null);
    }
  };

  const columns = [
    { key: 'claim_number', header: 'Claim #', render: (r) => <strong>{r.claim_number}</strong> },
    { key: 'customer_name', header: 'Customer', render: (r) => r.customer_name || '—' },
    { key: 'claim_type', header: 'Type', render: (r) => humanize(r.claim_type) },
    { key: 'amount_claimed', header: 'Claimed', render: (r) => money(r.amount_claimed) },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    { key: 'created_at', header: 'Filed', render: (r) => date(r.created_at) },
    {
      key: 'actions',
      header: '',
      render: (r) => (
        <button className="btn btn-outline btn-sm" onClick={() => openDetail(r)}>Review</button>
      )
    }
  ];

  return (
    <div className="fade-in">
      <PageHeader title="Claim Review" subtitle="Claims awaiting assessment and settlement" />

      <div className="card">
        <div className="d-flex justify-between align-center mb-3 gap-2" style={{ flexWrap: 'wrap' }}>
          <SearchInput
            value={search}
            onChange={(v) => { setSearch(v); setPage(1); }}
            placeholder="Search by claim number or customer..."
          />
          <select
            className="form-select"
            style={{ maxWidth: '180px' }}
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          >
            <option value="">All statuses</option>
            {['pending', 'under_review', 'approved', 'rejected', 'paid'].map((s) => (
              <option key={s} value={s}>{humanize(s)}</option>
            ))}
          </select>
        </div>

        {error && <ErrorState message={error} onRetry={load} />}

        {loading ? (
          <Loading label="Loading claims..." />
        ) : (
          <>
            <DataTable
              columns={columns}
              rows={claims}
              empty={
                <EmptyState
                  title="No claims to review"
                  message={status === 'pending' ? 'The pending queue is clear.' : 'No claims match these filters.'}
                />
              }
            />
            <Pagination pagination={pagination} onPageChange={setPage} />
          </>
        )}
      </div>

      {detail && (
        <Modal
          title={`Claim ${detail.claim_number || ''}`}
          onClose={() => setDetail(null)}
          footer={<button className="btn btn-outline" onClick={() => setDetail(null)}>Close</button>}
        >
          {detail.loading ? (
            <Loading label="Loading claim..." />
          ) : (
            <>
              <div className="grid-2">
                <Field label="Status"><StatusBadge status={detail.status} /></Field>
                <Field label="Type">{humanize(detail.claim_type)}</Field>
                <Field label="Customer">{detail.customer_name || '—'}</Field>
                <Field label="Contact">{detail.customer_phone || detail.customer_email || '—'}</Field>
                <Field label="Policy">{detail.policy_number || '—'}</Field>
                <Field label="Plan">{detail.plan_name || '—'}</Field>
                <Field label="Amount Claimed">{money(detail.amount_claimed)}</Field>
                <Field label="Amount Approved">
                  {detail.amount_approved ? money(detail.amount_approved) : '—'}
                </Field>
                <Field label="Incident Date">{date(detail.incident_date)}</Field>
                <Field label="Filed On">{date(detail.created_at)}</Field>
              </div>

              <Field label="Description">
                <p className="text-secondary">{detail.description}</p>
              </Field>

              {detail.reviewer_notes && (
                <Field label="Reviewer Notes">
                  <div className="alert alert-info">{detail.reviewer_notes}</div>
                </Field>
              )}

              <div className="alert alert-info mt-3">
                Claim decisions are finalised by an administrator. Escalate anything uncertain through a
                support ticket so it can be actioned.
              </div>
            </>
          )}
        </Modal>
      )}
    </div>
  );
};

export default ProviderClaims;


