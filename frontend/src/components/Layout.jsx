import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import Icons from './Icons';

const Sidebar = ({ role, onLogout }) => {
  const navigate = useNavigate();
  const [activeNav, setActiveNav] = useState('');

  const navItems = {
    system_admin: [
      { icon: Icons.Home, label: 'System Dashboard', path: '/system/dashboard', section: 'System' },
      { icon: Icons.Building, label: 'Companies', path: '/system/companies', section: 'System' },
      { icon: Icons.Shield, label: 'Plans', path: '/admin/plans', section: 'Admin' },
      { icon: Icons.Users, label: 'Customers', path: '/admin/customers', section: 'Admin' },
      { icon: Icons.FileText, label: 'Policies', path: '/admin/policies', section: 'Admin' },
      { icon: Icons.BarChart, label: 'Claims', path: '/admin/claims', section: 'Admin' },
      { icon: Icons.CreditCard, label: 'Payments', path: '/admin/payments', section: 'Admin' },
      { icon: Icons.Users, label: 'Employees', path: '/workforce/employees', section: 'Workforce' },
      { icon: Icons.Clock, label: 'Attendance', path: '/workforce/attendance', section: 'Workforce' },
      { icon: Icons.Task, label: 'Task Management', path: '/workforce/tasks', section: 'Workforce' },
      { icon: Icons.Chart, label: 'Staff Performance', path: '/workforce/performance', section: 'Workforce' },
      { icon: Icons.Calendar, label: 'Monthly Comparisons', path: '/workforce/monthly', section: 'Workforce' },
      { icon: Icons.FileText, label: 'Reports', path: '/workforce/reports', section: 'Workforce' },
      { icon: Icons.Bell, label: 'Notifications', path: '/workforce/notifications', section: 'Workforce' },
      { icon: Icons.Calendar, label: 'Leave Requests', path: '/workforce/leave-requests', section: 'Workforce' }
    ],
    company_admin: [
      { icon: Icons.Home, label: 'Company Dashboard', path: '/admin', section: 'Company' },
      { icon: Icons.Users, label: 'Customers', path: '/admin/customers', section: 'Company' },
      { icon: Icons.FileText, label: 'Policies', path: '/admin/policies', section: 'Company' },
      { icon: Icons.BarChart, label: 'Claims', path: '/admin/claims', section: 'Company' },
      { icon: Icons.CreditCard, label: 'Payments', path: '/admin/payments', section: 'Company' },
      { icon: Icons.Shield, label: 'Plans', path: '/admin/plans', section: 'Company' },
      { icon: Icons.Settings, label: 'Settings', path: '/admin/settings', section: 'Company' },
      { icon: Icons.Users, label: 'Employees', path: '/workforce/employees', section: 'Workforce' },
      { icon: Icons.Clock, label: 'Attendance', path: '/workforce/attendance', section: 'Workforce' },
      { icon: Icons.Task, label: 'Task Management', path: '/workforce/tasks', section: 'Workforce' },
      { icon: Icons.Chart, label: 'Staff Performance', path: '/workforce/performance', section: 'Workforce' },
      { icon: Icons.Calendar, label: 'Monthly Comparisons', path: '/workforce/monthly', section: 'Workforce' },
      { icon: Icons.FileText, label: 'Reports', path: '/workforce/reports', section: 'Workforce' },
      { icon: Icons.Bell, label: 'Notifications', path: '/workforce/notifications', section: 'Workforce' },
      { icon: Icons.Calendar, label: 'Leave Requests', path: '/workforce/leave-requests', section: 'Workforce' }
    ],
    employee: [
      { icon: Icons.Home, label: 'My Dashboard', path: '/workforce/attendance', section: 'My Work' },
      { icon: Icons.Clock, label: 'Attendance', path: '/workforce/attendance', section: 'My Work' },
      { icon: Icons.Task, label: 'My Tasks', path: '/workforce/tasks', section: 'My Work' },
      { icon: Icons.Chart, label: 'My Performance', path: '/workforce/performance', section: 'My Work' },
      { icon: Icons.Bell, label: 'Notifications', path: '/workforce/notifications', section: 'My Work' },
      { icon: Icons.Calendar, label: 'Leave Requests', path: '/workforce/leave-requests', section: 'My Work' }
    ],
    customer: [
      { icon: Icons.Home, label: 'Dashboard', path: '/customer', section: 'Customer' },
      { icon: Icons.Shield, label: 'Plans', path: '/customer/plans', section: 'Customer' },
      { icon: Icons.FileText, label: 'My Policies', path: '/customer/policies', section: 'Customer' },
      { icon: Icons.BarChart, label: 'Claims', path: '/customer/claims', section: 'Customer' },
      { icon: Icons.CreditCard, label: 'Payments', path: '/customer/payments', section: 'Customer' },
      { icon: Icons.MessageSquare, label: 'Support', path: '/customer/tickets', section: 'Customer' }
    ],
    provider: [
      { icon: Icons.Home, label: 'Dashboard', path: '/provider', section: 'Support' },
      { icon: Icons.MessageSquare, label: 'Tickets', path: '/provider/tickets', section: 'Support' },
      { icon: Icons.BarChart, label: 'Claims', path: '/provider/claims', section: 'Support' },
      { icon: Icons.Users, label: 'Customers', path: '/provider/customers', section: 'Support' }
    ]
  };

  const sectionTitles = {
    system_admin: 'System Administration',
    company_admin: 'Company Administration',
    employee: 'Employee Portal',
    customer: 'Customer Portal',
    provider: 'Service Provider'
  };

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <Icons.Shield /> InsuraVault
        </div>
      </div>
      <nav className="sidebar-nav">
        {Object.entries(navItems).find(([key]) => key === role)?.[1]?.map((item, index) => {
          if (item.section && index > 0 && navItems[role][index - 1]?.section !== item.section) {
            return (
              <div key={`section-${index}`} className="nav-section">
                <div className="nav-section-title">{item.section}</div>
              </div>
            );
          }
          return (
            <div
              key={index}
              className={`nav-item ${activeNav === item.path ? 'active' : ''}`}
              onClick={() => { setActiveNav(item.path); navigate(item.path); }}
            >
              <item.icon /> {item.label}
            </div>
          );
        })}
        {(navItems[role] || []).length > 0 && (
          <div className="nav-section">
            <div className="nav-section-title">{sectionTitles[role] || 'Menu'}</div>
          </div>
        )}
      </nav>
      <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        <div className="nav-item" onClick={onLogout}>
          <Icons.LogOut /> Logout
        </div>
      </div>
    </div>
  );
};

const Layout = ({ children, role }) => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="app-container">
      <Sidebar role={role} onLogout={handleLogout} />
      <main className="main-content">
        <div className="dashboard-header">
          <div></div>
          <div className="user-menu">
            <span>{user?.fullName || user?.email}</span>
            <div className="user-avatar">
              {user?.email?.charAt(0).toUpperCase()}
            </div>
          </div>
        </div>
        {children}
      </main>
    </div>
  );
};

export default Layout;