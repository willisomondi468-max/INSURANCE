import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import api from './api';

// Auth Context
import AuthProvider, { useAuth } from './components/AuthContext';

// Layout

// Workforce Pages
const WorkforceEmployees = React.lazy(() => import('./pages/workforce/WorkforceEmployees'));
const WorkforceAttendance = React.lazy(() => import('./pages/workforce/WorkforceAttendance'));
const WorkforceTasks = React.lazy(() => import('./pages/workforce/WorkforceTasks'));
const WorkforcePerformance = React.lazy(() => import('./pages/workforce/WorkforcePerformance'));
const WorkforceMonthly = React.lazy(() => import('./pages/workforce/WorkforceMonthly'));
const WorkforceReports = React.lazy(() => import('./pages/workforce/WorkforceReports'));
const WorkforceNotifications = React.lazy(() => import('./pages/workforce/WorkforceNotifications'));
const WorkforceLeaveRequests = React.lazy(() => import('./pages/workforce/WorkforceLeaveRequests'));

// Public Pages
const HomePage = React.lazy(() => import('./pages/HomePage'));
const InsuranceCategoryPage = React.lazy(() => import('./pages/InsuranceCategoryPage'));

// Existing Admin Pages
const AdminDashboard = React.lazy(() => import('./pages/admin/AdminDashboard'));
const CustomersPage = React.lazy(() => import('./pages/admin/AdminCustomers'));
const PoliciesPage = React.lazy(() => import('./pages/admin/AdminPolicies'));
const ClaimsPage = React.lazy(() => import('./pages/admin/AdminClaims'));
const PaymentsPage = React.lazy(() => import('./pages/admin/AdminPayments'));
const AdminSettingsPage = React.lazy(() => import('./pages/admin/AdminSettings'));

// Customer Pages
const CustomerDashboardPage = React.lazy(() => import('./pages/customer/CustomerDashboard'));
const CustomerClaimsPage = React.lazy(() => import('./pages/customer/CustomerClaims'));
const CustomerPaymentsPage = React.lazy(() => import('./pages/customer/CustomerPayments'));
const CustomerPlansPage = React.lazy(() => import('./pages/customer/CustomerPlans'));
const CustomerPoliciesPage = React.lazy(() => import('./pages/customer/CustomerPolicies'));

// Provider Pages
const ProviderDashboardPage = React.lazy(() => import('./pages/provider/ProviderDashboard'));
const ProviderTicketsPage = React.lazy(() => import('./pages/TicketsPage'));
const ProviderClaimsPage = React.lazy(() => import('./pages/provider/ProviderClaims'));
const ProviderCustomersPage = React.lazy(() => import('./pages/provider/ProviderCustomers'));

// System Admin Pages
const SystemDashboardPage = React.lazy(() => import('./pages/system/SystemDashboardPage'));
const SystemCompaniesPage = React.lazy(() => import('./pages/system/SystemCompaniesPage'));

// Staff Portal Pages
const StaffCustomerList = React.lazy(() => import('./pages/staff/StaffCustomerList'));
const StaffCustomerDocuments = React.lazy(() => import('./pages/staff/StaffCustomerDocuments'));
const StaffCustomerClaims = React.lazy(() => import('./pages/staff/StaffCustomerClaims'));

// Manager Portal Pages
const ManagerDashboardPage = React.lazy(() => import('./pages/manager/ManagerDashboard'));
const ManagerTeamAttendancePage = React.lazy(() => import('./pages/manager/ManagerTeamAttendance'));
const ManagerTeamTasksPage = React.lazy(() => import('./pages/manager/ManagerTeamTasks'));
const ManagerApprovalsPage = React.lazy(() => import('./pages/manager/ManagerApprovals'));

// Admin Portal Pages
const AdminPortalDashboardPage = React.lazy(() => import('./pages/admin/AdminPortalDashboard'));
const AdminUserManagementPage = React.lazy(() => import('./pages/admin/AdminUserManagement'));
const AdminDepartmentsPage = React.lazy(() => import('./pages/admin/AdminDepartments'));
const AdminAuditLogsPage = React.lazy(() => import('./pages/admin/AdminAuditLogs'));

// Pages (extracted from App.js)
const LoginPage = React.lazy(() => import('./pages/Login'));
const RegisterPage = React.lazy(() => import('./pages/Register'));
const PlansPage = React.lazy(() => import('./pages/admin/AdminPlans'));

