import React, { useState, useEffect } from 'react';
import { adminAPI, usersAPI, authAPI } from '../utils/api';
import { formatDate, getErrorMessage } from '../utils/helpers';

const DEFAULT_THRUST_AREAS = [
  'Financial Performance', 'Customer Satisfaction', 'Operational Excellence',
  'People & Culture', 'Innovation & Growth', 'Safety & Compliance',
  'Digital Transformation', 'Strategic Initiatives',
];

export default function AdminPage() {
  const [tab, setTab] = useState('cycles');

  return (
    <div>
      <div className="page-header">
        <h1>Administration</h1>
        <p>Manage cycles, org hierarchy, users, and system configuration</p>
      </div>

      <div className="tabs">
        {[
          { key: 'cycles', label: '📅 Cycle Management' },
          { key: 'users', label: '👥 User Management' },
          { key: 'stats', label: '🏢 Org Overview' },
        ].map(t => (
          <button key={t.key} className={`tab-btn ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'cycles' && <CyclesTab />}
      {tab === 'users' && <UsersTab />}
      {tab === 'stats' && <StatsTab />}
    </div>
  );
}

/* ─── Cycles Tab ─── */
function CyclesTab() {
  const [cycles, setCycles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({
    year: new Date().getFullYear(),
    goalSettingOpen: `${new Date().getFullYear()}-05-01`,
    goalSettingClose: `${new Date().getFullYear()}-06-30`,
    thrustAreas: [...DEFAULT_THRUST_AREAS],
    quarters: [
      { name: 'Q1', label: 'July Check-in', windowOpen: `${new Date().getFullYear()}-07-01`, windowClose: `${new Date().getFullYear()}-07-31` },
      { name: 'Q2', label: 'October Check-in', windowOpen: `${new Date().getFullYear()}-10-01`, windowClose: `${new Date().getFullYear()}-10-31` },
      { name: 'Q3', label: 'January Check-in', windowOpen: `${new Date().getFullYear() + 1}-01-01`, windowClose: `${new Date().getFullYear() + 1}-01-31` },
      { name: 'Q4', label: 'Annual Review', windowOpen: `${new Date().getFullYear() + 1}-03-01`, windowClose: `${new Date().getFullYear() + 1}-04-30` },
    ],
  });
  const [newThrust, setNewThrust] = useState('');

  const fetchCycles = async () => {
    setLoading(true);
    try { const res = await adminAPI.getCycles(); setCycles(res.data); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchCycles(); }, []);

  const handleSave = async () => {
    setError(''); setSaving(true);
    try {
      await adminAPI.saveCycle(form);
      setSuccess(`Cycle ${form.year} saved successfully`);
      setShowForm(false);
      fetchCycles();
    } catch (e) { setError(getErrorMessage(e)); }
    finally { setSaving(false); }
  };

  const addThrust = () => {
    if (newThrust.trim() && !form.thrustAreas.includes(newThrust.trim())) {
      setForm(p => ({ ...p, thrustAreas: [...p.thrustAreas, newThrust.trim()] }));
      setNewThrust('');
    }
  };

  const removeThrust = (t) => setForm(p => ({ ...p, thrustAreas: p.thrustAreas.filter(x => x !== t) }));

  const updateQuarter = (idx, field, val) => {
    setForm(p => {
      const qs = [...p.quarters];
      qs[idx] = { ...qs[idx], [field]: val };
      return { ...p, quarters: qs };
    });
  };

  return (
    <div>
      {success && <div className="alert alert-success">{success}</div>}

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
        <button className="btn btn-primary" onClick={() => { setShowForm(true); setError(''); setSuccess(''); }}>+ New Cycle</button>
      </div>

      {loading ? (
        <div className="loading-center"><div className="spinner"></div></div>
      ) : cycles.length === 0 ? (
        <div className="card"><div className="empty-state"><p>No cycles configured yet. Create one to get started.</p></div></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {cycles.map(c => (
            <div key={c._id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                    <h3 style={{ fontSize: '1.3rem' }}>Cycle {c.year}</h3>
                    {c.isActive && <span className="badge badge-approved">Active</span>}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--gray-500)' }}>
                    Goal Setting: {formatDate(c.goalSettingOpen)} → {formatDate(c.goalSettingClose)}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {c.thrustAreas?.slice(0, 3).map(t => <span key={t} className="tag">{t}</span>)}
                  {c.thrustAreas?.length > 3 && <span className="tag">+{c.thrustAreas.length - 3}</span>}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '0.75rem', marginTop: '1rem' }}>
                {c.quarters?.map(q => (
                  <div key={q.name} style={{ background: 'var(--gray-50)', borderRadius: 8, padding: '0.75rem' }}>
                    <div style={{ fontWeight: 700, color: 'var(--primary)', marginBottom: 4 }}>{q.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--gray-600)' }}>{q.label}</div>
                    <div style={{ fontSize: 11, color: 'var(--gray-400)', marginTop: 4 }}>{formatDate(q.windowOpen)} – {formatDate(q.windowClose)}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Cycle Form Modal */}
      {showForm && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div className="modal" style={{ maxWidth: 680 }}>
            <div className="modal-header">
              <h2>Configure New Cycle</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowForm(false)}>✕</button>
            </div>
            <div className="modal-body">
              {error && <div className="alert alert-error">{error}</div>}

              <div className="form-group">
                <label className="form-label">Cycle Year</label>
                <input className="form-input" type="number" value={form.year} onChange={e => setForm(p => ({ ...p, year: parseInt(e.target.value) }))} />
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Goal Setting Opens</label>
                  <input className="form-input" type="date" value={form.goalSettingOpen} onChange={e => setForm(p => ({ ...p, goalSettingOpen: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Goal Setting Closes</label>
                  <input className="form-input" type="date" value={form.goalSettingClose} onChange={e => setForm(p => ({ ...p, goalSettingClose: e.target.value }))} />
                </div>
              </div>

              <div className="divider" />
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: '1rem', color: 'var(--gray-700)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Quarterly Windows</div>

              {form.quarters.map((q, idx) => (
                <div key={q.name} style={{ background: 'var(--gray-50)', padding: '1rem', borderRadius: 8, marginBottom: '0.75rem' }}>
                  <div style={{ fontWeight: 600, color: 'var(--primary)', marginBottom: '0.75rem' }}>{q.name} — {q.label}</div>
                  <div className="grid-2">
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Window Opens</label>
                      <input className="form-input" type="date" value={q.windowOpen} onChange={e => updateQuarter(idx, 'windowOpen', e.target.value)} />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Window Closes</label>
                      <input className="form-input" type="date" value={q.windowClose} onChange={e => updateQuarter(idx, 'windowClose', e.target.value)} />
                    </div>
                  </div>
                </div>
              ))}

              <div className="divider" />
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: '1rem', color: 'var(--gray-700)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Thrust Areas</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
                {form.thrustAreas.map(t => (
                  <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--primary-light)', color: 'var(--primary)', fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 99 }}>
                    {t}
                    <button onClick={() => removeThrust(t)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', fontSize: 14, lineHeight: 1, padding: 0 }}>✕</button>
                  </span>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input className="form-input" placeholder="Add thrust area…" value={newThrust} onChange={e => setNewThrust(e.target.value)} onKeyDown={e => e.key === 'Enter' && addThrust()} style={{ flex: 1 }} />
                <button className="btn btn-secondary" onClick={addThrust}>Add</button>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? <><span className="spinner spinner-sm"></span> Saving…</> : 'Save Cycle'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Users Tab ─── */
function UsersTab() {
  const [users, setUsers] = useState([]);
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', email: '', password: 'demo1234', role: 'employee', department: '', manager: '', employeeId: '' });
  const [addError, setAddError] = useState('');
  const [addSuccess, setAddSuccess] = useState('');
  const [adding, setAdding] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editError, setEditError] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = {};
      if (roleFilter) params.role = roleFilter;
      const [uRes, mRes] = await Promise.all([usersAPI.getAll(params), usersAPI.getManagers()]);
      setUsers(uRes.data);
      setManagers(mRes.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchUsers(); }, [roleFilter]);

  const handleAdd = async () => {
    setAddError(''); setAdding(true);
    try {
      await authAPI.register(addForm);
      setAddSuccess(`User ${addForm.name} created successfully`);
      setShowAddForm(false);
      setAddForm({ name: '', email: '', password: 'demo1234', role: 'employee', department: '', manager: '', employeeId: '' });
      fetchUsers();
    } catch (e) { setAddError(getErrorMessage(e)); }
    finally { setAdding(false); }
  };

  const openEdit = (u) => {
    setEditUser(u);
    setEditForm({ name: u.name, email: u.email, role: u.role, department: u.department || '', manager: u.manager?._id || '', employeeId: u.employeeId || '', isActive: u.isActive });
    setEditError('');
  };

  const handleEdit = async () => {
    setEditError(''); setSaving(true);
    try {
      await usersAPI.update(editUser._id, editForm);
      setEditUser(null);
      fetchUsers();
    } catch (e) { setEditError(getErrorMessage(e)); }
    finally { setSaving(false); }
  };

  const ROLE_COLORS = { employee: 'var(--primary)', manager: '#7C3AED', admin: '#059669' };

  return (
    <div>
      {addSuccess && <div className="alert alert-success">{addSuccess}</div>}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {['', 'employee', 'manager', 'admin'].map(r => (
            <button key={r} className={`btn btn-sm ${roleFilter === r ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setRoleFilter(r)}>
              {r || 'All'}
            </button>
          ))}
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => { setShowAddForm(true); setAddError(''); }}>+ Add User</button>
      </div>

      {loading ? (
        <div className="loading-center"><div className="spinner"></div></div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Employee</th>
                <th>Email</th>
                <th>Role</th>
                <th>Department</th>
                <th>Manager</th>
                <th>Employee ID</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u._id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: ROLE_COLORS[u.role] || 'var(--gray-400)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 600, fontSize: 13, flexShrink: 0 }}>
                        {u.name?.[0]}
                      </div>
                      <span style={{ fontWeight: 600 }}>{u.name}</span>
                    </div>
                  </td>
                  <td style={{ fontSize: 13, color: 'var(--gray-600)' }}>{u.email}</td>
                  <td><span className={`badge badge-${u.role === 'admin' ? 'approved' : u.role === 'manager' ? 'submitted' : 'draft'}`} style={{ textTransform: 'capitalize' }}>{u.role}</span></td>
                  <td><span className="tag">{u.department || '—'}</span></td>
                  <td style={{ fontSize: 13 }}>{u.manager?.name || '—'}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>{u.employeeId || '—'}</td>
                  <td>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, color: u.isActive ? 'var(--success)' : 'var(--gray-400)' }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: u.isActive ? 'var(--success)' : 'var(--gray-300)', display: 'inline-block' }}></span>
                      {u.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <button className="btn btn-ghost btn-sm" onClick={() => openEdit(u)}>✏️ Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add User Modal */}
      {showAddForm && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setShowAddForm(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3>Add New User</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowAddForm(false)}>✕</button>
            </div>
            <div className="modal-body">
              {addError && <div className="alert alert-error">{addError}</div>}
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input className="form-input" value={addForm.name} onChange={e => setAddForm(p => ({ ...p, name: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Employee ID</label>
                  <input className="form-input" placeholder="EMP001" value={addForm.employeeId} onChange={e => setAddForm(p => ({ ...p, employeeId: e.target.value }))} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-input" type="email" value={addForm.email} onChange={e => setAddForm(p => ({ ...p, email: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Default Password</label>
                <input className="form-input" type="text" value={addForm.password} onChange={e => setAddForm(p => ({ ...p, password: e.target.value }))} />
                <div className="form-hint">User can change this after first login</div>
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Role</label>
                  <select className="form-select" value={addForm.role} onChange={e => setAddForm(p => ({ ...p, role: e.target.value }))}>
                    <option value="employee">Employee</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Department</label>
                  <input className="form-input" value={addForm.department} onChange={e => setAddForm(p => ({ ...p, department: e.target.value }))} />
                </div>
              </div>
              {addForm.role === 'employee' && (
                <div className="form-group">
                  <label className="form-label">Reporting Manager</label>
                  <select className="form-select" value={addForm.manager} onChange={e => setAddForm(p => ({ ...p, manager: e.target.value }))}>
                    <option value="">— Select —</option>
                    {managers.map(m => <option key={m._id} value={m._id}>{m.name}</option>)}
                  </select>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowAddForm(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleAdd} disabled={adding || !addForm.name || !addForm.email}>
                {adding ? <><span className="spinner spinner-sm"></span></> : 'Create User'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editUser && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setEditUser(null)}>
          <div className="modal">
            <div className="modal-header">
              <h3>Edit — {editUser.name}</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setEditUser(null)}>✕</button>
            </div>
            <div className="modal-body">
              {editError && <div className="alert alert-error">{editError}</div>}
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input className="form-input" value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Employee ID</label>
                  <input className="form-input" value={editForm.employeeId} onChange={e => setEditForm(p => ({ ...p, employeeId: e.target.value }))} />
                </div>
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Role</label>
                  <select className="form-select" value={editForm.role} onChange={e => setEditForm(p => ({ ...p, role: e.target.value }))}>
                    <option value="employee">Employee</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Department</label>
                  <input className="form-input" value={editForm.department} onChange={e => setEditForm(p => ({ ...p, department: e.target.value }))} />
                </div>
              </div>
              {editForm.role === 'employee' && (
                <div className="form-group">
                  <label className="form-label">Reporting Manager</label>
                  <select className="form-select" value={editForm.manager} onChange={e => setEditForm(p => ({ ...p, manager: e.target.value }))}>
                    <option value="">— Select —</option>
                    {managers.map(m => <option key={m._id} value={m._id}>{m.name}</option>)}
                  </select>
                </div>
              )}
              <div className="form-group">
                <label className="form-label">Account Status</label>
                <select className="form-select" value={editForm.isActive} onChange={e => setEditForm(p => ({ ...p, isActive: e.target.value === 'true' }))}>
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setEditUser(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleEdit} disabled={saving}>
                {saving ? <><span className="spinner spinner-sm"></span></> : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Stats Tab ─── */
function StatsTab() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminAPI.getStats().then(r => setStats(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-center"><div className="spinner"></div></div>;
  if (!stats) return <div className="alert alert-error">Failed to load stats</div>;

  return (
    <div>
      <div className="grid-3" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card">
          <div className="stat-label">Total Employees</div>
          <div className="stat-value">{stats.totalEmployees}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Managers</div>
          <div className="stat-value">{stats.totalManagers}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Departments</div>
          <div className="stat-value">{stats.totalDepartments}</div>
        </div>
      </div>

      {stats.departments?.length > 0 && (
        <div className="card">
          <h3 style={{ marginBottom: '1rem' }}>Departments</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {stats.departments.filter(Boolean).map(d => (
              <span key={d} className="tag" style={{ fontSize: 13, padding: '6px 12px' }}>{d}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
