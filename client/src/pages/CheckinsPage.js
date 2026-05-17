import React, { useState, useEffect } from 'react';
import { checkinsAPI, usersAPI, goalsAPI } from '../utils/api';
import { QUARTER_LABELS, scoreColor, formatDate, getErrorMessage } from '../utils/helpers';
import { useAuth } from '../context/AuthContext';

const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'];

export default function CheckinsPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState('conduct');
  const [employees, setEmployees] = useState([]);
  const [checkins, setCheckins] = useState([]);
  const [dashboard, setDashboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());
  const [quarterFilter, setQuarterFilter] = useState('');

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [uRes, cRes, dRes] = await Promise.all([
        usersAPI.getAll({ role: 'employee' }),
        checkinsAPI.get({ year, ...(quarterFilter ? { quarter: quarterFilter } : {}) }),
        checkinsAPI.dashboard({ year }),
      ]);
      setEmployees(uRes.data);
      setCheckins(cRes.data);
      setDashboard(dRes.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, [year, quarterFilter]);

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1>Check-ins</h1>
            <p>Conduct quarterly reviews and track team progress</p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <select className="form-select" style={{ width: 100 }} value={year} onChange={e => setYear(parseInt(e.target.value))}>
              {[2023, 2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <select className="form-select" style={{ width: 160 }} value={quarterFilter} onChange={e => setQuarterFilter(e.target.value)}>
              <option value="">All Quarters</option>
              {QUARTERS.map(q => <option key={q} value={q}>{QUARTER_LABELS[q]}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="tabs">
        {[
          { key: 'conduct', label: '📋 Conduct Check-in' },
          { key: 'history', label: '📜 History' },
          { key: 'dashboard', label: '📊 Completion Dashboard' },
        ].map(t => (
          <button key={t.key} className={`tab-btn ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="loading-center"><div className="spinner"></div></div>
      ) : (
        <>
          {tab === 'conduct' && <ConductTab employees={employees} year={year} onDone={fetchAll} />}
          {tab === 'history' && <HistoryTab checkins={checkins} />}
          {tab === 'dashboard' && <DashboardTab dashboard={dashboard} year={year} quarterFilter={quarterFilter} />}
        </>
      )}
    </div>
  );
}

/* ─── Conduct Tab ─── */
function ConductTab({ employees, year, onDone }) {
  const [selected, setSelected] = useState(null);
  const [goals, setGoals] = useState([]);
  const [quarter, setQuarter] = useState('Q1');
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [goalsLoading, setGoalsLoading] = useState(false);

  const handleSelectEmployee = async (emp) => {
    setSelected(emp);
    setGoals([]);
    setComment('');
    setError('');
    setSuccess('');
    setGoalsLoading(true);
    try {
      const res = await goalsAPI.getTeam({ cycle: year.toString(), employeeId: emp._id, status: 'approved' });
      setGoals(res.data);
    } catch (e) { console.error(e); }
    finally { setGoalsLoading(false); }
  };

  const handleSubmit = async () => {
    setError(''); setSaving(true);
    try {
      await checkinsAPI.create({ employeeId: selected._id, quarter, year, comment });
      setSuccess(`Check-in completed for ${selected.name} — ${quarter} ${year}`);
      setSelected(null);
      setGoals([]);
      onDone();
    } catch (e) { setError(getErrorMessage(e)); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '1.5rem' }}>
      {/* Employee list */}
      <div>
        <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--gray-600)', marginBottom: '0.75rem', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Select Employee</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: 520, overflowY: 'auto' }}>
          {employees.length === 0 && <p style={{ fontSize: 13, color: 'var(--gray-400)' }}>No employees found</p>}
          {employees.map(emp => (
            <button key={emp._id} onClick={() => handleSelectEmployee(emp)} style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              padding: '0.75rem 1rem', border: '1.5px solid',
              borderColor: selected?._id === emp._id ? 'var(--primary)' : 'var(--gray-200)',
              borderRadius: 8, background: selected?._id === emp._id ? 'var(--primary-light)' : 'white',
              cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
            }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 600, fontSize: 14, flexShrink: 0 }}>
                {emp.name?.[0]}
              </div>
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--gray-900)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{emp.name}</div>
                <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>{emp.department || emp.email}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Check-in panel */}
      <div>
        {!selected ? (
          <div className="card" style={{ height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="empty-state">
              <div style={{ fontSize: 48, marginBottom: '1rem' }}>◈</div>
              <p style={{ fontWeight: 600, color: 'var(--gray-600)' }}>Select an employee to begin</p>
              <p style={{ fontSize: 13 }}>View their goals and log a quarterly check-in</p>
            </div>
          </div>
        ) : (
          <div className="card">
            {success && <div className="alert alert-success" style={{ marginBottom: '1rem' }}>{success}</div>}
            {error && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid var(--gray-100)' }}>
              <div>
                <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--gray-900)' }}>{selected.name}</h3>
                <div style={{ fontSize: 13, color: 'var(--gray-500)' }}>{selected.department} · {selected.employeeId || selected.email}</div>
              </div>
              <select className="form-select" style={{ width: 200 }} value={quarter} onChange={e => setQuarter(e.target.value)}>
                {QUARTERS.map(q => <option key={q} value={q}>{QUARTER_LABELS[q]}</option>)}
              </select>
            </div>

            {/* Goals planned vs actual */}
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--gray-600)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Planned vs. Achievement</div>
              {goalsLoading ? (
                <div className="loading-center" style={{ padding: '1.5rem' }}><div className="spinner"></div></div>
              ) : goals.length === 0 ? (
                <div className="alert alert-info">No approved goals found for this employee in {year}.</div>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Goal</th>
                        <th>Target</th>
                        <th>Actual ({quarter})</th>
                        <th>Score</th>
                        <th>Status</th>
                        <th>Weight</th>
                      </tr>
                    </thead>
                    <tbody>
                      {goals.map(g => {
                        const ach = g.achievements?.find(a => a.quarter === quarter && a.year === year);
                        const score = ach?.score ?? 0;
                        return (
                          <tr key={g._id}>
                            <td>
                              <div style={{ fontWeight: 600, fontSize: 14 }}>{g.title}</div>
                              <div style={{ fontSize: 11, color: 'var(--gray-500)' }}>{g.thrustArea}</div>
                            </td>
                            <td style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>{g.target}</td>
                            <td style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600 }}>
                              {ach ? ach.actual : <span style={{ color: 'var(--gray-300)' }}>—</span>}
                            </td>
                            <td>
                              {ach ? (
                                <span style={{ fontWeight: 700, color: scoreColor(score) }}>{score}%</span>
                              ) : <span style={{ color: 'var(--gray-300)' }}>—</span>}
                            </td>
                            <td>
                              <span className={`badge badge-${ach?.status || 'not_started'}`}>
                                {ach?.status?.replace('_', ' ') || 'not started'}
                              </span>
                            </td>
                            <td style={{ fontWeight: 600 }}>{g.weightage}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Weighted score summary */}
            {goals.length > 0 && (() => {
              const approved = goals.filter(g => g.achievements?.some(a => a.quarter === quarter && a.year === year));
              const wScore = approved.reduce((s, g) => {
                const a = g.achievements.find(a => a.quarter === quarter && a.year === year);
                return s + (a?.score || 0) * g.weightage / 100;
              }, 0);
              return (
                <div style={{ background: 'var(--gray-50)', borderRadius: 8, padding: '0.75rem 1rem', marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--gray-700)' }}>Weighted Score ({quarter})</span>
                  <span style={{ fontSize: 1.5 + 'rem', fontFamily: 'var(--font-display)', color: scoreColor(wScore), fontWeight: 700 }}>
                    {Math.round(wScore)}%
                  </span>
                </div>
              );
            })()}

            {/* Comment */}
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label">Check-in Comment *</label>
              <textarea
                className="form-textarea"
                rows={4}
                placeholder={`Document your discussion with ${selected.name} for ${quarter} ${year}. Include key observations, challenges, and next steps…`}
                value={comment}
                onChange={e => setComment(e.target.value)}
                style={{ resize: 'vertical' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button className="btn btn-secondary" onClick={() => setSelected(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSubmit} disabled={saving || !comment.trim()}>
                {saving ? <><span className="spinner spinner-sm"></span> Saving…</> : '✓ Complete Check-in'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── History Tab ─── */
function HistoryTab({ checkins }) {
  const [expanded, setExpanded] = useState(null);

  if (checkins.length === 0) {
    return (
      <div className="card">
        <div className="empty-state">
          <div style={{ fontSize: 48, marginBottom: '1rem' }}>📜</div>
          <p>No check-ins recorded yet</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {checkins.map((c, i) => (
        <div key={c._id || i} className="card" style={{ padding: '1rem 1.25rem' }}>
          <div
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
            onClick={() => setExpanded(expanded === i ? null : i)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 600, flexShrink: 0 }}>
                {c.employee?.name?.[0]}
              </div>
              <div>
                <div style={{ fontWeight: 600, color: 'var(--gray-900)' }}>{c.employee?.name}</div>
                <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>{c.employee?.department}</div>
              </div>
              <span className="badge badge-approved" style={{ marginLeft: 4 }}>{c.quarter} {c.year}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
              <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>By {c.manager?.name} · {formatDate(c.completedAt)}</div>
              <span style={{ color: 'var(--gray-400)', fontSize: 16 }}>{expanded === i ? '▲' : '▼'}</span>
            </div>
          </div>

          {expanded === i && (
            <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--gray-100)' }}>
              {c.comment && (
                <div style={{ background: 'var(--gray-50)', borderRadius: 8, padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: 14, color: 'var(--gray-700)', fontStyle: 'italic', borderLeft: '3px solid var(--primary)' }}>
                  "{c.comment}"
                </div>
              )}
              {c.goalSummary?.length > 0 && (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr><th>Goal</th><th>Planned</th><th>Actual</th><th>Score</th><th>Status</th></tr>
                    </thead>
                    <tbody>
                      {c.goalSummary.map((gs, j) => (
                        <tr key={j}>
                          <td style={{ fontWeight: 500 }}>{gs.goal?.title || 'Goal'}</td>
                          <td style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>{gs.planned ?? '—'}</td>
                          <td style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600 }}>{gs.actual ?? '—'}</td>
                          <td><span style={{ fontWeight: 700, color: scoreColor(gs.score) }}>{gs.score ?? 0}%</span></td>
                          <td><span className={`badge badge-${gs.status || 'not_started'}`}>{(gs.status || 'not started').replace('_', ' ')}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ─── Dashboard Tab ─── */
function DashboardTab({ dashboard, year, quarterFilter }) {
  const quarters = quarterFilter ? [quarterFilter] : QUARTERS;
  const totalCompleted = dashboard.reduce((s, d) => s + d.completedQuarters.length, 0);
  const totalPossible = dashboard.length * quarters.length;
  const overallRate = totalPossible > 0 ? Math.round((totalCompleted / totalPossible) * 100) : 0;

  return (
    <div>
      {/* Summary stats */}
      <div className="grid-4" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card">
          <div className="stat-label">Total Employees</div>
          <div className="stat-value">{dashboard.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Check-ins Done</div>
          <div className="stat-value" style={{ color: 'var(--success)' }}>{totalCompleted}</div>
          <div className="stat-sub">of {totalPossible} required</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Pending</div>
          <div className="stat-value" style={{ color: 'var(--warning)' }}>{totalPossible - totalCompleted}</div>
          <div className="stat-sub">check-ins outstanding</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Overall Rate</div>
          <div className="stat-value" style={{ color: scoreColor(overallRate) }}>{overallRate}%</div>
          <div className="stat-sub">completion rate</div>
        </div>
      </div>

      {/* Overall progress bar */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontWeight: 600, fontSize: 14 }}>Overall Completion — {year}</span>
          <span style={{ fontWeight: 700, color: scoreColor(overallRate) }}>{overallRate}%</span>
        </div>
        <div className="progress-bar" style={{ height: 12 }}>
          <div className="progress-fill" style={{ width: `${overallRate}%`, background: scoreColor(overallRate) }}></div>
        </div>
      </div>

      {/* Per-employee table */}
      {dashboard.length === 0 ? (
        <div className="card"><div className="empty-state"><p>No employees found</p></div></div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Employee</th>
                <th>Department</th>
                {quarters.map(q => <th key={q} style={{ textAlign: 'center' }}>{q}</th>)}
                <th>Rate</th>
              </tr>
            </thead>
            <tbody>
              {dashboard.map((d, i) => (
                <tr key={i}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{d.employee.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>{d.employee.employeeId || d.employee.email}</div>
                  </td>
                  <td><span className="tag">{d.employee.department || '—'}</span></td>
                  {quarters.map(q => (
                    <td key={q} style={{ textAlign: 'center' }}>
                      {d.completedQuarters.includes(q)
                        ? <span style={{ color: 'var(--success)', fontSize: 18 }}>✓</span>
                        : <span style={{ color: 'var(--gray-300)', fontSize: 18 }}>○</span>
                      }
                    </td>
                  ))}
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 120 }}>
                      <div className="progress-bar" style={{ flex: 1 }}>
                        <div className="progress-fill" style={{ width: `${d.completionRate}%`, background: scoreColor(d.completionRate) }}></div>
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 700, color: scoreColor(d.completionRate), width: 38, textAlign: 'right' }}>{d.completionRate}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
