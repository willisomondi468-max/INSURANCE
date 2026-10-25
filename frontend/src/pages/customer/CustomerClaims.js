import React, { useCallback, useEffect, useState } from 'react';
import api, { date, humanize, money } from '../../api';
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
const CLAIM_TYPES = ['medical', 'accident', 'theft', 'fire', 'travel', 'other'];

const BLANK = {
  policyId: '',
  claimType: 'medical',
  amountClaimed: '',
  incidentDate: '',
  description: ''
};

/**
 * Customer -> My Claims
 * Lists the customer's claims and lets them file a new one against a policy
 * they hold (POST /api/claims). Policies are loaded once for the dropdown.
 */
const CustomerClaims = () => {
  const [claims, setClaims] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [policies, setPolicies] = useState([]);
  const [detail, setDetail] = useState(null);

  const [filing, setFiling] = useState(false);
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/claims?page=${page}&limit=${LIMIT}`);
      setClaims(res.data.claims);
      setPagination(res.data.pagination);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { load(); }, [load]);

  // Only active policies can carry a claim, so load those for the form.
  const loadPolicies = async () => {
    try {
      const res = await api.get('/policies?status=active&limit=100');
      setPolicies(res.data.policies || []);
    } catch (err) {
      setError(err.message);
    }
  };

  const openFile = async () => {
    setForm(BLANK);
    setFormError('');
    setFiling(true);
    await loadPolicies();
  };

  const submit = async (e) => {
    e.preventDefault();
    setFormError('');

    const payload = {
      policyId: form.policyId,
      claimType: form.claimType,
      amountClaimed: Number(form.amountClaimed),
      description: form.description.trim()
    };

    if (!payload.policyId) return setFormError('Select the policy this claim is against.');
    if (!payload.amountClaimed || payload.amountClaimed <= 0) return setFormError('Enter a valid claim amount.');
    if (!payload.description) return setFormError('Describe what happened.');

    setSaving(true);
    try {
      await api.post('/claims', payload);
      setFiling(false);
      setPage(1);
      await load();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

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
    { key: 'claim_type', header: 'Type', render: (r) => humanize(r.claim_type) },
    { key: 'policy_number', header: 'Policy', render: (r) => r.policy_number || '—' },
    { key: 'amount_claimed', header: 'Claimed', render: (r) => money(r.amount_claimed) },
    { key: 'amount_approved', header: 'Approved', render: (r) => (r.amount_approved ? money(r.amount_approved) : '—') },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    { key: 'created_at', header: 'Filed', render: (r) => date(r.created_at) },
    {
      key: 'actions',
      header: '',
      render: (r) => (
        <button className="btn btn-outline btn-sm" onClick={() => openDetail(r)}>View</button>
      )
    }
  ];

  return (
    <div className="fade-in">
      <PageHeader
        title="My Claims"
        subtitle="Track claims you have filed"
        action={
          <button className="btn btn-primary" onClick={openFile}>
            <Icons.Plus /> File a Claim
          </button>
        }
      />

      <div className="card">
        {error && <ErrorState message={error} onRetry={load} />}

        {loading ? (
          <Loading label="Loading your claims..." />
        ) : (
          <>
            <DataTable
              columns={columns}
              rows={claims}
              empty={
                <EmptyState
                  title="No claims filed"
                  message="If something happens that your policy covers, you can file a claim here."
                  action={
                    <button className="btn btn-primary mt-3" onClick={openFile}>
                      <Icons.Plus /> File a Claim
                    </button>
                  }
                />
              }
            />
            <Pagination pagination={pagination} onPageChange={setPage} />
          </>
        )}
      </div>

      {/* ---------- Claim detail ---------- */}
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
                <Field label="Policy">{detail.policy_number || '—'}</Field>
                <Field label="Plan">{detail.plan_name || '—'}</Field>
                <Field label="Amount Claimed">{money(detail.amount_claimed)}</Field>
                <Field label="Amount Approved">
                  {detail.amount_approved ? money(detail.amount_approved) : 'Pending'}
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
            </>
          )}
        </Modal>
      )}

      {/* ---------- File a claim ---------- */}
      {filing && (
        <Modal
          title="File a Claim"
          onClose={() => setFiling(false)}
          footer={
            <>
              <button className="btn btn-outline" onClick={() => setFiling(false)} disabled={saving}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                disabled={saving || !form.policyId || !form.amountClaimed || !form.description.trim()}
                onClick={submit}
              >
                {saving ? 'Submitting...' : 'Submit Claim'}
              </button>
            </>
          }
        >
          <form onSubmit={submit}>
            {formError && <div className="alert alert-danger mb-3">{formError}</div>}

            <Field label="Policy">
              {policies.length === 0 ? (
                <div className="alert alert-info">
                  You have no active policies, so there is nothing to claim against yet.
                </div>
              ) : (
                <select
                  className="form-select"
                  value={form.policyId}
                  onChange={(e) => setForm({ ...form, policyId: e.target.value })}
                >
                  <option value="">Select a policy...</option>
                  {policies.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.policy_number} · {p.plan_name} ({money(p.coverage_amount)} cover)
                    </option>
                  ))}
                </select>
              )}
            </Field>

            <div className="grid-2">
              <Field label="Claim Type">
                <select
                  className="form-select"
                  value={form.claimType}
                  onChange={(e) => setForm({ ...form, claimType: e.target.value })}
                >
                  {CLAIM_TYPES.map((t) => (
                    <option key={t} value={t}>{humanize(t)}</option>
                  ))}
                </select>
              </Field>
              <Field label="Amount Claimed ($)">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="form-input"
                  value={form.amountClaimed}
                  onChange={(e) => setForm({ ...form, amountClaimed: e.target.value })}
                />
              </Field>
            </div>

            <Field label="Date of Incident">
              <input
                type="date"
                className="form-input"
                value={form.incidentDate}
                onChange={(e) => setForm({ ...form, incidentDate: e.target.value })}
              />
            </Field>

            <Field label="What Happened?" hint="Be specific — this is what the reviewer will assess the claim on.">
              <textarea
                className="form-textarea"
                rows={5}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Describe the incident and the loss incurred..."
              />
            </Field>

            <button type="submit" hidden />
          </form>
        </Modal>
      )}
    </div>
  );
};

export default CustomerClaims;


