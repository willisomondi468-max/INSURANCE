import React, { useCallback, useEffect, useState } from 'react';
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
  StatCard,
  StatusBadge
} from '../../components/ui';

const LIMIT = 10;
const METHODS = ['card', 'bank_transfer', 'mobile_money', 'cash'];

/**
 * Customer -> Payments
 * Payment history plus a "Make a Payment" form that posts to
 * POST /api/payments against one of the customer's policies.
 */
const CustomerPayments = () => {
  const [payments, setPayments] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [policies, setPolicies] = useState([]);
  const [paying, setPaying] = useState(false);
  const [form, setForm] = useState({ policyId: '', amount: '', paymentMethod: 'card' });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const totalPaid = payments
    .filter((p) => p.status === 'completed')
    .reduce((sum, p) => sum + Number(p.amount), 0);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/payments?page=${page}&limit=${LIMIT}`);
      setPayments(res.data.payments);
      setPagination(res.data.pagination);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { load(); }, [load]);

  const openPay = async () => {
    setForm({ policyId: '', amount: '', paymentMethod: 'card' });
    setFormError('');
    setPaying(true);
    try {
      const res = await api.get('/policies?limit=100');
      setPolicies(res.data.policies || []);
    } catch (err) {
      setError(err.message);
    }
  };

  /** Selecting a policy prefills the amount with that plan's premium. */
  const onPolicyChange = (policyId) => {
    const policy = policies.find((p) => p.id === policyId);
    setForm((f) => ({
      ...f,
      policyId,
      amount: policy ? policy.premium_amount : f.amount
    }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setFormError('');

    const payload = {
      policyId: form.policyId,
      amount: Number(form.amount),
      paymentMethod: form.paymentMethod
    };

    if (!payload.policyId) return setFormError('Select the policy you are paying for.');
    if (!payload.amount || payload.amount <= 0) return setFormError('Enter a valid amount.');

    setSaving(true);
    try {
      await api.post('/payments', payload);
      setPaying(false);
      setPage(1);
      await load();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    { key: 'transaction_id', header: 'Transaction', render: (r) => <strong>{r.transaction_id}</strong> },
    { key: 'policy_number', header: 'Policy', render: (r) => r.policy_number || '—' },
    { key: 'amount', header: 'Amount', render: (r) => money(r.amount) },
    { key: 'payment_method', header: 'Method', render: (r) => (r.payment_method || '—').toUpperCase() },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    { key: 'payment_date', header: 'Date', render: (r) => date(r.payment_date) }
  ];

  return (
    <div className="fade-in">
      <PageHeader
        title="Payments"
        subtitle="Your premium payments and receipts"
        action={
          <button className="btn btn-primary" onClick={openPay}>
            <Icons.Plus /> Make a Payment
          </button>
        }
      />

      <div className="stats-grid mb-3">
        <StatCard icon={Icons.CreditCard} value={money(totalPaid)} label="Paid This Page" />
        <StatCard
          icon={Icons.Check}
          tone="accent"
          value={payments.filter((p) => p.status === 'completed').length}
          label="Completed"
        />
        <StatCard
          icon={Icons.BarChart}
          tone="warning"
          value={payments.filter((p) => p.status === 'pending').length}
          label="Pending"
        />
      </div>

      <div className="card">
        {error && <ErrorState message={error} onRetry={load} />}

        {loading ? (
          <Loading label="Loading payments..." />
        ) : (
          <>
            <DataTable
              columns={columns}
              rows={payments}
              empty={
                <EmptyState
                  title="No payments yet"
                  message="Once you buy a policy, your premium payments will appear here."
                />
              }
            />
            <Pagination pagination={pagination} onPageChange={setPage} />
          </>
        )}
      </div>

      {paying && (
        <Modal
          title="Make a Payment"
          onClose={() => setPaying(false)}
          footer={
            <>
              <button className="btn btn-outline" onClick={() => setPaying(false)} disabled={saving}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                disabled={saving || !form.policyId || !form.amount}
                onClick={submit}
              >
                {saving ? 'Processing...' : `Pay ${form.amount ? money(form.amount) : ''}`}
              </button>
            </>
          }
        >
          <form onSubmit={submit}>
            {formError && <div className="alert alert-danger mb-3">{formError}</div>}

            <Field label="Policy">
              {policies.length === 0 ? (
                <div className="alert alert-info">
                  You have no policies to pay for. Buy a policy first.
                </div>
              ) : (
                <select
                  className="form-select"
                  value={form.policyId}
                  onChange={(e) => onPolicyChange(e.target.value)}
                >
                  <option value="">Select a policy...</option>
                  {policies.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.policy_number} · {p.plan_name} — {money(p.premium_amount)} premium
                    </option>
                  ))}
                </select>
              )}
            </Field>

            <div className="grid-2">
              <Field label="Amount ($)">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="form-input"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                />
              </Field>
              <Field label="Payment Method">
                <select
                  className="form-select"
                  value={form.paymentMethod}
                  onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
                >
                  {METHODS.map((m) => (
                    <option key={m} value={m}>
                      {m.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <p className="text-secondary" style={{ fontSize: '13px' }}>
              This records the payment against the selected policy and issues a receipt.
            </p>

            <button type="submit" hidden />
          </form>
        </Modal>
      )}
    </div>
  );
};

export default CustomerPayments;


