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
  StatusBadge
} from '../../components/ui';

const LIMIT = 10;

const BLANK = {
  name: '',
  description: '',
  coverageAmount: '',
  premiumAmount: '',
  durationMonths: 12,
  features: '',
  isActive: true
};

/**
 * Admin -> Plans
 * Full CRUD for insurance plans (POST/PUT/DELETE /api/plans).
 * `features` is edited as a newline-separated list and sent as an array.
 */
const AdminPlans = () => {
  const [plans, setPlans] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [activeFilter, setActiveFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState(null); // null = closed, { id? } = open
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page, limit: LIMIT });
      if (activeFilter) params.set('active', activeFilter);

      const res = await api.get(`/plans?${params.toString()}`);
      setPlans(res.data.plans);
      setPagination(res.data.pagination);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [page, activeFilter]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setFormError('');
    setForm({ ...BLANK });
  };

  const openEdit = (plan) => {
    setFormError('');
    setForm({
      id: plan.id,
      name: plan.name,
      description: plan.description || '',
      coverageAmount: plan.coverage_amount,
      premiumAmount: plan.premium_amount,
      durationMonths: plan.duration_months,
      // The API stores features as JSONB; normalise to a textarea string.
      features: Array.isArray(plan.features) ? plan.features.join('\n') : '',
      isActive: plan.is_active
    });
  };

  const save = async (e) => {
    e.preventDefault();
    setFormError('');

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      coverageAmount: Number(form.coverageAmount),
      premiumAmount: Number(form.premiumAmount),
      durationMonths: Number(form.durationMonths),
      features: form.features.split('\n').map((f) => f.trim()).filter(Boolean),
      isActive: form.isActive
    };

    if (!payload.name) return setFormError('Plan name is required.');
    if (!payload.coverageAmount || payload.coverageAmount <= 0) return setFormError('Coverage amount must be greater than 0.');
    if (!payload.premiumAmount || payload.premiumAmount <= 0) return setFormError('Premium amount must be greater than 0.');

    setSaving(true);
    try {
      if (form.id) {
        await api.put(`/plans/${form.id}`, payload);
      } else {
        await api.post('/plans', payload);
      }
      setForm(null);
      await load();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (plan) => {
    try {
      await api.put(`/plans/${plan.id}`, { isActive: !plan.is_active });
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const removePlan = async (plan) => {
    if (!window.confirm(`Delete the "${plan.name}" plan? Existing policies are not affected.`)) return;
    try {
      await api.delete(`/plans/${plan.id}`);
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const columns = [
    { key: 'name', header: 'Plan', render: (r) => <strong>{r.name}</strong> },
    { key: 'coverage_amount', header: 'Coverage', render: (r) => money(r.coverage_amount) },
    { key: 'premium_amount', header: 'Premium', render: (r) => money(r.premium_amount) },
    { key: 'duration_months', header: 'Duration', render: (r) => `${r.duration_months} mo` },
    {
      key: 'features',
      header: 'Features',
      render: (r) => (Array.isArray(r.features) ? `${r.features.length} listed` : '—')
    },
    {
      key: 'is_active',
      header: 'Status',
      render: (r) => <StatusBadge status={r.is_active ? 'active' : 'cancelled'} />
    },
    { key: 'created_at', header: 'Created', render: (r) => date(r.created_at) },
    {
      key: 'actions',
      header: '',
      render: (r) => (
        <div className="d-flex gap-2">
          <button className="btn btn-outline btn-sm" onClick={() => openEdit(r)}>Edit</button>
          <button className="btn btn-outline btn-sm" onClick={() => toggleActive(r)}>
            {r.is_active ? 'Disable' : 'Enable'}
          </button>
          <button className="btn btn-danger btn-sm" onClick={() => removePlan(r)}>Delete</button>
        </div>
      )
    }
  ];

  return (
    <div className="fade-in">
      <PageHeader
        title="Insurance Plans"
        subtitle="Products available for customers to purchase"
        action={
          <button className="btn btn-primary" onClick={openCreate}>
            <Icons.Plus /> New Plan
          </button>
        }
      />

      <div className="card">
        <div className="d-flex justify-between align-center mb-3 gap-2">
          <span className="text-secondary">
            {pagination ? `${pagination.total} plan${pagination.total === 1 ? '' : 's'}` : ''}
          </span>
          <select
            className="form-select"
            style={{ maxWidth: '180px' }}
            value={activeFilter}
            onChange={(e) => { setActiveFilter(e.target.value); setPage(1); }}
          >
            <option value="">All plans</option>
            <option value="true">Active only</option>
            <option value="false">Inactive only</option>
          </select>
        </div>

        {error && <ErrorState message={error} onRetry={load} />}

        {loading ? (
          <Loading label="Loading plans..." />
        ) : (
          <>
            <DataTable
              columns={columns}
              rows={plans}
              empty={
                <EmptyState
                  title="No plans yet"
                  message="Create your first insurance plan to start selling policies."
                  action={
                    <button className="btn btn-primary mt-3" onClick={openCreate}>
                      <Icons.Plus /> New Plan
                    </button>
                  }
                />
              }
            />
            <Pagination pagination={pagination} onPageChange={setPage} />
          </>
        )}
      </div>

      {form && (
        <Modal
          title={form.id ? 'Edit Plan' : 'New Insurance Plan'}
          onClose={() => setForm(null)}
          footer={
            <>
              <button className="btn btn-outline" onClick={() => setForm(null)} disabled={saving}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>
                {saving ? 'Saving...' : form.id ? 'Save Changes' : 'Create Plan'}
              </button>
            </>
          }
        >
          <form onSubmit={save}>
            {formError && (
              <div className="alert alert-danger mb-3">{formError}</div>
            )}

            <Field label="Plan Name">
              <input
                className="form-input"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Comprehensive Health Cover"
              />
            </Field>

            <Field label="Description">
              <textarea
                className="form-textarea"
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="What this plan covers..."
              />
            </Field>

            <div className="grid-2">
              <Field label="Coverage Amount ($)">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="form-input"
                  value={form.coverageAmount}
                  onChange={(e) => setForm({ ...form, coverageAmount: e.target.value })}
                />
              </Field>
              <Field label="Premium Amount ($)">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="form-input"
                  value={form.premiumAmount}
                  onChange={(e) => setForm({ ...form, premiumAmount: e.target.value })}
                />
              </Field>
              <Field label="Duration (months)">
                <input
                  type="number"
                  min="1"
                  className="form-input"
                  value={form.durationMonths}
                  onChange={(e) => setForm({ ...form, durationMonths: e.target.value })}
                />
              </Field>
              <Field label="Status">
                <select
                  className="form-select"
                  value={form.isActive ? 'true' : 'false'}
                  onChange={(e) => setForm({ ...form, isActive: e.target.value === 'true' })}
                >
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </Field>
            </div>

            <Field label="Features" hint="One feature per line.">
              <textarea
                className="form-textarea"
                rows={5}
                value={form.features}
                onChange={(e) => setForm({ ...form, features: e.target.value })}
                placeholder={'24/7 support\nHospital cash cover\nNo waiting period'}
              />
            </Field>

            {/* Lets Enter submit the form without a visible button. */}
            <button type="submit" hidden />
          </form>
        </Modal>
      )}
    </div>
  );
};

export default AdminPlans;


