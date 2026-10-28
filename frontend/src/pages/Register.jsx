import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import api from '../api';

/**
 * Register.jsx - Premium customer registration page
 */
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

    if (!formData.idNumber && !formData.phone) {
      setLoading(false);
      setStep(3);
      return;
    }

    const result = await checkExistence(formData.idNumber, formData.phone);
    setLoading(false);

    if (result.success && result.data?.exists) {
      setExistingCustomer(result.data);
      setStep(2);
    } else {
      setStep(3);
    }
  };

  const handleConfirmDetails = async (e) => {
    e.preventDefault();
    setLoading(true);

    const isConfirmed = formData.idNumber === existingCustomer?.id_number && formData.phone === existingCustomer?.phone;
    if (!isConfirmed) {
      setLoading(false);
      setError('ID number or phone number does not match our records.');
      return;
    }

    const result = await confirmDetails(existingCustomer.customer_id, true);
    setLoading(false);

    if (result.success) {
      setStep(3);
    } else {
      setError(result.message || 'Confirmation failed.');
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);

    const result = await register(formData.email, formData.password);
    setLoading(false);

    if (result.success) {
      navigate('/customer');
    } else {
      setError(result.message || 'Registration failed.');
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> InsuraVault
          </div>
          <h1 className="auth-title">{step === 1 ? 'Create Account' : step === 2 ? 'Verify Identity' : 'Complete Registration'}</h1>
          <p className="auth-subtitle">{step === 1 ? 'Join InsuraVault today' : step === 2 ? 'Confirm your identity' : 'Finish setting up your account'}</p>
        </div>

        {error && (
          <div className="form-group" style={{ color: '#dc2626', background: '#fef2f2', padding: '12px', borderRadius: '6px', marginBottom: '16px', fontSize: '14px' }}>
            {error}
          </div>
        )}

        <form onSubmit={step === 1 ? handleCheckExistence : step === 2 ? handleConfirmDetails : handleRegister}>
          {step === 1 && (
            <>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input className="form-input" value={formData.fullName} onChange={(e) => setFormData({ ...formData, fullName: e.target.value })} placeholder="Enter your full name" required />
              </div>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input className="form-input" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="Enter your email" required />
              </div>
              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <input className="form-input" type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="Enter your phone number" required />
              </div>
              <div className="form-group">
                <label className="form-label">ID Number</label>
                <input className="form-input" value={formData.idNumber} onChange={(e) => setFormData({ ...formData, idNumber: e.target.value })} placeholder="Enter your ID number" required />
              </div>
            </>
          )}
          {step === 2 && (
            <>
              <div className="form-group">
                <label className="form-label">Identity Confirmation</label>
                <div style={{ background: 'rgba(23, 119, 255, 0.1)', border: '1px solid rgba(23, 119, 255, 0.3)', borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
                  <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '8px' }}>Please confirm your identity:</p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>ID Number:</span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{existingCustomer?.id_number}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Phone:</span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{existingCustomer?.phone}</span>
                  </div>
                </div>
              </div>
            </>
          )}
          {step === 3 && (
            <>
              <div className="form-group">
                <label className="form-label">Create Password</label>
                <input className="form-input" type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} placeholder="Create a password" required />
              </div>
            </>
          )}

          <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={loading}>
            {loading ? 'Processing...' : step === 3 ? 'Create Account' : 'Continue'}
          </button>

          <p className="text-center mt-3">
            Already have an account? <a href="/login">Sign in</a>
          </p>
        </form>
      </div>
    </div>
  );
};

export default RegisterPage;
