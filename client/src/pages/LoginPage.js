import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getErrorMessage } from '../utils/helpers';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const user = await login(form.email, form.password);
      navigate('/dashboard');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #EEF3FF 0%, #F9FAFB 50%, #FFF8E7 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ width: 56, height: 56, background: 'var(--primary)', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 24, margin: '0 auto 1rem' }}>G</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', color: 'var(--gray-900)', marginBottom: 4 }}>GoalPortal</h1>
          <p style={{ color: 'var(--gray-500)', fontSize: 14 }}>Sign in to your account</p>
        </div>

        <div className="card" style={{ padding: '2rem' }}>
          {error && <div className="alert alert-error">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Email address</label>
              <input className="form-input" type="email" placeholder="you@company.com" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} required />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input className="form-input" type="password" placeholder="••••••••" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} required />
            </div>
            <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={loading} style={{ marginTop: '0.5rem' }}>
              {loading ? <><span className="spinner spinner-sm"></span> Signing in…</> : 'Sign In'}
            </button>
          </form>

          {/* Demo accounts */}
          <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'var(--gray-50)', borderRadius: 8, fontSize: 12 }}>
            <div style={{ fontWeight: 600, color: 'var(--gray-700)', marginBottom: 8 }}>Demo Accounts (after seeding):</div>
            <div style={{ color: 'var(--gray-500)', lineHeight: 2 }}>
              👤 employee@demo.com / demo1234<br />
              👔 manager@demo.com / demo1234<br />
              🔑 admin@demo.com / demo1234
            </div>
          </div>
        </div>
        <p style={{ textAlign: 'center', marginTop: '1rem', fontSize: 13, color: 'var(--gray-500)' }}>
          Don't have an account? <Link to="/register">Register</Link>
        </p>
      </div>
    </div>
  );
}
