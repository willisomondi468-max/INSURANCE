import React, { useCallback, useEffect, useState } from 'react';
import api, { date } from '../../api';
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
 * Provider -> Customers
 * Read-only directory of policy holders so a provider can look up who holds
 * which cover while handling tickets and claims.
 *
 * Note: GET /api/customers is admin-only on the backend, so a pure provider
 * account will receive a 403 here. That is surfaced as an explanatory message
 * rather than an empty table that looks like missing data.
 */
const ProviderCustomers = () => {
  const [customers, setCustomers] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [forbidden, setForbidden] = useState(false);
  const [detail, setDetail] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    setForbidden(false);
    try {
      const params = new URLSearchParams({ page, limit: LIMIT });
      if (search) params.set('search', search);

      const res = await api.get(`/customers?${params.toString()}`);
      setCustomers(res.data.customers);
      setPagination(res.data.pagination);
    } catch (err) {
      if (err.status === 403) {
        setForbidden(true);
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    const timer = setTimeout(load, search ? 400 : 0);
    return () => clearTimeout(timer);
  }, [load, search]);

  const openDetail = async (customer) => {
    setDetail({ id: customer.id, loading: true });
    try {
      const res = await api.get(`/customers/${customer.id}`);
      setDetail({ ...res.data, loading: false });
    } catch (err) {
      setError(err.message);
      setDetail(null);
    }
  };

  const columns = [
    { key: 'fullName', header: 'Name', render: (r) => <strong>{r.fullName}</strong> },
    { key: 'email', header: 'Email' },
    { key: 'phone', header: 'Phone', render: (r) => r.phone || '—' },
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
        <button className="btn btn-outline btn-sm" onClick={() => openDetail(r)}>View</button>
      )
    }
  ];

  if (forbidden) {
    return (
      <div className="fade-in">
        <PageHeader title="Customers" subtitle="Policy holder directory" />
        <EmptyState
          title="Not available for your role"
          message="Customer records are visible to administrators only. You can still see customer details on the tickets and claims assigned to you."
        />
      </div>
    );
  }

  return (
    <div className="fade-in">
      <PageHeader title="Customers" subtitle="Policy holder directory" />

      <div className="card">
        <div className="mb-3">
          <SearchInput
            value={search}
            onChange={(v) => { setSearch(v); setPage(1); }}
            placeholder="Search by name, ID or email..."
          />
        </div>

        {error && <ErrorState message={error} onRetry={load} />}

        {loading ? (
          <Loading label="Loading customers..." />
        ) : (
          <>
            <DataTable
              columns={columns}
              rows={customers}
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
          footer={<button className="btn btn-outline" onClick={() => setDetail(null)}>Close</button>}
        >
          {detail.loading ? (
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
            </>
          )}
        </Modal>
      )}
    </div>
  );
};

export default ProviderCustomers;


