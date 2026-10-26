import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import api from './api';

// Auth Context
import AuthProvider, { useAuth } from './components/AuthContext';

// Layout
import Icons from './components/Icons';

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
              <Icons.Bell />
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

// Sidebar Component
const Sidebar = ({ role, onLogout }) => {
  const navigate = useNavigate();
  const [activeNav, setActiveNav] = useState('');

  const navItems = {
    system_admin: [
      { icon: Icons.Home, label: 'System Dashboard', path: '/system/dashboard', section: 'System' },
      { icon: Icons.Building, label: 'Companies', path: '/system/companies', section: 'System' },
      { icon: Icons.Shield, label: 'Admin Portal', path: '/admin/portal', section: 'Admin' },
      { icon: Icons.Users, label: 'User Management', path: '/admin/users', section: 'Admin' },
      { icon: Icons.Building, label: 'Departments', path: '/admin/departments', section: 'Admin' },
      { icon: Icons.FileText, label: 'Audit Logs', path: '/admin/audit-logs', section: 'Admin' },
      { icon: Icons.Shield, label: 'Plans', path: '/admin/plans', section: 'Admin' },
      { icon: Icons.Users, label: 'Customers', path: '/admin/customers', section: 'Admin' },
      { icon: Icons.Users, label: 'Staff Customers', path: '/staff/customers', section: 'Staff' },
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
      { icon: Icons.Calendar, label: 'Leave Requests', path: '/workforce/leave-requests', section: 'Workforce' },
      { icon: Icons.Clock, label: 'Team Attendance', path: '/manager/attendance', section: 'Management' },
      { icon: Icons.Task, label: 'Team Tasks', path: '/manager/tasks', section: 'Management' },
      { icon: Icons.CheckCircle, label: 'Approvals', path: '/manager/approvals', section: 'Management' }
    ],
    company_admin: [
      { icon: Icons.Home, label: 'Company Dashboard', path: '/admin', section: 'Company' },
      { icon: Icons.Shield, label: 'Admin Portal', path: '/admin/portal', section: 'Admin' },
      { icon: Icons.Users, label: 'User Management', path: '/admin/users', section: 'Admin' },
      { icon: Icons.Building, label: 'Departments', path: '/admin/departments', section: 'Admin' },
      { icon: Icons.FileText, label: 'Audit Logs', path: '/admin/audit-logs', section: 'Admin' },
      { icon: Icons.Users, label: 'Customers', path: '/admin/customers', section: 'Company' },
      { icon: Icons.Users, label: 'Staff Customers', path: '/staff/customers', section: 'Staff' },
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
      { icon: Icons.Calendar, label: 'Leave Requests', path: '/workforce/leave-requests', section: 'Workforce' },
      { icon: Icons.Clock, label: 'Team Attendance', path: '/manager/attendance', section: 'Management' },
      { icon: Icons.Task, label: 'Team Tasks', path: '/manager/tasks', section: 'Management' },
      { icon: Icons.CheckCircle, label: 'Approvals', path: '/manager/approvals', section: 'Management' }
    ],
    department_manager: [
      { icon: Icons.Home, label: 'Manager Dashboard', path: '/manager/dashboard', section: 'Management' },
      { icon: Icons.Clock, label: 'Team Attendance', path: '/manager/attendance', section: 'Management' },
      { icon: Icons.Task, label: 'Team Tasks', path: '/manager/tasks', section: 'Management' },
      { icon: Icons.CheckCircle, label: 'Approvals', path: '/manager/approvals', section: 'Management' }
    ],
    hr_manager: [
      { icon: Icons.Home, label: 'Manager Dashboard', path: '/manager/dashboard', section: 'Management' },
      { icon: Icons.Clock, label: 'Team Attendance', path: '/manager/attendance', section: 'Management' },
      { icon: Icons.Task, label: 'Team Tasks', path: '/manager/tasks', section: 'Management' },
      { icon: Icons.CheckCircle, label: 'Approvals', path: '/manager/approvals', section: 'Management' },
      { icon: Icons.Users, label: 'Employees', path: '/workforce/employees', section: 'Workforce' },
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
    provider: 'Service Provider',
    staff: 'Staff Portal'
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