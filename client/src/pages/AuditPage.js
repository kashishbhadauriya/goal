import React, { useState, useEffect } from 'react';
import { reportsAPI, usersAPI } from '../utils/api';
import { formatDate, getErrorMessage } from '../utils/helpers';

export default function AuditPage() {
  const [entries, setEntries] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({ employeeId: '', cycle: new Date().getFullYear().toString() });

  const fetchAudit = async () => {
    setLoading(true); setError('');
    try {
      const params = { cycle: filters.cycle };
      if (filters.employeeId) params.employeeId = filters.employeeId;
      const res = await reportsAPI.audit(params);
      setEntries(res.data);
    } catch (e) { setError(getErrorMessage(e)); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    usersAPI.getAll({ role: 'employee' }).then(r => setEmployees(r.data)).catch(() => {});
  }, []);

  useEffect(() => { fetchAudit(); }, [filters]);

  const fieldLabel = (field) => {
    const map = { isLocked: 'Lock Status', target: 'Target', weightage: 'Weightage', title: 'Title', status: 'Status', thrustArea: 'Thrust Area', description: 'Description' };
    return map[field] || field;
  };

  const changeColor = (field) => {
    if (field === 'isLocked') return 'var(--accent)';
    if (field === 'target' || field === 'weightage') return 'var(--primary)';
    return 'var(--gray-600)';
  };

  return (
    <div>
      <div className="page-header">
        <h1>Audit Trail</h1>
        <p>Complete log of all changes made to goals after lock date — who changed what and when</p>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Cycle Year</label>
            <select className="form-select" value={filters.cycle} onChange={e => setFilters(p => ({ ...p, cycle: e.target.value }))}>
              {[2023, 2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Employee</label>
            <select className="form-select" value={filters.employeeId} onChange={e => setFilters(p => ({ ...p, employeeId: e.target.value }))}>
              <option value="">All employees</option>
              {employees.map(e => <option key={e._id} value={e._id}>{e.name}</option>)}
            </select>
          </div>
          <button className="btn btn-secondary" onClick={() => setFilters({ employeeId: '', cycle: new Date().getFullYear().toString() })}>Clear</button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid-3" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card">
          <div className="stat-label">Total Changes</div>
          <div className="stat-value">{entries.length}</div>
          <div className="stat-sub">Post-lock modifications</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Fields Modified</div>
          <div className="stat-value">{[...new Set(entries.map(e => e.field))].length}</div>
          <div className="stat-sub">Distinct fields changed</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Changed By</div>
          <div className="stat-value">{[...new Set(entries.map(e => e.changedBy?.name).filter(Boolean))].length}</div>
          <div className="stat-sub">Unique users</div>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div className="loading-center"><div className="spinner"></div></div>
      ) : entries.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div style={{ fontSize: 48, marginBottom: '1rem' }}>▣</div>
            <p style={{ fontWeight: 600, color: 'var(--gray-700)' }}>No audit entries found</p>
            <p>Changes to locked goals will appear here</p>
          </div>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Employee</th>
                <th>Goal</th>
                <th>Cycle</th>
                <th>Field Changed</th>
                <th>Old Value</th>
                <th>New Value</th>
                <th>Changed By</th>
                <th>Reason</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, i) => (
                <tr key={i}>
                  <td style={{ whiteSpace: 'nowrap', fontSize: 12, fontFamily: 'var(--font-mono)' }}>
                    {formatDate(entry.changedAt)}
                    <div style={{ color: 'var(--gray-400)', fontSize: 11 }}>
                      {new Date(entry.changedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{entry.employee?.name || '—'}</div>
                    <div style={{ fontSize: 11, color: 'var(--gray-500)' }}>{entry.employee?.department}</div>
                  </td>
                  <td style={{ fontWeight: 500, maxWidth: 180 }}>{entry.goalTitle}</td>
                  <td><span className="tag">{entry.cycle}</span></td>
                  <td>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600, color: changeColor(entry.field), background: 'var(--gray-50)', padding: '2px 8px', borderRadius: 4 }}>
                      {fieldLabel(entry.field)}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--danger)', background: 'var(--danger-light)', padding: '2px 8px', borderRadius: 4 }}>
                      {String(entry.oldValue ?? '—')}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--success)', background: 'var(--success-light)', padding: '2px 8px', borderRadius: 4 }}>
                      {String(entry.newValue ?? '—')}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{entry.changedBy?.name || '—'}</div>
                    <div style={{ fontSize: 11, color: 'var(--gray-500)', textTransform: 'capitalize' }}>{entry.changedBy?.role}</div>
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--gray-600)', maxWidth: 180, fontStyle: 'italic' }}>
                    {entry.reason || '—'}
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