// Protected Route Component
const ProtectedRoute = ({ children, roles }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="loading-spinner">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/" />;
  }

  return children;
};

// Main Layout Component
const Layout = ({ children, role }) => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await api.get('/notifications/unread-count');
      if (res.success) {
        setUnreadCount(res.data.unreadCount);
      }
    } catch (err) {
      // Silently fail - notifications are optional
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchUnreadCount();
      const interval = setInterval(fetchUnreadCount, 30000);
      return () => clearInterval(interval);
    }
  }, [user, fetchUnreadCount]);

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
            {unreadCount > 0 && (
              <span className="notification-badge">{unreadCount}</span>
            )}
            <button
              className="notification-bell"
              onClick={() => navigate('/workforce/notifications')}
              title="Notifications"
            >
              <BellIcon />
            </button>
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

// Sidebar Component - Self-contained with inline icons
const ShieldIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
const HomeIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;
const BuildingIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1L3 5v6c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V5l-9-4z"/><path d="M7 17v4h2v-4zm6 4h2v-4h-2zm-6 0v-4h2v4zm10 0h2v-4h-2z"/></svg>;
const ShieldIcon2 = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
const UsersIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
const FileTextIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>;
const CreditCardIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>;
const MessageSquareIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>;
const BarChartIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></svg>;
const SettingsIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 2.83 0l-.06.06a1.65 1.65 0 0 0 .33-1.82V9a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0 2.83l.06.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0-1.51 1z"/></svg>;
const LogOutIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>;
const ClockIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
const TaskIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>;
const ChartIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="9"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="15"/></svg>;
const CalendarIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
const ChevronRightIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>;
const SearchIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;
const BellIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>;

const iconMap = {
  Shield: ShieldIcon,
  Home: HomeIcon,
  Building: BuildingIcon,
  Shield: ShieldIcon,
  Users: UsersIcon,
  FileText: FileTextIcon,
  CreditCard: CreditCardIcon,
  MessageSquare: MessageSquareIcon,
  BarChart: BarChartIcon,
  Settings: SettingsIcon,
  LogOut: LogOutIcon,
  Clock: ClockIcon,
  Task: TaskIcon,
  Chart: ChartIcon,
  Calendar: CalendarIcon,
  ChevronRight: ChevronRightIcon,
  Search: SearchIcon,
  Bell: BellIcon,
};

