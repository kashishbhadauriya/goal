import React, { useState, useEffect } from 'react';
import { goalsAPI, usersAPI } from '../utils/api';
import { getErrorMessage, formatDate } from '../utils/helpers';
import { useAuth } from '../context/AuthContext';

export default function TeamGoalsPage() {
  const { user } = useAuth();
  const [goals, setGoals] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ status: 'submitted', employeeId: '' });
  const [cycle, setCycle] = useState(new Date().getFullYear().toString());
  const [approving, setApproving] = useState({});
  const [expandedEmp, setExpandedEmp] = useState(null);
  const [approvalModal, setApprovalModal] = useState(null); // { goal, action }
  const [approvalForm, setApprovalForm] = useState({ managerNote: '', target: '', weightage: '' });
  const [approvalError, setApprovalError] = useState('');
  const [sharedModal, setSharedModal] = useState(false);
  const [sharedForm, setSharedForm] = useState({ thrustArea: '', title: '', description: '', uom: 'numeric_min', target: '', weightage: 10, employeeIds: [] });
  const [sharedError, setSharedError] = useState('');

  const fetch = async () => {
    setLoading(true);
    try {
      const params = { cycle, ...filter };
      if (!params.employeeId) delete params.employeeId;
      if (!params.status) delete params.status;
      const [gRes, uRes] = await Promise.all([
        goalsAPI.getTeam(params),
        usersAPI.getAll({ role: 'employee' }),
      ]);
      setGoals(gRes.data);
      setEmployees(uRes.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, [cycle, filter]);

  // Group goals by employee
  const grouped = goals.reduce((acc, g) => {
    const empId = g.employee?._id;
    if (!acc[empId]) acc[empId] = { employee: g.employee, goals: [] };
    acc[empId].goals.push(g);
    return acc;
  }, {});

  const openApproval = (goal, action) => {
    setApprovalModal({ goal, action });
    setApprovalForm({ managerNote: goal.managerNote || '', target: goal.target, weightage: goal.weightage });
    setApprovalError('');
  };

  const handleApprove = async () => {
    setApprovalError('');
    try {
      await goalsAPI.approve(approvalModal.goal._id, {
        action: approvalModal.action,
        managerNote: approvalForm.managerNote,
        target: approvalForm.target || undefined,
        weightage: approvalForm.weightage || undefined,
      });
      setApprovalModal(null);
      fetch();
    } catch (e) { setApprovalError(getErrorMessage(e)); }
  };

  const handleSharedPush = async () => {
    setSharedError('');
    if (sharedForm.employeeIds.length === 0) { setSharedError('Select at least one employee'); return; }
    try {
      await goalsAPI.pushShared({ ...sharedForm, cycle });
      setSharedModal(false);
      fetch();
    } catch (e) { setSharedError(getErrorMessage(e)); }
  };

  const toggleEmpId = (id) => {
    setSharedForm(p => ({
      ...p,
      employeeIds: p.employeeIds.includes(id) ? p.employeeIds.filter(x => x !== id) : [...p.employeeIds, id],
    }));
  };

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1>Team Goals</h1>
            <p>Review, approve, and manage your team's performance goals</p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <select className="form-select" style={{ width: 100 }} value={cycle} onChange={e => setCycle(e.target.value)}>
              {[2023,2024,2025,2026].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            {user.role === 'admin' && (
              <button className="btn btn-primary" onClick={() => setSharedModal(true)}>🔗 Push Shared Goal</button>
            )}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div>
            <label className="form-label" style={{ marginBottom: 4 }}>Status</label>
            <select className="form-select" value={filter.status} onChange={e => setFilter(p => ({ ...p, status: e.target.value }))}>
              <option value="">All</option>
              <option value="submitted">Submitted</option>
              <option value="approved">Approved</option>
              <option value="returned">Returned</option>
              <option value="draft">Draft</option>
            </select>
          </div>
          <div>
            <label className="form-label" style={{ marginBottom: 4 }}>Employee</label>
            <select className="form-select" value={filter.employeeId} onChange={e => setFilter(p => ({ ...p, employeeId: e.target.value }))}>
              <option value="">All employees</option>
              {employees.map(e => <option key={e._id} value={e._id}>{e.name}</option>)}
            </select>
          </div>
          <button className="btn btn-secondary" style={{ marginTop: 20 }} onClick={() => setFilter({ status: '', employeeId: '' })}>Clear</button>
        </div>
      </div>

      {loading ? (
        <div className="loading-center"><div className="spinner"></div></div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="card"><div className="empty-state"><p>No goals found for selected filters</p></div></div>
      ) : (
        Object.values(grouped).map(({ employee, goals: empGoals }) => {
          const totalW = empGoals.reduce((s, g) => s + g.weightage, 0);
          const isExpanded = expandedEmp === employee?._id;
          const pendingCount = empGoals.filter(g => g.status === 'submitted').length;
          return (
            <div key={employee?._id} className="card" style={{ marginBottom: '1rem' }}>
              {/* Employee header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => setExpandedEmp(isExpanded ? null : employee?._id)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 600, fontSize: 15 }}>
                    {employee?.name?.[0]}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--gray-900)' }}>{employee?.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>{employee?.department} · {employee?.employeeId || employee?.email}</div>
                  </div>
                  {pendingCount > 0 && <span className="badge badge-submitted">{pendingCount} pending</span>}
                </div>
                <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>Total Weightage</div>
                    <div style={{ fontWeight: 700, color: totalW === 100 ? 'var(--success)' : 'var(--accent)' }}>{totalW}%</div>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>{empGoals.length} goals</div>
                  <span style={{ color: 'var(--gray-400)', fontSize: 18 }}>{isExpanded ? '▲' : '▼'}</span>
                </div>
              </div>

              {/* Goals table */}
              {isExpanded && (
                <div style={{ marginTop: '1.25rem' }}>
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr><th>Goal Title</th><th>Thrust Area</th><th>UoM</th><th>Target</th><th>Weight</th><th>Status</th><th>Actions</th></tr>
                      </thead>
                      <tbody>
                        {empGoals.map(g => (
                          <tr key={g._id}>
                            <td>
                              <div style={{ fontWeight: 600 }}>{g.title}</div>
                              {g.description && <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>{g.description}</div>}
                              {g.managerNote && <div style={{ fontSize: 12, color: 'var(--warning)', marginTop: 2 }}>📝 {g.managerNote}</div>}
                            </td>
                            <td><span className="tag">{g.thrustArea}</span></td>
                            <td><span className={`tag uom-${g.uom}`}>{g.uom.replace(/_/g,' ')}</span></td>
                            <td style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>{g.target}</td>
                            <td style={{ fontWeight: 700 }}>{g.weightage}%</td>
                            <td><span className={`badge badge-${g.status}`}>{g.status}</span></td>
                            <td>
                              {g.status === 'submitted' && (
                                <div style={{ display: 'flex', gap: 4 }}>
                                  <button className="btn btn-success btn-sm" onClick={() => openApproval(g, 'approve')}>✓ Approve</button>
                                  <button className="btn btn-danger btn-sm" onClick={() => openApproval(g, 'return')}>↩ Return</button>
                                </div>
                              )}
                              {g.status === 'approved' && g.isLocked && user.role === 'admin' && (
                                <button className="btn btn-secondary btn-sm" onClick={() => goalsAPI.unlock(g._id, 'Admin unlock').then(fetch)}>🔓 Unlock</button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {/* Bulk approve for this employee */}
                  {empGoals.some(g => g.status === 'submitted') && totalW === 100 && (
                    <div style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'flex-end' }}>
                      <button className="btn btn-success" onClick={async () => {
                        const submitted = empGoals.filter(g => g.status === 'submitted');
                        for (const g of submitted) await goalsAPI.approve(g._id, { action: 'approve' });
                        fetch();
                      }}>✓ Approve All for {employee?.name?.split(' ')[0]}</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })
      )}

      {/* Approval Modal */}
      {approvalModal && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setApprovalModal(null)}>
          <div className="modal">
            <div className="modal-header">
              <h3>{approvalModal.action === 'approve' ? '✓ Approve Goal' : '↩ Return for Rework'}</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setApprovalModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              {approvalError && <div className="alert alert-error">{approvalError}</div>}
              <div className="alert alert-info" style={{ marginBottom: '1rem' }}>
                <strong>{approvalModal.goal.title}</strong> — {approvalModal.goal.weightage}% · Target: {approvalModal.goal.target}
              </div>
              {approvalModal.action === 'approve' && (
                <>
                  <div className="grid-2">
                    <div className="form-group">
                      <label className="form-label">Edit Target (optional)</label>
                      <input className="form-input" value={approvalForm.target} onChange={e => setApprovalForm(p => ({ ...p, target: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Edit Weightage (optional)</label>
                      <input className="form-input" type="number" min={10} value={approvalForm.weightage} onChange={e => setApprovalForm(p => ({ ...p, weightage: parseInt(e.target.value) }))} />
                    </div>
                  </div>
                </>
              )}
              <div className="form-group">
                <label className="form-label">{approvalModal.action === 'approve' ? 'Manager Note (optional)' : 'Reason for Return *'}</label>
                <textarea className="form-textarea" rows={3} placeholder="Add a note or reason..." value={approvalForm.managerNote} onChange={e => setApprovalForm(p => ({ ...p, managerNote: e.target.value }))} style={{ resize: 'vertical' }} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setApprovalModal(null)}>Cancel</button>
              <button className={`btn ${approvalModal.action === 'approve' ? 'btn-success' : 'btn-danger'}`} onClick={handleApprove}>
                {approvalModal.action === 'approve' ? '✓ Confirm Approval' : '↩ Return Goal'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Push Shared Goal Modal */}
      {sharedModal && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setSharedModal(false)}>
          <div className="modal" style={{ maxWidth: 640 }}>
            <div className="modal-header">
              <h3>🔗 Push Shared Goal</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setSharedModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              {sharedError && <div className="alert alert-error">{sharedError}</div>}
              <div className="alert alert-info">Shared goals are locked after assignment. Recipients can only adjust their own weightage.</div>
              <div className="form-group">
                <label className="form-label">Goal Title</label>
                <input className="form-input" value={sharedForm.title} onChange={e => setSharedForm(p => ({ ...p, title: e.target.value }))} />
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Thrust Area</label>
                  <input className="form-input" value={sharedForm.thrustArea} onChange={e => setSharedForm(p => ({ ...p, thrustArea: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">UoM</label>
                  <select className="form-select" value={sharedForm.uom} onChange={e => setSharedForm(p => ({ ...p, uom: e.target.value }))}>
                    <option value="numeric_min">Numeric (Higher Better)</option>
                    <option value="numeric_max">Numeric (Lower Better)</option>
                    <option value="timeline">Timeline</option>
                    <option value="zero">Zero-Based</option>
                  </select>
                </div>
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Target</label>
                  <input className="form-input" value={sharedForm.target} onChange={e => setSharedForm(p => ({ ...p, target: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Default Weightage</label>
                  <input className="form-input" type="number" min={10} value={sharedForm.weightage} onChange={e => setSharedForm(p => ({ ...p, weightage: parseInt(e.target.value) }))} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Assign to Employees</label>
                <div style={{ border: '1.5px solid var(--gray-200)', borderRadius: 6, padding: '0.75rem', maxHeight: 200, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {employees.map(e => (
                    <label key={e._id} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14 }}>
                      <input type="checkbox" checked={sharedForm.employeeIds.includes(e._id)} onChange={() => toggleEmpId(e._id)} />
                      {e.name} <span style={{ color: 'var(--gray-400)', fontSize: 12 }}>({e.department})</span>
                    </label>
                  ))}
                </div>
                <div className="form-hint">{sharedForm.employeeIds.length} selected</div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setSharedModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSharedPush}>🔗 Push to Employees</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
