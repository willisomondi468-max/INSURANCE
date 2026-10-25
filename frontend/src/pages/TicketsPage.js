import React, { useCallback, useEffect, useState } from 'react';
import api, { dateTime, humanize } from '../api.js';
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
  SearchInput,
  StatusBadge
} from '../components/ui';

const LIMIT = 10;
const PRIORITIES = ['low', 'medium', 'high', 'urgent'];
const PROVIDER_STATUSES = ['open', 'in_progress', 'resolved', 'escalated', 'closed'];

/**
 * Support tickets, shared by all three roles.
 *
 * One component covers the whole surface because the differences between roles
 * are narrow and the backend already scopes what each one can see:
 *   - customer : create tickets, reply, close own ticket
 *   - provider : work the queue, reassign, change status, escalate to admin
 *   - admin    : same as provider, plus sees escalated tickets
 *
 * `role` decides which controls render; the API remains the source of truth.
 */
const TicketsPage = ({ role = 'customer' }) => {
  const isStaff = role === 'provider' || role === 'admin';

  const [tickets, setTickets] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);

  const [creating, setCreating] = useState(false);
  const [newTicket, setNewTicket] = useState({ subject: '', description: '', priority: 'medium' });
  const [escalating, setEscalating] = useState(false);
  const [escalationReason, setEscalationReason] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page, limit: LIMIT });
      if (search) params.set('search', search);
      if (status) params.set('status', status);

      const res = await api.get(`/tickets?${params.toString()}`);
      setTickets(res.data.tickets);
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

  const openDetail = async (ticket) => {
    setDetailLoading(true);
    setDetail({ id: ticket.id, subject: ticket.subject });
    setReply('');
    setEscalating(false);
    try {
      const res = await api.get(`/tickets/${ticket.id}`);
      setDetail(res.data);
    } catch (err) {
      setError(err.message);
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const sendReply = async () => {
    if (!reply.trim()) return;
    setBusy(true);
    try {
      await api.post(`/tickets/${detail.id}/respond`, { response: reply.trim() });
      setReply('');
      const res = await api.get(`/tickets/${detail.id}`);
      setDetail(res.data);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const updateTicket = async (changes) => {
    setBusy(true);
    try {
      await api.put(`/tickets/${detail.id}`, changes);
      const res = await api.get(`/tickets/${detail.id}`);
      setDetail(res.data);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const escalate = async () => {
    if (!escalationReason.trim()) return;
    setBusy(true);
    try {
      await api.post(`/tickets/${detail.id}/escalate`, { reason: escalationReason.trim() });
      setEscalating(false);
      setEscalationReason('');
      const res = await api.get(`/tickets/${detail.id}`);
      setDetail(res.data);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const createTicket = async (e) => {
    e.preventDefault();
    if (!newTicket.subject.trim() || !newTicket.description.trim()) return;
    setBusy(true);
    try {
      await api.post('/tickets', {
        subject: newTicket.subject.trim(),
        description: newTicket.description.trim(),
        priority: newTicket.priority
      });
      setCreating(false);
      setNewTicket({ subject: '', description: '', priority: 'medium' });
      setPage(1);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const columns = [
    { key: 'ticket_number', header: 'Ticket', render: (r) => <strong>{r.ticket_number || r.id.slice(0, 8)}</strong> },
    { key: 'subject', header: 'Subject' },
    ...(isStaff
      ? [{ key: 'customer_name', header: 'Customer', render: (r) => r.customer_name || '—' }]
      : []),
    { key: 'priority', header: 'Priority', render: (r) => <StatusBadge status={r.priority} /> },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    { key: 'created_at', header: 'Opened', render: (r) => dateTime(r.created_at) },
    {
      key: 'actions',
      header: '',
      render: (r) => (
        <button className="btn btn-outline btn-sm" onClick={() => openDetail(r)}>
          {isStaff ? 'Handle' : 'View'}
        </button>
      )
    }
  ];

  return (
    <div className="fade-in">
      <PageHeader
        title="Support Tickets"
        subtitle={isStaff ? 'Resolve customer issues and escalations' : 'Your support conversations'}
        action={
          !isStaff && (
            <button className="btn btn-primary" onClick={() => setCreating(true)}>
              <Icons.Plus /> New Ticket
            </button>
          )
        }
      />

      <div className="card">
        <div className="d-flex justify-between align-center mb-3 gap-2" style={{ flexWrap: 'wrap' }}>
          <SearchInput
            value={search}
            onChange={(v) => { setSearch(v); setPage(1); }}
            placeholder="Search tickets..."
          />
          <select
            className="form-select"
            style={{ maxWidth: '180px' }}
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          >
            <option value="">All statuses</option>
            {(isStaff ? PROVIDER_STATUSES : ['open', 'in_progress', 'resolved', 'closed']).map((s) => (
              <option key={s} value={s}>{humanize(s)}</option>
            ))}
          </select>
        </div>

        {error && <ErrorState message={error} onRetry={load} />}

        {loading ? (
          <Loading label="Loading tickets..." />
        ) : (
          <>
            <DataTable
              columns={columns}
              rows={tickets}
              empty={
                <EmptyState
                  title="No tickets found"
                  message={
                    search || status
                      ? 'Try adjusting your filters.'
                      : isStaff
                      ? 'The support queue is empty.'
                      : 'Open a ticket if you need help with a policy, claim or payment.'
                  }
                  action={
                    !isStaff && (
                      <button className="btn btn-primary mt-3" onClick={() => setCreating(true)}>
                        <Icons.Plus /> New Ticket
                      </button>
                    )
                  }
                />
              }
            />
            <Pagination pagination={pagination} onPageChange={setPage} />
          </>
        )}
      </div>

      {/* ---------- Ticket detail / conversation ---------- */}
      {detail && (
        <Modal
          title={detail.subject || 'Ticket'}
          onClose={() => setDetail(null)}
          footer={
            <>
              <button className="btn btn-outline" onClick={() => setDetail(null)}>Close</button>
              {isStaff && detail.status !== 'closed' && (
                <button className="btn btn-primary" disabled={busy} onClick={() => updateTicket({ status: 'resolved' })}>
                  Mark Resolved
                </button>
              )}
              {isStaff && detail.status === 'resolved' && (
                <button className="btn btn-outline" disabled={busy} onClick={() => updateTicket({ status: 'closed' })}>
                  Close Ticket
                </button>
              )}
            </>
          }
        >
          {detailLoading ? (
            <Loading label="Loading ticket..." />
          ) : (
            <>
              <div className="grid-2">
                <Field label="Status"><StatusBadge status={detail.status} /></Field>
                <Field label="Priority"><StatusBadge status={detail.priority} /></Field>
                <Field label="Customer">{detail.customer_name || '—'}</Field>
                <Field label="Assigned To">{detail.assigned_to_name || 'Unassigned'}</Field>
                <Field label="Opened">{dateTime(detail.created_at)}</Field>
                <Field label="Last Update">{dateTime(detail.updated_at)}</Field>
              </div>

              <Field label="Description">
                <p className="text-secondary">{detail.description}</p>
              </Field>

              {isStaff && (
                <div className="grid-2">
                  <Field label="Update Status">
                    <select
                      className="form-select"
                      value={detail.status}
                      disabled={busy}
                      onChange={(e) => updateTicket({ status: e.target.value })}
                    >
                      {PROVIDER_STATUSES.map((s) => (
                        <option key={s} value={s}>{humanize(s)}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Update Priority">
                    <select
                      className="form-select"
                      value={detail.priority}
                      disabled={busy}
                      onChange={(e) => updateTicket({ priority: e.target.value })}
                    >
                      {PRIORITIES.map((p) => (
                        <option key={p} value={p}>{humanize(p)}</option>
                      ))}
                    </select>
                  </Field>
                </div>
              )}

              <hr className="divider" />
              <h3 className="mb-2">
                Conversation ({detail.responses?.length || 0})
              </h3>

              <div className="ticket-thread">
                {detail.responses && detail.responses.length > 0 ? (
                  detail.responses.map((r) => (
                    <div key={r.id} className="ticket-message">
                      <div className="d-flex justify-between align-center mb-1">
                        <strong>{r.responder_name || humanize(r.responder_role || 'user')}</strong>
                        <span className="text-secondary" style={{ fontSize: '12px' }}>
                          {dateTime(r.created_at)}
                        </span>
                      </div>
                      <p className="text-secondary">{r.response}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-secondary">No replies yet.</p>
                )}
              </div>

              {detail.status !== 'closed' && (
                <Field label="Your Reply">
                  <textarea
                    className="form-textarea"
                    rows={3}
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    placeholder="Type your response..."
                  />
                  <button
                    className="btn btn-primary mt-2"
                    disabled={busy || !reply.trim()}
                    onClick={sendReply}
                  >
                    {busy ? 'Sending...' : 'Send Reply'}
                  </button>
                </Field>
              )}

              {isStaff && detail.status !== 'escalated' && detail.status !== 'closed' && (
                <div className="mt-3">
                  {escalating ? (
                    <>
                      <Field label="Reason for Escalation">
                        <textarea
                          className="form-textarea"
                          rows={2}
                          value={escalationReason}
                          onChange={(e) => setEscalationReason(e.target.value)}
                          placeholder="Why does this need admin attention?"
                        />
                      </Field>
                      <div className="d-flex gap-2">
                        <button className="btn btn-danger" disabled={busy || !escalationReason.trim()} onClick={escalate}>
                          Confirm Escalation
                        </button>
                        <button className="btn btn-outline" onClick={() => setEscalating(false)}>Cancel</button>
                      </div>
                    </>
                  ) : (
                    <button className="btn btn-outline" onClick={() => setEscalating(true)}>
                      Escalate to Admin
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </Modal>
      )}

      {/* ---------- New ticket (customer) ---------- */}
      {creating && (
        <Modal
          title="Open a Support Ticket"
          onClose={() => setCreating(false)}
          footer={
            <>
              <button className="btn btn-outline" onClick={() => setCreating(false)} disabled={busy}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                disabled={busy || !newTicket.subject.trim() || !newTicket.description.trim()}
                onClick={createTicket}
              >
                {busy ? 'Submitting...' : 'Submit Ticket'}
              </button>
            </>
          }
        >
          <form onSubmit={createTicket}>
            <Field label="Subject">
              <input
                className="form-input"
                value={newTicket.subject}
                onChange={(e) => setNewTicket({ ...newTicket, subject: e.target.value })}
                placeholder="Brief summary of the issue"
              />
            </Field>
            <Field label="Priority">
              <select
                className="form-select"
                value={newTicket.priority}
                onChange={(e) => setNewTicket({ ...newTicket, priority: e.target.value })}
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>{humanize(p)}</option>
                ))}
              </select>
            </Field>
            <Field label="Description">
              <textarea
                className="form-textarea"
                rows={5}
                value={newTicket.description}
                onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
                placeholder="Describe the issue in detail..."
              />
            </Field>
            <button type="submit" hidden />
          </form>
        </Modal>
      )}
    </div>
  );
};

export default TicketsPage;

