import React, { useState, useEffect } from 'react';
import api from '../../api';

// WorkforceNotifications - Notifications Page
const WorkforceNotifications = () => {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = async () => {
    try {
      // Use dashboard audit-logs as notification source, or a notifications endpoint
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
      <div className="dashboard-header">
        <h1 className="dashboard-title">Notifications</h1>
        <span className={`badge ${unreadCount > 0 ? 'badge-danger' : 'badge-accent'}`}>
          {unreadCount} Unread
        </span>
      </div>

      {loading ? (
        <div className="loading-spinner"><div className="spinner"></div></div>
      ) : (
        <div className="card">
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '2px solid #eee' }}>
                  <th style={{ padding: '12px' }}>Time</th>
                  <th style={{ padding: '12px' }}>Type</th>
                  <th style={{ padding: '12px' }}>Action</th>
                  <th style={{ padding: '12px' }}>Entity</th>
                  <th style={{ padding: '12px' }}>Details</th>
                  <th style={{ padding: '12px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {notifications.map(n => (
                  <tr key={n.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '12px' }}>{n.created_at ? new Date(n.created_at).toLocaleString() : '—'}</td>
                    <td style={{ padding: '12px' }}>
                      <span className={`badge ${statusVariant(n.action)}`}>{n.action.replace(/_/g, ' ')}</span>
                    </td>
                    <td style={{ padding: '12px' }}>{n.action || '—'}</td>
                    <td style={{ padding: '12px' }}>{n.entityType || '—'}</td>
                    <td style={{ padding: '12px' }}>{n.details ? (typeof n.details === 'string' ? n.details : JSON.stringify(n.details)).slice(0, 80) : '—'}</td>
                    <td style={{ padding: '12px' }}>
                      <span className={`badge ${n.isRead ? 'badge-accent' : 'badge-warning'}`}>
                        {n.isRead ? 'Read' : 'Unread'}
                      </span>
                    </td>
                  </tr>
                ))}
                {notifications.length === 0 && (
                  <tr>
                    <td colSpan="6" style={{ padding: '24px', textAlign: 'center', color: '#666' }}>
                      No notifications available.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
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