const Sidebar = ({ role, onLogout }) => {
  const navigate = useNavigate();
  const [activeNav, setActiveNav] = useState('');

  const navItems = {
    system_admin: [
      { icon: HomeIcon, label: 'System Dashboard', path: '/system/dashboard', section: 'System' },
      { icon: BuildingIcon, label: 'Companies', path: '/system/companies', section: 'System' },
      { icon: ShieldIcon, label: 'Admin Portal', path: '/admin/portal', section: 'Admin' },
      { icon: UsersIcon, label: 'User Management', path: '/admin/users', section: 'Admin' },
      { icon: BuildingIcon, label: 'Departments', path: '/admin/departments', section: 'Admin' },
      { icon: FileTextIcon, label: 'Audit Logs', path: '/admin/audit-logs', section: 'Admin' },
      { icon: ShieldIcon, label: 'Plans', path: '/admin/plans', section: 'Admin' },
      { icon: UsersIcon, label: 'Customers', path: '/admin/customers', section: 'Admin' },
      { icon: UsersIcon, label: 'Staff Customers', path: '/staff/customers', section: 'Staff' },
      { icon: FileTextIcon, label: 'Policies', path: '/admin/policies', section: 'Admin' },
      { icon: BarChartIcon, label: 'Claims', path: '/admin/claims', section: 'Admin' },
      { icon: CreditCardIcon, label: 'Payments', path: '/admin/payments', section: 'Admin' },
      { icon: UsersIcon, label: 'Employees', path: '/workforce/employees', section: 'Workforce' },
      { icon: ClockIcon, label: 'Attendance', path: '/workforce/attendance', section: 'Workforce' },
      { icon: TaskIcon, label: 'Task Management', path: '/workforce/tasks', section: 'Workforce' },
      { icon: ChartIcon, label: 'Staff Performance', path: '/workforce/performance', section: 'Workforce' },
      { icon: CalendarIcon, label: 'Monthly Comparisons', path: '/workforce/monthly', section: 'Workforce' },
      { icon: FileTextIcon, label: 'Reports', path: '/workforce/reports', section: 'Workforce' },
      { icon: BellIcon, label: 'Notifications', path: '/workforce/notifications', section: 'Workforce' },
      { icon: CalendarIcon, label: 'Leave Requests', path: '/workforce/leave-requests', section: 'Workforce' },
      { icon: ClockIcon, label: 'Team Attendance', path: '/manager/attendance', section: 'Management' },
      { icon: TaskIcon, label: 'Team Tasks', path: '/manager/tasks', section: 'Management' },
      { icon: ShieldIcon, label: 'Approvals', path: '/manager/approvals', section: 'Management' }
    ],
    company_admin: [
      { icon: HomeIcon, label: 'Company Dashboard', path: '/admin', section: 'Company' },
      { icon: ShieldIcon, label: 'Admin Portal', path: '/admin/portal', section: 'Admin' },
      { icon: UsersIcon, label: 'User Management', path: '/admin/users', section: 'Admin' },
      { icon: BuildingIcon, label: 'Departments', path: '/admin/departments', section: 'Admin' },
      { icon: FileTextIcon, label: 'Audit Logs', path: '/admin/audit-logs', section: 'Admin' },
      { icon: UsersIcon, label: 'Customers', path: '/admin/customers', section: 'Company' },
      { icon: UsersIcon, label: 'Staff Customers', path: '/staff/customers', section: 'Staff' },
      { icon: FileTextIcon, label: 'Policies', path: '/admin/policies', section: 'Company' },
      { icon: BarChartIcon, label: 'Claims', path: '/admin/claims', section: 'Company' },
      { icon: CreditCardIcon, label: 'Payments', path: '/admin/payments', section: 'Company' },
      { icon: ShieldIcon, label: 'Plans', path: '/admin/plans', section: 'Company' },
      { icon: SettingsIcon, label: 'Settings', path: '/admin/settings', section: 'Company' },
      { icon: UsersIcon, label: 'Employees', path: '/workforce/employees', section: 'Workforce' },
      { icon: ClockIcon, label: 'Attendance', path: '/workforce/attendance', section: 'Workforce' },
      { icon: TaskIcon, label: 'Task Management', path: '/workforce/tasks', section: 'Workforce' },
      { icon: ChartIcon, label: 'Staff Performance', path: '/workforce/performance', section: 'Workforce' },
      { icon: CalendarIcon, label: 'Monthly Comparisons', path: '/workforce/monthly', section: 'Workforce' },
      { icon: FileTextIcon, label: 'Reports', path: '/workforce/reports', section: 'Workforce' },
      { icon: BellIcon, label: 'Notifications', path: '/workforce/notifications', section: 'Workforce' },
      { icon: CalendarIcon, label: 'Leave Requests', path: '/workforce/leave-requests', section: 'Workforce' },
      { icon: ClockIcon, label: 'Team Attendance', path: '/manager/attendance', section: 'Management' },
      { icon: TaskIcon, label: 'Team Tasks', path: '/manager/tasks', section: 'Management' },
      { icon: ShieldIcon, label: 'Approvals', path: '/manager/approvals', section: 'Management' }
    ],
    department_manager: [
      { icon: HomeIcon, label: 'Manager Dashboard', path: '/manager/dashboard', section: 'Management' },
      { icon: ClockIcon, label: 'Team Attendance', path: '/manager/attendance', section: 'Management' },
      { icon: TaskIcon, label: 'Team Tasks', path: '/manager/tasks', section: 'Management' },
      { icon: ShieldIcon, label: 'Approvals', path: '/manager/approvals', section: 'Management' }
    ],
    hr_manager: [
      { icon: HomeIcon, label: 'Manager Dashboard', path: '/manager/dashboard', section: 'Management' },
      { icon: ClockIcon, label: 'Team Attendance', path: '/manager/attendance', section: 'Management' },
      { icon: TaskIcon, label: 'Team Tasks', path: '/manager/tasks', section: 'Management' },
      { icon: ShieldIcon, label: 'Approvals', path: '/manager/approvals', section: 'Management' },
      { icon: UsersIcon, label: 'Employees', path: '/workforce/employees', section: 'Workforce' },
      { icon: CalendarIcon, label: 'Leave Requests', path: '/workforce/leave-requests', section: 'Workforce' }
    ],
    employee: [
      { icon: HomeIcon, label: 'My Dashboard', path: '/workforce/attendance', section: 'My Work' },
      { icon: ClockIcon, label: 'Attendance', path: '/workforce/attendance', section: 'My Work' },
      { icon: TaskIcon, label: 'My Tasks', path: '/workforce/tasks', section: 'My Work' },
      { icon: ChartIcon, label: 'My Performance', path: '/workforce/performance', section: 'My Work' },
      { icon: BellIcon, label: 'Notifications', path: '/workforce/notifications', section: 'My Work' },
      { icon: CalendarIcon, label: 'Leave Requests', path: '/workforce/leave-requests', section: 'My Work' }
    ],
    customer: [
      { icon: HomeIcon, label: 'Dashboard', path: '/customer', section: 'Customer' },
      { icon: ShieldIcon, label: 'Plans', path: '/customer/plans', section: 'Customer' },
      { icon: FileTextIcon, label: 'My Policies', path: '/customer/policies', section: 'Customer' },
      { icon: BarChartIcon, label: 'Claims', path: '/customer/claims', section: 'Customer' },
      { icon: CreditCardIcon, label: 'Payments', path: '/customer/payments', section: 'Customer' },
      { icon: MessageSquareIcon, label: 'Support', path: '/customer/tickets', section: 'Customer' }
    ],
    provider: [
      { icon: HomeIcon, label: 'Dashboard', path: '/provider', section: 'Support' },
      { icon: MessageSquareIcon, label: 'Tickets', path: '/provider/tickets', section: 'Support' },
      { icon: BarChartIcon, label: 'Claims', path: '/provider/claims', section: 'Support' },
      { icon: UsersIcon, label: 'Customers', path: '/provider/customers', section: 'Support' }
    ]
  };

  const sectionTitles = {
    system_admin: 'System Administration',
    company_admin: 'Company Administration',
    employee: 'Employee Portal',
    customer: 'Customer Portal',
    provider: 'Service Provider',
    staff: 'Staff Portal'
  };

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <ShieldIcon /> InsuraVault
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
          const Icon = item.icon;
          return (
            <div
              key={index}
              className={`nav-item ${activeNav === item.path ? 'active' : ''}`}
              onClick={() => { setActiveNav(item.path); navigate(item.path); }}
            >
              <Icon /> {item.label}
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
          <LogOutIcon /> Logout
        </div>
      </div>
    </div>
  );
};

