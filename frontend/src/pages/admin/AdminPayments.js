import React, { useCallback, useEffect, useState } from 'react';
import api, { date, dateTime, money } from '../../api';
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
  StatCard,
  StatusBadge,
  Icons
} from '../../components/ui';

const LIMIT = 10;
const STATUSES = ['pending', 'completed', 'failed', 'refunded'];

/**
 * Admin -> Payments
 * Read-only ledger of every payment, with a summary strip and a detail view.
 * Payments are created by customers via POST /api/payments, so there is no
 * create form here.
 */
const AdminPayments = () => {
  const [payments, setPayments] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [totals, setTotals] = useState(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
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

      const res = await api.get(`/payments?${params.toString()}`);
      setPayments(res.data.payments);
      setPagination(res.data.pagination);
      // The controller returns a summary block alongside the rows.
      setTotals(res.data.summary || null);
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

  const openDetail = async (payment) => {
    setDetail({ id: payment.id, loading: true });
    try {
      const res = await api.get(`/payments/${payment.id}`);
      setDetail({ ...res.data, loading: false });
    } catch (err) {
      setError(err.message);
      setDetail(null);
    }
  };

  const columns = [
    { key: 'transaction_id', header: 'Transaction', render: (r) => <strong>{r.transaction_id}</strong> },
    { key: 'customer_name', header: 'Customer', render: (r) => r.customer_name || '—' },
    { key: 'policy_number', header: 'Policy', render: (r) => r.policy_number || '—' },
    { key: 'amount', header: 'Amount', render: (r) => money(r.amount) },
    { key: 'payment_method', header: 'Method', render: (r) => (r.payment_method || '—').toUpperCase() },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    { key: 'payment_date', header: 'Date', render: (r) => date(r.payment_date) },
    {
      key: 'actions',
      header: '',
      render: (r) => (
        <button className="btn btn-outline btn-sm" onClick={() => openDetail(r)}>
          View
        </button>
      )
    }
  ];

  return (
    <div className="fade-in">
      <PageHeader title="Payments" subtitle="All premium and claim payments" />

      {totals && (
        <div className="stats-grid mb-3">
          <StatCard icon={Icons.CreditCard} value={money(totals.totalAmount)} label="Total Collected" />
          <StatCard icon={Icons.Check} tone="accent" value={totals.completed || 0} label="Completed" />
          <StatCard icon={Icons.BarChart} tone="warning" value={totals.pending || 0} label="Pending" />
          <StatCard icon={Icons.X} tone="danger" value={totals.failed || 0} label="Failed" />
        </div>
      )}

      <div className="card">
        <div className="d-flex justify-between align-center mb-3 gap-2" style={{ flexWrap: 'wrap' }}>
          <SearchInput
            value={search}
            onChange={(v) => { setSearch(v); setPage(1); }}
            placeholder="Search by transaction or customer..."
          />
          <select
            className="form-select"
            style={{ maxWidth: '180px' }}
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          >
            <option value="">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
        </div>

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
                  title="No payments found"
                  message={search || status ? 'Try adjusting your filters.' : 'No payments have been made yet.'}
                />
              }
            />
            <Pagination pagination={pagination} onPageChange={setPage} />
          </>
        )}
      </div>

      {detail && (
        <Modal
          title="Payment Details"
          onClose={() => setDetail(null)}
          footer={<button className="btn btn-outline" onClick={() => setDetail(null)}>Close</button>}
        >
          {detail.loading ? (
            <Loading label="Loading payment..." />
          ) : (
            <div className="grid-2">
              <Field label="Transaction ID">{detail.transaction_id}</Field>
              <Field label="Status"><StatusBadge status={detail.status} /></Field>
              <Field label="Customer">{detail.customer_name || '—'}</Field>
              <Field label="Policy">{detail.policy_number || '—'}</Field>
              <Field label="Plan">{detail.plan_name || '—'}</Field>
              <Field label="Amount">{money(detail.amount)}</Field>
              <Field label="Method">{(detail.payment_method || '—').toUpperCase()}</Field>
              <Field label="Paid At">{dateTime(detail.payment_date)}</Field>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
};

export default AdminPayments;


