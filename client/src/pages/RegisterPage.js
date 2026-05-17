import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI, usersAPI } from '../utils/api';
import { getErrorMessage } from '../utils/helpers';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [managers, setManagers] = useState([]);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'employee', department: '', manager: '', employeeId: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    usersAPI.getManagers().then(r => setManagers(r.data)).catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await authAPI.register(form);
      navigate('/login');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #EEF3FF 0%, #F9FAFB 50%, #FFF8E7 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ width: '100%', maxWidth: 480 }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ width: 56, height: 56, background: 'var(--primary)', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 24, margin: '0 auto 1rem' }}>G</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', color: 'var(--gray-900)', marginBottom: 4 }}>Create Account</h1>
        </div>

        <div className="card" style={{ padding: '2rem' }}>
          {error && <div className="alert alert-error">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input className="form-input" placeholder="Jane Smith" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label className="form-label">Employee ID</label>
                <input className="form-input" placeholder="EMP001" value={form.employeeId} onChange={e => setForm(p => ({ ...p, employeeId: e.target.value }))} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" type="email" placeholder="jane@company.com" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} required />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input className="form-input" type="password" placeholder="At least 6 characters" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} required minLength={6} />
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Role</label>
                <select className="form-select" value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}>
                  <option value="employee">Employee</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Department</label>
                <input className="form-input" placeholder="Sales, HR, IT…" value={form.department} onChange={e => setForm(p => ({ ...p, department: e.target.value }))} />
              </div>
            </div>
            {form.role === 'employee' && (
              <div className="form-group">
                <label className="form-label">Reporting Manager</label>
                <select className="form-select" value={form.manager} onChange={e => setForm(p => ({ ...p, manager: e.target.value }))}>
                  <option value="">— Select manager —</option>
                  {managers.map(m => <option key={m._id} value={m._id}>{m.name} ({m.department})</option>)}
                </select>
              </div>
            )}
            <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={loading} style={{ marginTop: '0.5rem' }}>
              {loading ? <><span className="spinner spinner-sm"></span> Creating…</> : 'Create Account'}
            </button>
          </form>
        </div>
        <p style={{ textAlign: 'center', marginTop: '1rem', fontSize: 13, color: 'var(--gray-500)' }}>
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
