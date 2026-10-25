import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { money } from '../../api';
import {
  EmptyState,
  ErrorState,
  Field,
  Loading,
  Modal,
  PageHeader,
  Icons
} from '../../components/ui';

/**
 * Customer -> Browse Plans & Apply
 * Shows every active plan as a card and lets the customer submit an
 * application via POST /api/policies, then routes them to My Policies.
 */
const CustomerPlans = () => {
  const navigate = useNavigate();

  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [applying, setApplying] = useState(null); // the plan being applied for
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [success, setSuccess] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/plans?active=true&limit=100');
      setPlans(res.data.plans || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const apply = async () => {
    setFormError('');
    setSaving(true);
    try {
      const res = await api.post('/policies', { planId: applying.id });
      setApplying(null);
      setSuccess(
        `Application submitted. Your policy number is ${
          res.data?.policyNumber || res.data?.policy_number || 'pending'
        } — an administrator will review it shortly.`
      );
      // Give the confirmation a moment to be seen, then move to My Policies.
      setTimeout(() => navigate('/customer/policies'), 2500);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fade-in">
      <PageHeader title="Insurance Plans" subtitle="Choose the cover that fits your needs" />

      {success && (
        <div className="alert alert-success mb-3">
          <strong>Success.</strong> {success}
        </div>
      )}

      {error && <ErrorState message={error} onRetry={load} />}

      {loading ? (
        <Loading label="Loading plans..." />
      ) : plans.length === 0 ? (
        <EmptyState
          title="No plans available"
          message="There are currently no insurance plans on offer. Please check back later."
        />
      ) : (
        <div className="plan-grid">
          {plans.map((plan) => (
            <div key={plan.id} className="plan-card">
              <div className="plan-card-header">
                <h3>{plan.name}</h3>
                <div className="plan-premium">
                  <span className="plan-price">{money(plan.premium_amount)}</span>
                  <span className="text-secondary" style={{ fontSize: '13px' }}>
                    / {plan.duration_months} months
                  </span>
                </div>
              </div>

              {plan.description && (
                <p className="text-secondary" style={{ fontSize: '14px' }}>{plan.description}</p>
              )}

              <div className="plan-coverage">
                <span className="text-secondary">Coverage up to</span>
                <strong>{money(plan.coverage_amount)}</strong>
              </div>

              {Array.isArray(plan.features) && plan.features.length > 0 && (
                <ul className="plan-features">
                  {plan.features.map((f, i) => (
                    <li key={i}>
                      <Icons.Check /> {f}
                    </li>
                  ))}
                </ul>
              )}

              <button className="btn btn-primary btn-block mt-3" onClick={() => { setApplying(plan); setFormError(''); }}>
                Apply for this Plan
              </button>
            </div>
          ))}
        </div>
      )}

      {applying && (
        <Modal
          title={`Apply for ${applying.name}`}
          onClose={() => setApplying(null)}
          footer={
            <>
              <button className="btn btn-outline" onClick={() => setApplying(null)} disabled={saving}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={apply} disabled={saving}>
                {saving ? 'Submitting...' : 'Confirm Application'}
              </button>
            </>
          }
        >
          {formError && <div className="alert alert-danger mb-3">{formError}</div>}

          <div className="grid-2">
            <Field label="Plan">{applying.name}</Field>
            <Field label="Premium">{money(applying.premium_amount)}</Field>
            <Field label="Coverage">{money(applying.coverage_amount)}</Field>
            <Field label="Term">{applying.duration_months} months</Field>
          </div>

          <p className="text-secondary">
            Submitting this application creates a policy in <strong>pending</strong> status. You will be
            able to pay the premium and file claims once it has been approved.
          </p>
        </Modal>
      )}
    </div>
  );
};

export default CustomerPlans;


