import React, { createContext, useState, useContext, useEffect, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

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

// Auth Context
const AuthContext = createContext(null);

// API Base URL
// Configurable at build time via REACT_APP_API_URL (see .env),
// falling back to the local backend in development and same-origin in production.
const API_URL =
  process.env.REACT_APP_API_URL ||
  (process.env.NODE_ENV === 'development'
    ? 'http://localhost:5000/api'
    : `${window.location.origin}/api`);

// Axios-like fetch wrapper
const api = {
  get: async (endpoint, token) => {
    const res = await fetch(`${API_URL}${endpoint}`, {
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
    });
    return res.json();
  },
  post: async (endpoint, data, token) => {
    const res = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },
  put: async (endpoint, data, token) => {
    const res = await fetch(`${API_URL}${endpoint}`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },
  delete: async (endpoint, token) => {
    const res = await fetch(`${API_URL}${endpoint}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
    });
    return res.json();
  }
};

// Auth Provider Component
const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    }
    setLoading(false);
  }, [token]);

  const login = async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    if (response.success) {
      localStorage.setItem('token', response.data.accessToken);
      localStorage.setItem('refreshToken', response.data.refreshToken);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      setToken(response.data.accessToken);
      setUser(response.data.user);
      return { success: true };
    }
    return { success: false, message: response.message };
  };

  const register = async (data) => {
    const response = await api.post('/auth/register', data);
    if (response.success) {
      localStorage.setItem('token', response.data.accessToken);
      localStorage.setItem('refreshToken', response.data.refreshToken);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      setToken(response.data.accessToken);
      setUser(response.data.user);
      return { success: true };
    }
    return { success: false, message: response.message };
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  const checkExistence = async (idNumber, phone) => {
    return await api.post('/auth/check-existence', { idNumber, phone });
  };

  const confirmDetails = async (customerId, isConfirmed) => {
    return await api.post('/auth/confirm-details', { customerId, isConfirmed });
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, checkExistence, confirmDetails }}>
      {children}
    </AuthContext.Provider>
  );
};

// Use Auth Hook
export const useAuth = () => useContext(AuthContext);

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

// Icons
const Icons = {
  Shield: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  Users: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  FileText: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
  CreditCard: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>,
  MessageSquare: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  BarChart: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></svg>,
  Settings: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  LogOut: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  Home: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  Plus: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  Check: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>,
  X: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  ChevronRight: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>,
  Search: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  Bell: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
  Clock: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  Task: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>,
  Chart: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="9"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="15"/></svg>,
  Calendar: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  Building: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1L3 5v6c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V5l-9-4z"/><path d="M7 17v4h2v-4zm6 4h2v-4h-2zm-6 0v-4h2v4zm10 0h2v-4h-2z"/></svg>
};

// Login Page
const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);
    
    if (result.success) {
      const user = JSON.parse(localStorage.getItem('user'));
      if (user.role === 'system_admin') navigate('/system/dashboard');
      else if (user.role === 'company_admin' || user.role === 'admin') navigate('/admin');
      else if (user.role === 'provider') navigate('/provider');
      else if (user.role === 'customer') navigate('/customer');
      else navigate('/workforce/attendance');
    } else {
      alert(result.message || 'Login failed');
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">
            <Icons.Shield /> Insurance MS
          </div>
          <h1 className="auth-title">Welcome Back</h1>
          <p className="auth-subtitle">Sign in to your account</p>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
          </div>
          
          <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        
        <p className="text-center mt-3">
          Don't have an account? <a href="/register">Register</a>
        </p>
      </div>
    </div>
  );
};

// Register Page
const RegisterPage = () => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    email: '', password: '', phone: '', fullName: '', idNumber: '', address: '', dateOfBirth: ''
  });
  const [existingCustomer, setExistingCustomer] = useState(null);
  const [loading, setLoading] = useState(false);
  const { register, checkExistence, confirmDetails } = useAuth();
  const navigate = useNavigate();

  const handleCheckExistence = async (e) => {
    e.preventDefault();
    setLoading(true);
    const result = await checkExistence(formData.idNumber, formData.phone);
    setLoading(false);
    
    if (result.success && result.exists) {
      setExistingCustomer(result.data);
      setStep(2);
    } else {
      setStep(3);
    }
  };

  const handleConfirm = async (confirmed) => {
    if (existingCustomer) {
      const result = await confirmDetails(existingCustomer.id, confirmed);
      if (result.success) {
        if (result.data.hasAccount) {
          navigate('/login');
        } else if (!result.data.requiresUpdate) {
          setFormData({ ...formData, ...result.data.customer });
          setStep(3);
        } else {
          setFormData({ ...formData, ...result.data.customer });
        }
      }
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    const result = await register(formData);
    setLoading(false);
    
    if (result.success) {
      navigate('/customer');
    } else {
      alert(result.message || 'Registration failed');
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">
            <Icons.Shield /> Insurance MS
          </div>
          <h1 className="auth-title">Create Account</h1>
          <p className="auth-subtitle">
            {step === 1 && 'Enter your ID or phone to check existing records'}
            {step === 2 && 'We found your records. Please confirm.'}
            {step === 3 && 'Complete your registration'}
          </p>
        </div>

        {step === 1 && (
          <form onSubmit={handleCheckExistence}>
            <div className="form-group">
              <label className="form-label">National ID Number</label>
              <input
                type="text"
                className="form-input"
                value={formData.idNumber}
                onChange={(e) => setFormData({ ...formData, idNumber: e.target.value })}
                placeholder="Enter ID number"
              />
            </div>
            <div className="form-group">
              <label className="form-label">OR Phone Number</label>
              <input
                type="tel"
                className="form-input"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="Enter phone number"
              />
            </div>
            <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={loading}>
              {loading ? 'Checking...' : 'Continue'}
            </button>
          </form>
        )}

        {step === 2 && existingCustomer && (
          <div className="fade-in">
            <div className="card" style={{ background: '#f8f9fa' }}>
              <h3>Existing Customer Found</h3>
              <p><strong>Name:</strong> {existingCustomer.fullName}</p>
              <p><strong>ID:</strong> {existingCustomer.idNumber}</p>
              <p><strong>Phone:</strong> {existingCustomer.phone}</p>
              <p><strong>Email:</strong> {existingCustomer.email}</p>
            </div>
            <p>Is this information correct?</p>
            <div className="d-flex gap-2 mt-3">
              <button className="btn btn-primary" onClick={() => handleConfirm(true)} style={{ flex: 1 }}>
                Yes, Continue
              </button>
              <button className="btn btn-outline" onClick={() => handleConfirm(false)} style={{ flex: 1 }}>
                No, Update
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <form onSubmit={handleRegister}>
            <div className="form-group">
              <label className="form-label">Full Name *</label>
              <input
                type="text"
                className="form-input"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Email *</label>
              <input
                type="email"
                className="form-input"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Phone *</label>
              <input
                type="tel"
                className="form-input"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">ID Number *</label>
              <input
                type="text"
                className="form-input"
                value={formData.idNumber}
                onChange={(e) => setFormData({ ...formData, idNumber: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Address</label>
              <input
                type="text"
                className="form-input"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Date of Birth</label>
              <input
                type="date"
                className="form-input"
                value={formData.dateOfBirth}
                onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Password *</label>
              <input
                type="password"
                className="form-input"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="At least 6 characters"
                required
              />
            </div>
            <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={loading}>
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>
        )}

        <p className="text-center mt-3">
          Already have an account? <a href="/login">Sign In</a>
        </p>
      </div>
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

// Admin Dashboard (imported from pages/admin/AdminDashboard.jsx)
// Customer Dashboard (imported from pages/customer/CustomerDashboard.jsx)
// Provider Dashboard (imported from pages/provider/ProviderDashboard)

// Plans List Page
const PlansPage = () => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const { token, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPlans = async () => {
      const result = await api.get('/plans', token);
      if (result.success) setPlans(result.data.plans);
      setLoading(false);
    };
    fetchPlans();
  }, [token]);

  const handleApply = (planId) => {
    navigate(`/customer/apply/${planId}`);
  };

  if (loading) return <div className="loading-spinner"><div className="spinner"></div></div>;

  return (
    <div className="fade-in">
      <h1 className="dashboard-title mb-3">Insurance Plans</h1>
      
      <div className="grid-3">
        {plans.map(plan => (
          <div key={plan.id} className="card">
            <h3>{plan.name}</h3>
            <p className="text-secondary mb-2">{plan.description}</p>
            <div className="mb-2">
              <span className="text-primary" style={{ fontSize: '24px', fontWeight: 'bold' }}>
                ${plan.premium_amount}
              </span>
              <span className="text-secondary">/month</span>
            </div>
            <p><strong>Coverage:</strong> ${parseInt(plan.coverage_amount).toLocaleString()}</p>
            <p><strong>Duration:</strong> {plan.duration_months} months</p>
            {user.role === 'customer' && (
              <button className="btn btn-primary mt-3" style={{ width: '100%' }} onClick={() => handleApply(plan.id)}>
                Apply Now
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// Main Layout Component
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
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          
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
