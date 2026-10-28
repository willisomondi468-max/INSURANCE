import React, { useState, useEffect } from 'react';
import api from '../../api.js';
import CinematicDashboardHero from '../../components/CinematicDashboardHero.jsx';

const statusVariant = (action) => {
  switch (action) {
    case 'clock_in': return 'badge-accent';
    case 'clock_out': return 'badge-primary';
    case 'create': return 'badge-warning';
    case 'update': return 'badge-warning';
    case 'delete': return 'badge-danger';
    case 'deactivate': return 'badge-danger';
    default: return 'badge-primary';
  }
};

/**
 * WorkforceNotifications - Notifications Page
 * Audit-log based notification center
 */
const WorkforceNotifications = () => {
  const [token] = useState(localStorage.getItem('token'));
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = async () => {
    try {
      // Use dashboard audit-logs as notification source, or notifications endpoint
      const res = await api.get('/dashboard/audit-logs', token);
      if (res.success) {
        const notifs = res.data.auditLogs || res.data || [];
        setNotifications(notifs);
        setUnreadCount(notifs.filter(n => !n.isRead).length);
      }
    } catch (err) {
      // Fallback: try notifications endpoint
      try {
        const res = await api.get('/notifications', token);
        if (res.success) {
          setNotifications(res.data.notifications || []);
          setUnreadCount(0);
        }
      } catch (e) {
        console.error('Fetch notifications error:', err);
      }
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id) => {
    try {
      await api.patch(`/audit-logs/${id}/read`, {}, token);
      setNotifications(notifications.map(n => n.id === id ? { ...n, isRead: true } : n));
      setUnreadCount(Math.max(0, unreadCount - 1));
    } catch (err) {
      console.error('Mark as read error:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [token]);

  return (
    <div className="fade-in">
      <CinematicDashboardHero
        title="Notifications"
        subtitle="System notifications and audit log entries"
        role="company_admin"
      />

      <div style={{ padding: '0 24px 48px 24px', maxWidth: '1400px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <span className={`badge ${unreadCount > 0 ? 'badge-danger' : 'badge-success'}`}>
            {unreadCount} Unread
          </span>
        </div>

        <div className="card">
          <div style={{ padding: '0 24px', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '2px solid #eee' }}>
                  <th style={{ padding: '16px' }}>Time</th>
                  <th style={{ padding: '16px' }}>Type</th>
                  <th style={{ padding: '16px' }}>Action</th>
                  <th style={{ padding: '16px' }}>Entity</th>
                  <th style={{ padding: '16px' }}>Details</th>
                  <th style={{ padding: '16px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {notifications.map(n => (
                  <tr key={n.id} style={{ borderBottom: '1px solid rgba(6,27,51,0.06)' }}>
                    <td style={{ padding: '16px' }}>{n.created_at ? new Date(n.created_at).toLocaleString() : '—'}</td>
                    <td style={{ padding: '16px' }}>
                      <span className={`badge ${statusVariant(n.action)}`}>{n.action.replace(/_/g, ' ')}</span>
                    </td>
                    <td style={{ padding: '16px' }}>{n.action || '—'}</td>
                    <td style={{ padding: '16px' }}>{n.entityType || '—'}</td>
                    <td style={{ padding: '16px' }}>{n.details ? (typeof n.details === 'string' ? n.details : JSON.stringify(n.details)).slice(0, 80) : '—'}</td>
                    <td style={{ padding: '16px' }}>
                      <span className={`badge ${n.isRead ? 'badge-success' : 'badge-warning'}`}>
                        {n.isRead ? 'Read' : 'Unread'}
                      </span>
                    </td>
                  </tr>
                ))}
                {notifications.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                      No notifications available.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

const statusVariant = (action) => {
  switch (action) {
    case 'clock_in': return 'badge-accent';
    case 'clock_out': return 'badge-primary';
    case 'create': return 'badge-warning';
    case 'update': return 'badge-warning';
    case 'delete': return 'badge-danger';
    case 'deactivate': return 'badge-danger';
    default: return 'badge-primary';
  }
};

export default WorkforceNotifications;