// Public Layout - for homepage and insurance pages (no sidebar)
const PublicLayout = ({ children }) => {
  return (
    <div className="app-container">
      <main className="main-content" style={{ marginLeft: 0, padding: 0 }}>
        {children}
      </main>
    </div>
  );
};

// Main App Component
const App = () => {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <Toaster position="top-right" />
        <Suspense fallback={<div className="loading-spinner"><div className="spinner"></div></div>}>
          <Routes>
          <Route path="/login" element={<PublicLayout><LoginPage /></PublicLayout>} />
          <Route path="/register" element={<PublicLayout><RegisterPage /></PublicLayout>} />
          
          <Route path="/admin/customers" element={
            <ProtectedRoute roles={['system_admin', 'company_admin', 'admin']}>
              <Layout role="company_admin">
                <CustomersPage />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/admin/policies" element={
            <ProtectedRoute roles={['system_admin', 'company_admin', 'admin']}>
              <Layout role="company_admin">
                <PoliciesPage />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/admin/claims" element={
            <ProtectedRoute roles={['system_admin', 'company_admin', 'admin']}>
              <Layout role="company_admin">
                <ClaimsPage />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/admin/payments" element={
            <ProtectedRoute roles={['system_admin', 'company_admin', 'admin']}>
              <Layout role="company_admin">
                <PaymentsPage />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/admin/plans" element={
            <ProtectedRoute roles={['system_admin', 'company_admin', 'admin']}>
              <Layout role="company_admin">
                <PlansPage />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/admin/settings" element={
            <ProtectedRoute roles={['system_admin', 'company_admin', 'admin']}>
              <Layout role="company_admin">
                <AdminSettingsPage />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/admin/*" element={
            <ProtectedRoute roles={['company_admin', 'system_admin']}>
              <Layout role="company_admin">
                <AdminDashboard />
              </Layout>
            </ProtectedRoute>
          } />

          {/* Staff Portal Routes */}
          <Route path="/staff/customers" element={
            <ProtectedRoute roles={['system_admin', 'company_admin', 'admin', 'hr_manager', 'department_manager', 'supervisor', 'employee', 'senior_management']}>
              <Layout role="company_admin">
                <StaffCustomerList />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/staff/customers/:id/documents" element={
            <ProtectedRoute roles={['system_admin', 'company_admin', 'admin', 'hr_manager', 'department_manager', 'supervisor', 'employee', 'senior_management']}>
              <Layout role="company_admin">
                <StaffCustomerDocuments />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/staff/customers/:id/claims" element={
            <ProtectedRoute roles={['system_admin', 'company_admin', 'admin', 'hr_manager', 'department_manager', 'supervisor', 'employee', 'senior_management']}>
              <Layout role="company_admin">
                <StaffCustomerClaims />
              </Layout>
            </ProtectedRoute>
          } />

          {/* Manager Portal Routes */}
          <Route path="/manager/dashboard" element={
            <ProtectedRoute roles={['department_manager', 'hr_manager', 'system_admin', 'company_admin', 'admin', 'senior_management']}>
              <Layout role="company_admin">
                <ManagerDashboardPage />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/manager/attendance" element={
            <ProtectedRoute roles={['department_manager', 'hr_manager', 'system_admin', 'company_admin', 'admin', 'senior_management']}>
              <Layout role="company_admin">
                <ManagerTeamAttendancePage />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/manager/tasks" element={
            <ProtectedRoute roles={['department_manager', 'hr_manager', 'system_admin', 'company_admin', 'admin', 'senior_management']}>
              <Layout role="company_admin">
                <ManagerTeamTasksPage />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/manager/approvals" element={
            <ProtectedRoute roles={['department_manager', 'hr_manager', 'system_admin', 'company_admin', 'admin', 'senior_management']}>
              <Layout role="company_admin">
                <ManagerApprovalsPage />
              </Layout>
            </ProtectedRoute>
          } />

          {/* Admin Portal Routes */}
          <Route path="/admin/portal" element={
            <ProtectedRoute roles={['system_admin', 'company_admin', 'admin']}>
              <Layout role="company_admin">
                <AdminPortalDashboardPage />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/admin/users" element={
            <ProtectedRoute roles={['system_admin', 'company_admin', 'admin']}>
              <Layout role="company_admin">
                <AdminUserManagementPage />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/admin/departments" element={
            <ProtectedRoute roles={['system_admin', 'company_admin', 'admin']}>
              <Layout role="company_admin">
                <AdminDepartmentsPage />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/admin/audit-logs" element={
            <ProtectedRoute roles={['system_admin', 'company_admin', 'admin']}>
              <Layout role="company_admin">
                <AdminAuditLogsPage />
              </Layout>
            </ProtectedRoute>
          } />
          
          {/* System Admin Routes - Cross-company access */}
          <Route path="/system/dashboard" element={
            <ProtectedRoute roles={['system_admin']}>
              <Layout role="system_admin">
                <SystemDashboardPage />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/system/companies" element={
            <ProtectedRoute roles={['system_admin']}>
              <Layout role="system_admin">
                <SystemCompaniesPage />
              </Layout>
            </ProtectedRoute>
          } />
          
          {/* Provider Portal - Claims and tickets */}
          <Route path="/provider" element={
            <ProtectedRoute roles={['provider']}>
              <Layout role="provider">
                <ProviderDashboardPage />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/provider/tickets" element={
            <ProtectedRoute roles={['provider', 'admin', 'company_admin', 'system_admin']}>
              <Layout role="provider">
                <ProviderTicketsPage />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/provider/claims" element={
            <ProtectedRoute roles={['provider', 'admin', 'company_admin', 'system_admin']}>
              <Layout role="provider">
                <ProviderClaimsPage />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/provider/customers" element={
            <ProtectedRoute roles={['provider', 'admin', 'company_admin', 'system_admin']}>
              <Layout role="provider">
                <ProviderCustomersPage />
              </Layout>
            </ProtectedRoute>
          } />
          
          {/* Customer Portal - Policies, claims, payments */}
          <Route path="/customer" element={
            <ProtectedRoute roles={['customer']}>
              <Layout role="customer">
                <CustomerDashboardPage />
              </Layout>
            </ProtectedRoute>
          } />
          
          <Route path="/customer/plans" element={
            <ProtectedRoute roles={['customer']}>
              <Layout role="customer">
                <CustomerPlansPage />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/customer/policies" element={
            <ProtectedRoute roles={['customer']}>
              <Layout role="customer">
                <CustomerPoliciesPage />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/customer/claims" element={
            <ProtectedRoute roles={['customer']}>
              <Layout role="customer">
                <CustomerClaimsPage />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/customer/payments" element={
            <ProtectedRoute roles={['customer']}>
              <Layout role="customer">
                <CustomerPaymentsPage />
              </Layout>
            </ProtectedRoute>
          } />
          
          {/* Workforce Management Routes */}
          <Route path="/workforce/employees" element={
            <ProtectedRoute roles={['system_admin', 'company_admin', 'admin', 'hr_manager', 'department_manager', 'supervisor', 'employee', 'senior_management']}>
              <Layout role="company_admin">
                <WorkforceEmployees />
              </Layout>
            </ProtectedRoute>
          } />
          
          <Route path="/workforce/attendance" element={
            <ProtectedRoute roles={['system_admin', 'company_admin', 'admin', 'hr_manager', 'department_manager', 'supervisor', 'employee', 'senior_management']}>
              <Layout role="company_admin">
                <WorkforceAttendance />
              </Layout>
            </ProtectedRoute>
          } />
          
          <Route path="/workforce/tasks" element={
            <ProtectedRoute roles={['system_admin', 'company_admin', 'admin', 'hr_manager', 'department_manager', 'supervisor', 'employee', 'senior_management']}>
              <Layout role="company_admin">
                <WorkforceTasks />
              </Layout>
            </ProtectedRoute>
          } />
          
          <Route path="/workforce/performance" element={
            <ProtectedRoute roles={['system_admin', 'company_admin', 'admin', 'hr_manager', 'department_manager', 'supervisor', 'employee', 'senior_management']}>
              <Layout role="company_admin">
                <WorkforcePerformance />
              </Layout>
            </ProtectedRoute>
          } />
          
          <Route path="/workforce/monthly" element={
            <ProtectedRoute roles={['system_admin', 'company_admin', 'admin', 'hr_manager', 'department_manager', 'senior_management']}>
              <Layout role="company_admin">
                <WorkforceMonthly />
              </Layout>
            </ProtectedRoute>
          } />
          
          <Route path="/workforce/reports" element={
            <ProtectedRoute roles={['system_admin', 'company_admin', 'admin', 'hr_manager', 'department_manager', 'senior_management']}>
              <Layout role="company_admin">
                <WorkforceReports />
              </Layout>
            </ProtectedRoute>
          } />
          
          <Route path="/workforce/notifications" element={
            <ProtectedRoute roles={['system_admin', 'company_admin', 'admin', 'hr_manager', 'department_manager', 'supervisor', 'employee', 'senior_management']}>
              <Layout role="company_admin">
                <WorkforceNotifications />
              </Layout>
            </ProtectedRoute>
          } />
          
          <Route path="/workforce/leave-requests" element={
            <ProtectedRoute roles={['system_admin', 'company_admin', 'admin', 'hr_manager', 'department_manager', 'supervisor', 'employee', 'senior_management']}>
              <Layout role="company_admin">
                <WorkforceLeaveRequests />
              </Layout>
            </ProtectedRoute>
          } />
          
          <Route path="/" element={<PublicLayout><HomePage /></PublicLayout>} />
          <Route path="/login" element={<PublicLayout><LoginPage /></PublicLayout>} />
          <Route path="/register" element={<PublicLayout><RegisterPage /></PublicLayout>} />
          
          <Route path="/insurance/:category" element={<PublicLayout><InsuranceCategoryPage /></PublicLayout>} />
          <Route path="/quote/:category" element={<PublicLayout><InsuranceCategoryPage /></PublicLayout>} />
        </Routes>
        </Suspense>
      </AuthProvider>
    </Router>
  );
};

export default App;