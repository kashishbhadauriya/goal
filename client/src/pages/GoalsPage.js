import React, { useState, useEffect } from 'react';
import { goalsAPI, adminAPI } from '../utils/api';
import { UOM_LABELS, STATUS_LABELS, totalWeightage, getErrorMessage } from '../utils/helpers';
import { useAuth } from '../context/AuthContext';

const EMPTY_FORM = { thrustArea: '', title: '', description: '', uom: 'numeric_min', target: '', weightage: 10 };

export default function GoalsPage() {
  const { user } = useAuth();
  const [goals, setGoals] = useState([]);
  const [cycle, setCycle] = useState(new Date().getFullYear().toString());
  const [thrustAreas, setThrustAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editGoal, setEditGoal] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const fetch = async () => {
    setLoading(true);
    try {
      const res = await goalsAPI.getMy(cycle);
      setGoals(res.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, [cycle]);

  useEffect(() => {
    adminAPI.getActiveCycle().then(r => {
      if (r.data?.thrustAreas?.length) setThrustAreas(r.data.thrustAreas);
      else setThrustAreas(['Financial Performance','Customer Satisfaction','Operational Excellence','People & Culture','Innovation & Growth','Safety & Compliance']);
    }).catch(() => setThrustAreas(['Financial Performance','Customer Satisfaction','Operational Excellence']));
  }, []);

  const openCreate = () => { setEditGoal(null); setForm(EMPTY_FORM); setFormError(''); setShowForm(true); };
  const openEdit = (g) => { setEditGoal(g); setForm({ thrustArea: g.thrustArea, title: g.title, description: g.description, uom: g.uom, target: g.target, weightage: g.weightage }); setFormError(''); setShowForm(true); };

  const handleSave = async () => {
    setFormError(''); setSaving(true);
    try {
      if (editGoal) await goalsAPI.update(editGoal._id, { ...form, cycle });
      else await goalsAPI.create({ ...form, cycle });
      setShowForm(false);
      fetch();
    } catch (e) { setFormError(getErrorMessage(e)); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this draft goal?')) return;
    try { await goalsAPI.delete(id); fetch(); } catch (e) { alert(getErrorMessage(e)); }
  };

  const handleSubmit = async () => {
    setSubmitError('');
    const weight = totalWeightage(draftGoals);
    if (weight !== 100) { setSubmitError(`Total weightage must be exactly 100%. Current: ${weight}%`); return; }
    if (!window.confirm('Submit all draft goals for manager approval?')) return;
    setSubmitting(true);
    try { await goalsAPI.submit(cycle); fetch(); }
    catch (e) { setSubmitError(getErrorMessage(e)); }
    finally { setSubmitting(false); }
  };

  const draftGoals = goals.filter(g => g.status === 'draft');
  const submittedGoals = goals.filter(g => g.status === 'submitted');
  const approvedGoals = goals.filter(g => g.status === 'approved');
  const returnedGoals = goals.filter(g => g.status === 'returned');
  const weight = totalWeightage(goals.filter(g => !['returned'].includes(g.status)));
  const canAddMore = goals.filter(g => g.status !== 'returned').length < 8;

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1>My Goals</h1>
            <p>Create, manage, and track your performance goals</p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <select className="form-select" style={{ width: 100 }} value={cycle} onChange={e => setCycle(e.target.value)}>
              {[2023,2024,2025,2026].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            {canAddMore && draftGoals.length < 8 && (
              <button className="btn btn-primary" onClick={openCreate}>+ Add Goal</button>
            )}
          </div>
        </div>
      </div>

      {/* Weightage meter */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--gray-700)' }}>Total Weightage</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: weight === 100 ? 'var(--success)' : weight > 100 ? 'var(--danger)' : 'var(--accent)' }}>{weight}% / 100%</span>
        </div>
        <div className="progress-bar" style={{ height: 10 }}>
          <div className="progress-fill" style={{ width: `${Math.min(weight, 100)}%`, background: weight === 100 ? 'var(--success)' : weight > 100 ? 'var(--danger)' : 'var(--accent)' }}></div>
        </div>
        <div style={{ display: 'flex', gap: '1.5rem', marginTop: 10, fontSize: 13, color: 'var(--gray-500)', flexWrap: 'wrap' }}>
          <span>📝 Draft: {draftGoals.length}</span>
          <span>📤 Submitted: {submittedGoals.length}</span>
          <span>✅ Approved: {approvedGoals.length}</span>
          <span>↩️ Returned: {returnedGoals.length}</span>
          <span>📊 Goals: {goals.filter(g => g.status !== 'returned').length}/8</span>
        </div>
      </div>

      {/* Returned alert */}
      {returnedGoals.length > 0 && (
        <div className="alert alert-warning" style={{ marginBottom: '1.5rem' }}>
          ⚠️ {returnedGoals.length} goal(s) returned for rework. Please review and resubmit.
        </div>
      )}

      {/* Submit section */}
      {draftGoals.length > 0 && (
        <div className="card" style={{ marginBottom: '1.5rem', borderColor: weight === 100 ? 'var(--success)' : 'var(--gray-200)', background: weight === 100 ? 'var(--success-light)' : 'white' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <div style={{ fontWeight: 600, color: 'var(--gray-800)' }}>Ready to submit?</div>
              <div style={{ fontSize: 13, color: 'var(--gray-500)' }}>{draftGoals.length} draft goal(s) — Total weightage must equal 100%</div>
            </div>
            <button className={`btn ${weight === 100 ? 'btn-success' : 'btn-secondary'}`} onClick={handleSubmit} disabled={submitting || weight !== 100}>
              {submitting ? <><span className="spinner spinner-sm"></span> Submitting…</> : '📤 Submit for Approval'}
            </button>
          </div>
          {submitError && <div className="alert alert-error" style={{ marginTop: '1rem', marginBottom: 0 }}>{submitError}</div>}
        </div>
      )}

      {/* Goals list */}
      {loading ? (
        <div className="loading-center"><div className="spinner"></div></div>
      ) : goals.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div style={{ fontSize: 48, marginBottom: '1rem' }}>◎</div>
            <p style={{ fontWeight: 600, color: 'var(--gray-700)', marginBottom: 4 }}>No goals yet</p>
            <p>Click "Add Goal" to create your first performance goal for {cycle}</p>
          </div>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Goal Title</th>
                <th>Thrust Area</th>
                <th>UoM</th>
                <th>Target</th>
                <th>Weight</th>
                <th>Status</th>
                <th>Manager Note</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {goals.map(g => (
                <tr key={g._id}>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--gray-900)' }}>{g.title}</div>
                    {g.description && <div style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 2 }}>{g.description}</div>}
                    {g.isShared && <span className="tag" style={{ marginTop: 4 }}>🔗 Shared</span>}
                    {g.isLocked && <span className="tag" style={{ marginTop: 4, background: 'var(--accent-light)', color: '#92400E' }}>🔒 Locked</span>}
                  </td>
                  <td><span className="tag">{g.thrustArea}</span></td>
                  <td><span className={`tag uom-${g.uom}`}>{g.uom.replace(/_/g,' ')}</span></td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>{g.target}</td>
                  <td style={{ fontWeight: 700 }}>{g.weightage}%</td>
                  <td><span className={`badge badge-${g.status}`}>{g.status}</span></td>
                  <td style={{ fontSize: 12, color: 'var(--gray-600)', maxWidth: 180 }}>{g.managerNote || '—'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {['draft','returned'].includes(g.status) && !g.isLocked && (
                        <>
                          <button className="btn btn-ghost btn-sm" onClick={() => openEdit(g)} title="Edit">✏️</button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleDelete(g._id)} title="Delete">🗑️</button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Achievement section for approved goals */}
      {approvedGoals.length > 0 && (
        <div style={{ marginTop: '2rem' }}>
          <h2 style={{ marginBottom: '1rem' }}>Log Achievements</h2>
          <AchievementLogger goals={approvedGoals} onUpdate={fetch} />
        </div>
      )}

      {/* Goal Form Modal */}
      {showForm && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div className="modal">
            <div className="modal-header">
              <h2>{editGoal ? 'Edit Goal' : 'New Goal'}</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowForm(false)}>✕</button>
            </div>
            <div className="modal-body">
              {formError && <div className="alert alert-error">{formError}</div>}
              <div className="form-group">
                <label className="form-label">Thrust Area *</label>
                <select className="form-select" value={form.thrustArea} onChange={e => setForm(p => ({ ...p, thrustArea: e.target.value }))}>
                  <option value="">— Select —</option>
                  {thrustAreas.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Goal Title *</label>
                <input className="form-input" placeholder="e.g. Achieve ₹50L quarterly revenue" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="form-textarea" rows={2} placeholder="Brief description..." value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} style={{ resize: 'vertical' }} />
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Unit of Measurement *</label>
                  <select className="form-select" value={form.uom} onChange={e => setForm(p => ({ ...p, uom: e.target.value }))}>
                    {Object.entries(UOM_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Target *</label>
                  <input className="form-input" placeholder={form.uom === 'timeline' ? 'YYYY-MM-DD' : '100'} value={form.target} onChange={e => setForm(p => ({ ...p, target: e.target.value }))} />
                  <div className="form-hint">
                    {form.uom === 'numeric_min' && 'Higher actual = better score'}
                    {form.uom === 'numeric_max' && 'Lower actual = better score'}
                    {form.uom === 'timeline' && 'Enter deadline date'}
                    {form.uom === 'zero' && 'Goal: achieve exactly zero'}
                  </div>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Weightage (%) * <span style={{ fontWeight: 400, color: 'var(--gray-500)', fontSize: 12 }}>Min: 10%, Available: {100 - totalWeightage(goals.filter(g => !['returned'].includes(g.status)).filter(g => !editGoal || g._id !== editGoal._id))}%</span></label>
                <input className="form-input" type="number" min={10} max={100} step={5} value={form.weightage} onChange={e => setForm(p => ({ ...p, weightage: parseInt(e.target.value) || 10 }))} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving || !form.thrustArea || !form.title || !form.target}>
                {saving ? <><span className="spinner spinner-sm"></span> Saving…</> : (editGoal ? 'Update Goal' : 'Create Goal')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AchievementLogger({ goals, onUpdate }) {
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ quarter: 'Q1', year: new Date().getFullYear(), actual: '', status: 'on_track' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleLog = async () => {
    setError(''); setSaving(true);
    try {
      await goalsAPI.logAchievement(selected._id, form);
      setSelected(null);
      onUpdate();
    } catch (e) { setError(getErrorMessage(e)); }
    finally { setSaving(false); }
  };

  return (
    <>
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Goal</th><th>Target</th><th>Q1</th><th>Q2</th><th>Q3</th><th>Q4</th><th>Log</th></tr>
          </thead>
          <tbody>
            {goals.map(g => (
              <tr key={g._id}>
                <td style={{ fontWeight: 500 }}>{g.title}</td>
                <td style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>{g.target}</td>
                {['Q1','Q2','Q3','Q4'].map(q => {
                  const a = g.achievements?.find(a => a.quarter === q);
                  return (
                    <td key={q} style={{ textAlign: 'center' }}>
                      {a ? (
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>{a.actual}</div>
                          <div style={{ fontSize: 11, color: a.score >= 80 ? 'var(--success)' : a.score >= 50 ? 'var(--accent)' : 'var(--danger)' }}>{a.score}%</div>
                        </div>
                      ) : <span style={{ color: 'var(--gray-300)', fontSize: 18 }}>○</span>}
                    </td>
                  );
                })}
                <td>
                  <button className="btn btn-primary btn-sm" onClick={() => { setSelected(g); setForm(p => ({ ...p, actual: '' })); }}>Log</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setSelected(null)}>
          <div className="modal">
            <div className="modal-header">
              <h3>Log Achievement — {selected.title}</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setSelected(null)}>✕</button>
            </div>
            <div className="modal-body">
              {error && <div className="alert alert-error">{error}</div>}
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Quarter</label>
                  <select className="form-select" value={form.quarter} onChange={e => setForm(p => ({ ...p, quarter: e.target.value }))}>
                    {['Q1','Q2','Q3','Q4'].map(q => <option key={q} value={q}>{q}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Year</label>
                  <input className="form-input" type="number" value={form.year} onChange={e => setForm(p => ({ ...p, year: parseInt(e.target.value) }))} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Actual Achievement</label>
                <input className="form-input" placeholder={selected.uom === 'timeline' ? 'YYYY-MM-DD' : selected.uom === 'zero' ? '0' : '85'} value={form.actual} onChange={e => setForm(p => ({ ...p, actual: e.target.value }))} />
                <div className="form-hint">Target: <strong>{selected.target}</strong> · UoM: {selected.uom.replace(/_/g,' ')}</div>
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-select" value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                  <option value="not_started">Not Started</option>
                  <option value="on_track">On Track</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setSelected(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleLog} disabled={saving || !form.actual}>
                {saving ? <><span className="spinner spinner-sm"></span></> : 'Save Achievement'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
