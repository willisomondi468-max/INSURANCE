import React, { useCallback, useEffect, useState } from 'react';
import api, { date, humanize } from '../../api';
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
 * Admin -> Customers
 * Paginated + searchable customer list, with a detail drawer and
 * activate/deactivate control (PUT /api/customers/:id/status).
 */
const AdminCustomers = () => {
  const [customers, setCustomers] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page, limit: LIMIT });
      if (search) params.set('search', search);
      if (status) params.set('status', status);

      const res = await api.get(`/customers?${params.toString()}`);
      setCustomers(res.data.customers);
      setPagination(res.data.pagination);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [page, search, status]);

  // Debounce the search term so we do not fire a request per keystroke.
  useEffect(() => {
    const timer = setTimeout(load, search ? 400 : 0);
    return () => clearTimeout(timer);
  }, [load, search]);

  const openDetail = async (customer) => {
    setDetailLoading(true);
    setDetail({ id: customer.id, fullName: customer.fullName });
    try {
      const res = await api.get(`/customers/${customer.id}`);
      setDetail(res.data);
    } catch (err) {
      setError(err.message);
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const toggleStatus = async (customer) => {
    setBusyId(customer.id);
    try {
      await api.put(`/customers/${customer.id}/status`, { isActive: !customer.isActive });
      await load();
      if (detail && detail.id === customer.id) {
        setDetail((d) => ({ ...d, isActive: !customer.isActive }));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const columns = [
    { key: 'fullName', header: 'Name', render: (r) => <strong>{r.fullName}</strong> },
    { key: 'email', header: 'Email' },
    { key: 'phone', header: 'Phone', render: (r) => r.phone || '—' },
    { key: 'idNumber', header: 'ID Number' },
    { key: 'policyCount', header: 'Policies' },
    { key: 'claimCount', header: 'Claims' },
    {
      key: 'isActive',
      header: 'Status',
      render: (r) => <StatusBadge status={r.isActive ? 'active' : 'cancelled'} />
    },
    {
      key: 'actions',
      header: '',
      render: (r) => (
        <div className="d-flex gap-2" onClick={(e) => e.stopPropagation()}>
          <button className="btn btn-outline btn-sm" onClick={() => openDetail(r)}>
            View
          </button>
          <button
            className={`btn btn-sm ${r.isActive ? 'btn-danger' : 'btn-primary'}`}
            disabled={busyId === r.id}
            onClick={() => toggleStatus(r)}
          >
            {r.isActive ? 'Deactivate' : 'Activate'}
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="fade-in">
      <PageHeader title="Customers" subtitle="All registered policy holders" />

      <div className="card">
        <div className="d-flex justify-between align-center mb-3 gap-2" style={{ flexWrap: 'wrap' }}>
          <SearchInput
            value={search}
            onChange={(v) => { setSearch(v); setPage(1); }}
            placeholder="Search by name, ID or email..."
          />
          <select
            className="form-select"
            style={{ maxWidth: '180px' }}
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        {error && <ErrorState message={error} onRetry={load} />}

        {loading ? (
          <Loading label="Loading customers..." />
        ) : (
          <>
            <DataTable
              columns={columns}
              rows={customers}
              primaryKey="id"
              empty={
                <EmptyState
                  title="No customers found"
                  message={search ? 'Try a different search term.' : 'No customers have registered yet.'}
                />
              }
            />
            <Pagination pagination={pagination} onPageChange={setPage} />
          </>
        )}
      </div>

      {detail && (
        <Modal
          title="Customer Details"
          onClose={() => setDetail(null)}
          footer={
            <>
              <button className="btn btn-outline" onClick={() => setDetail(null)}>Close</button>
              <button
                className={`btn ${detail.isActive ? 'btn-danger' : 'btn-primary'}`}
                onClick={() => toggleStatus(detail)}
                disabled={busyId === detail.id}
              >
                {detail.isActive ? 'Deactivate Account' : 'Activate Account'}
              </button>
            </>
          }
        >
          {detailLoading ? (
            <Loading label="Loading profile..." />
          ) : (
            <>
              <div className="grid-2">
                <Field label="Full Name">{detail.fullName}</Field>
                <Field label="Email">{detail.email}</Field>
                <Field label="Phone">{detail.phone || '—'}</Field>
                <Field label="ID Number">{detail.idNumber}</Field>
                <Field label="Date of Birth">{date(detail.dateOfBirth)}</Field>
                <Field label="Member Since">{date(detail.createdAt)}</Field>
              </div>
              <Field label="Address">{detail.address || '—'}</Field>

              <h3 className="mt-3 mb-2">Policies ({detail.policies?.length || 0})</h3>
              <DataTable
                columns={[
                  { key: 'policy_number', header: 'Policy #' },
                  { key: 'plan_name', header: 'Plan', render: (r) => r.plan_name || '—' },
                  { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
                  { key: 'end_date', header: 'Expires', render: (r) => date(r.end_date) }
                ]}
                rows={detail.policies}
                empty={<p className="text-secondary">No policies.</p>}
              />

              <h3 className="mt-3 mb-2">Claims ({detail.claims?.length || 0})</h3>
              <DataTable
                columns={[
                  { key: 'claim_number', header: 'Claim #' },
                  { key: 'claim_type', header: 'Type', render: (r) => humanize(r.claim_type) },
                  { key: 'amount_claimed', header: 'Amount', render: (r) => `$${r.amount_claimed}` },
                  { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> }
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

export default AdminCustomers;


