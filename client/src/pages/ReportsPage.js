import React, { useState, useEffect } from 'react';
import { reportsAPI, usersAPI } from '../utils/api';
import { scoreColor, scoreBackground, QUARTER_LABELS, downloadBlob, getErrorMessage } from '../utils/helpers';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';

const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'];

export default function ReportsPage() {
  const [tab, setTab] = useState('achievement');
  const [data, setData] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    cycle: new Date().getFullYear().toString(),
    year: new Date().getFullYear(),
    quarter: '',
    department: '',
  });

  const departments = [...new Set(employees.map(e => e.department).filter(Boolean))];

  const fetchReport = async () => {
    setLoading(true); setError('');
    try {
      const res = await reportsAPI.achievement({
        cycle: filters.cycle,
        year: filters.year,
        quarter: filters.quarter || undefined,
        department: filters.department || undefined,
      });
      setData(res.data);
    } catch (e) { setError(getErrorMessage(e)); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    usersAPI.getAll({ role: 'employee' }).then(r => setEmployees(r.data)).catch(() => {});
  }, []);

  useEffect(() => { fetchReport(); }, [filters.cycle, filters.year, filters.quarter, filters.department]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await reportsAPI.exportCsv({ cycle: filters.cycle, year: filters.year });
      downloadBlob(res.data, `achievement_report_${filters.cycle}.csv`);
    } catch (e) { alert(getErrorMessage(e)); }
    finally { setExporting(false); }
  };

  // Aggregate chart data
  const chartData = data.map(emp => {
    const avgScore = emp.goals.length > 0
      ? Math.round(emp.goals.reduce((s, g) => {
          const q = filters.quarter || 'Q4';
          const a = g.achievements.find(a => a.quarter === q);
          return s + (a?.score || 0);
        }, 0) / emp.goals.length)
      : 0;
    return { name: emp.employee.name.split(' ')[0], score: avgScore, overall: emp.overallScore };
  });

  // Per-employee overall score summary
  const summaryCards = data.slice(0, 6);

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1>Reports</h1>
            <p>Achievement analytics, team performance, and exportable data</p>
          </div>
          <button className="btn btn-primary" onClick={handleExport} disabled={exporting}>
            {exporting ? <><span className="spinner spinner-sm"></span> Exporting…</> : '⬇ Export CSV'}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Cycle Year</label>
            <select className="form-select" value={filters.cycle} onChange={e => setFilters(p => ({ ...p, cycle: e.target.value, year: parseInt(e.target.value) }))}>
              {[2023, 2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Quarter</label>
            <select className="form-select" value={filters.quarter} onChange={e => setFilters(p => ({ ...p, quarter: e.target.value }))}>
              <option value="">All Quarters</option>
              {QUARTERS.map(q => <option key={q} value={q}>{q}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Department</label>
            <select className="form-select" value={filters.department} onChange={e => setFilters(p => ({ ...p, department: e.target.value }))}>
              <option value="">All Departments</option>
              {departments.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <button className="btn btn-secondary" onClick={() => setFilters({ cycle: new Date().getFullYear().toString(), year: new Date().getFullYear(), quarter: '', department: '' })}>
            Clear
          </button>
        </div>
      </div>

      <div className="tabs">
        {[
          { key: 'achievement', label: '📊 Achievement Report' },
          { key: 'charts', label: '📈 Charts' },
        ].map(t => (
          <button key={t.key} className={`tab-btn ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div className="loading-center"><div className="spinner"></div></div>
      ) : (
        <>
          {tab === 'achievement' && <AchievementTab data={data} filters={filters} />}
          {tab === 'charts' && <ChartsTab data={data} chartData={chartData} filters={filters} />}
        </>
      )}
    </div>
  );
}

/* ─── Achievement Tab ─── */
function AchievementTab({ data, filters }) {
  const [expandedEmp, setExpandedEmp] = useState(null);
  const quarter = filters.quarter;
  const displayQuarters = quarter ? [quarter] : QUARTERS;

  if (data.length === 0) {
    return (
      <div className="card"><div className="empty-state"><div style={{ fontSize: 48, marginBottom: '1rem' }}>▦</div><p>No data found for selected filters</p></div></div>
    );
  }

  // Summary row at top
  const totalEmployees = data.length;
  const avgOverall = Math.round(data.reduce((s, d) => s + d.overallScore, 0) / totalEmployees);

  return (
    <div>
      {/* Summary cards */}
      <div className="grid-4" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card">
          <div className="stat-label">Employees</div>
          <div className="stat-value">{totalEmployees}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Avg Overall Score</div>
          <div className="stat-value" style={{ color: scoreColor(avgOverall) }}>{avgOverall}%</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">High Performers</div>
          <div className="stat-value" style={{ color: 'var(--success)' }}>{data.filter(d => d.overallScore >= 80).length}</div>
          <div className="stat-sub">Score ≥ 80%</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Needs Attention</div>
          <div className="stat-value" style={{ color: 'var(--danger)' }}>{data.filter(d => d.overallScore < 50).length}</div>
          <div className="stat-sub">Score &lt; 50%</div>
        </div>
      </div>

      {/* Per-employee expandable rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {data.map((d, i) => {
          const isExp = expandedEmp === i;
          return (
            <div key={i} className="card" style={{ padding: '1rem 1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => setExpandedEmp(isExp ? null : i)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: scoreBackground(d.overallScore), display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: scoreColor(d.overallScore), fontSize: 15 }}>
                    {d.employee.name?.[0]}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--gray-900)' }}>{d.employee.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>{d.employee.department} · {d.employee.manager || '—'}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 11, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Overall</div>
                    <div style={{ fontSize: 1.4 + 'rem', fontFamily: 'var(--font-display)', color: scoreColor(d.overallScore), fontWeight: 700 }}>{d.overallScore}%</div>
                  </div>
                  <div style={{ textAlign: 'center', minWidth: 100 }}>
                    <div className="progress-bar" style={{ marginBottom: 4 }}>
                      <div className="progress-fill" style={{ width: `${d.overallScore}%`, background: scoreColor(d.overallScore) }}></div>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--gray-400)' }}>{d.goals.length} goals</div>
                  </div>
                  <span style={{ color: 'var(--gray-400)', fontSize: 16 }}>{isExp ? '▲' : '▼'}</span>
                </div>
              </div>

              {isExp && (
                <div style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid var(--gray-100)' }}>
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Goal</th>
                          <th>Thrust Area</th>
                          <th>UoM</th>
                          <th>Target</th>
                          <th>Weight</th>
                          {displayQuarters.map(q => <th key={q} style={{ textAlign: 'center' }}>{q} Actual</th>)}
                          {displayQuarters.map(q => <th key={`s-${q}`} style={{ textAlign: 'center' }}>{q} Score</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {d.goals.map((g, j) => (
                          <tr key={j}>
                            <td style={{ fontWeight: 600, maxWidth: 200 }}>{g.title}</td>
                            <td><span className="tag">{g.thrustArea}</span></td>
                            <td><span className={`tag uom-${g.uom}`}>{g.uom.replace(/_/g, ' ')}</span></td>
                            <td style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>{g.target}</td>
                            <td style={{ fontWeight: 600 }}>{g.weightage}%</td>
                            {displayQuarters.map(q => {
                              const a = g.achievements.find(a => a.quarter === q);
                              return <td key={q} style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 13 }}>{a?.actual ?? <span style={{ color: 'var(--gray-300)' }}>—</span>}</td>;
                            })}
                            {displayQuarters.map(q => {
                              const a = g.achievements.find(a => a.quarter === q);
                              const sc = a?.score;
                              return (
                                <td key={`s-${q}`} style={{ textAlign: 'center' }}>
                                  {sc !== undefined
                                    ? <span style={{ fontWeight: 700, color: scoreColor(sc) }}>{sc}%</span>
                                    : <span style={{ color: 'var(--gray-300)' }}>—</span>}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Charts Tab ─── */
function ChartsTab({ data, chartData, filters }) {
  // Thrust area breakdown
  const thrustMap = {};
  data.forEach(emp => {
    emp.goals.forEach(g => {
      if (!thrustMap[g.thrustArea]) thrustMap[g.thrustArea] = { name: g.thrustArea, count: 0, totalWeight: 0 };
      thrustMap[g.thrustArea].count++;
      thrustMap[g.thrustArea].totalWeight += g.weightage;
    });
  });
  const thrustData = Object.values(thrustMap).sort((a, b) => b.count - a.count).slice(0, 8);

  // Score distribution
  const dist = [
    { range: '< 50%', count: data.filter(d => d.overallScore < 50).length, fill: 'var(--danger)' },
    { range: '50–70%', count: data.filter(d => d.overallScore >= 50 && d.overallScore < 70).length, fill: 'var(--accent)' },
    { range: '70–90%', count: data.filter(d => d.overallScore >= 70 && d.overallScore < 90).length, fill: 'var(--info)' },
    { range: '≥ 90%', count: data.filter(d => d.overallScore >= 90).length, fill: 'var(--success)' },
  ];

  if (data.length === 0) {
    return <div className="card"><div className="empty-state"><p>No data for charts</p></div></div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Overall scores bar chart */}
      <div className="card">
        <h3 style={{ marginBottom: '1.25rem' }}>Overall Score by Employee</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-100)" />
            <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--gray-500)' }} angle={-35} textAnchor="end" interval={0} />
            <YAxis tick={{ fontSize: 12, fill: 'var(--gray-500)' }} domain={[0, 100]} unit="%" />
            <Tooltip formatter={(v) => `${v}%`} contentStyle={{ borderRadius: 8, border: '1px solid var(--gray-200)', fontSize: 13 }} />
            <Legend />
            <Bar dataKey="overall" name="Overall Score" fill="var(--primary)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid-2">
        {/* Score distribution */}
        <div className="card">
          <h3 style={{ marginBottom: '1.25rem' }}>Score Distribution</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={dist} margin={{ top: 4, right: 16, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-100)" />
              <XAxis dataKey="range" tick={{ fontSize: 12, fill: 'var(--gray-500)' }} />
              <YAxis tick={{ fontSize: 12, fill: 'var(--gray-500)' }} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid var(--gray-200)', fontSize: 13 }} />
              <Bar dataKey="count" name="Employees" radius={[4, 4, 0, 0]}>
                {dist.map((entry, i) => (
                  <rect key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Thrust area table */}
        <div className="card">
          <h3 style={{ marginBottom: '1.25rem' }}>Goals by Thrust Area</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {thrustData.map((t, i) => (
              <div key={i}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 13, color: 'var(--gray-700)', fontWeight: 500 }}>{t.name}</span>
                  <span style={{ fontSize: 12, color: 'var(--gray-500)' }}>{t.count} goals</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${Math.min((t.count / Math.max(...thrustData.map(x => x.count))) * 100, 100)}%`, background: 'var(--primary)' }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
