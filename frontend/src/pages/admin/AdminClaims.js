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
const STATUSES = ['pending', 'under_review', 'approved', 'rejected', 'paid'];

/**
 * Admin -> Claims
 * Review queue for insurance claims. An admin can move a claim through
 * pending -> under_review -> approved/rejected -> paid and leave reviewer notes.
 */
const AdminClaims = () => {
  const [claims, setClaims] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [detail, setDetail] = useState(null);
  const [reviewStatus, setReviewStatus] = useState('');
  const [reviewNotes, setReviewNotes] = useState('');
  const [busy, setBusy] = useState(false);

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
      setReviewStatus(res.data.status);
      setReviewNotes('');
    } catch (err) {
      setError(err.message);
      setDetail(null);
    }
  };

  const submitReview = async () => {
    setBusy(true);
    try {
      await api.put(`/claims/${detail.id}/status`, {
        status: reviewStatus,
        notes: reviewNotes || undefined
      });
      setDetail(null);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const removeClaim = async (claimId) => {
    if (!window.confirm('Delete this claim permanently?')) return;
    setBusy(true);
    try {
      await api.delete(`/claims/${claimId}`);
      setDetail(null);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const columns = [
    { key: 'claim_number', header: 'Claim #', render: (r) => <strong>{r.claim_number}</strong> },
    { key: 'customer_name', header: 'Customer', render: (r) => r.customer_name || '—' },
    { key: 'claim_type', header: 'Type', render: (r) => humanize(r.claim_type) },
    { key: 'amount_claimed', header: 'Claimed', render: (r) => money(r.amount_claimed) },
    { key: 'amount_approved', header: 'Approved', render: (r) => (r.amount_approved ? money(r.amount_approved) : '—') },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    { key: 'created_at', header: 'Filed', render: (r) => date(r.created_at) },
    {
      key: 'actions',
      header: '',
      render: (r) => (
        <button className="btn btn-outline btn-sm" onClick={() => openDetail(r)}>
          Review
        </button>
      )
    }
  ];

  const canReview = detail && !detail.loading && !['paid', 'rejected'].includes(detail.status);

  return (
    <div className="fade-in">
      <PageHeader title="Claims" subtitle="Review and settle insurance claims" />

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
            {STATUSES.map((s) => (
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
                  title="No claims found"
                  message={search || status ? 'Try adjusting your filters.' : 'No claims have been filed yet.'}
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
          footer={
            <>
              <button className="btn btn-danger" disabled={busy} onClick={() => removeClaim(detail.id)}>
                Delete
              </button>
              <button className="btn btn-outline" onClick={() => setDetail(null)}>Close</button>
              <button className="btn btn-primary" disabled={busy || !canReview} onClick={submitReview}>
                {busy ? 'Saving...' : 'Save Decision'}
              </button>
            </>
          }
        >
          {detail.loading ? (
            <Loading label="Loading claim..." />
          ) : (
            <>
              <div className="grid-2">
                <Field label="Customer">{detail.customer_name || '—'}</Field>
                <Field label="Contact">{detail.customer_phone || detail.customer_email || '—'}</Field>
                <Field label="Policy">{detail.policy_number || '—'}</Field>
                <Field label="Plan">{detail.plan_name || '—'}</Field>
                <Field label="Claim Type">{humanize(detail.claim_type)}</Field>
                <Field label="Current Status"><StatusBadge status={detail.status} /></Field>
                <Field label="Amount Claimed">{money(detail.amount_claimed)}</Field>
                <Field label="Amount Approved">
                  {detail.amount_approved ? money(detail.amount_approved) : '—'}
                </Field>
                <Field label="Incident Date">{date(detail.incident_date)}</Field>
                <Field label="Filed On">{date(detail.created_at)}</Field>
              </div>

              <Field label="Description">
                <p className="text-secondary">{detail.description || '—'}</p>
              </Field>

              {detail.reviewer_notes && (
                <Field label="Previous Reviewer Notes">
                  <p className="text-secondary">{detail.reviewer_notes}</p>
                </Field>
              )}

              {canReview ? (
                <>
                  <hr className="divider" />
                  <h3 className="mb-2">Decision</h3>
                  <Field label="New Status">
                    <select
                      className="form-select"
                      value={reviewStatus}
                      onChange={(e) => setReviewStatus(e.target.value)}
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>{humanize(s)}</option>
                      ))}
                    </select>
                  </Field>
                  <Field
                    label="Reviewer Notes"
                    hint="Shown to the customer on their claim. Explain the decision where relevant."
                  >
                    <textarea
                      className="form-textarea"
                      rows={4}
                      value={reviewNotes}
                      onChange={(e) => setReviewNotes(e.target.value)}
                      placeholder="Reason for approval or rejection..."
                    />
                  </Field>
                </>
              ) : (
                <p className="text-secondary mt-3">
                  This claim is {humanize(detail.status)} and can no longer be changed.
                </p>
              )}
            </>
          )}
        </Modal>
      )}
    </div>
  );
};

export default AdminClaims;


