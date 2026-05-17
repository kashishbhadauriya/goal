import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { goalsAPI, checkinsAPI } from '../utils/api';
import { scoreColor, QUARTER_LABELS, formatDate, totalWeightage } from '../utils/helpers';
import { RadialBarChart, RadialBar, ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';

export default function DashboardPage() {
  const { user } = useAuth();
  const [goals, setGoals] = useState([]);
  const [checkins, setCheckins] = useState([]);
  const [loading, setLoading] = useState(true);
  const year = new Date().getFullYear();

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (user.role === 'employee') {
          const [gRes, cRes] = await Promise.all([
            goalsAPI.getMy(year.toString()),
            checkinsAPI.get({ year }),
          ]);
          setGoals(gRes.data);
          setCheckins(cRes.data);
        } else {
          const [gRes, cRes] = await Promise.all([
            goalsAPI.getTeam({ cycle: year.toString() }),
            checkinsAPI.dashboard({ year }),
          ]);
          setGoals(gRes.data);
          setCheckins(cRes.data);
        }
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    fetchData();
  }, [user]);

  if (loading) return <div className="loading-center"><div className="spinner"></div></div>;

  if (user.role === 'employee') return <EmployeeDashboard goals={goals} checkins={checkins} user={user} year={year} />;
  return <ManagerDashboard goals={goals} checkins={checkins} user={user} year={year} />;
}

function EmployeeDashboard({ goals, user, year }) {
  const approved = goals.filter(g => g.status === 'approved');
  const submitted = goals.filter(g => g.status === 'submitted');
  const draft = goals.filter(g => g.status === 'draft');
  const returned = goals.filter(g => g.status === 'returned');
  const weight = totalWeightage(goals.filter(g => !['returned'].includes(g.status)));

  const latestScores = approved.map(g => {
    const last = g.achievements?.[g.achievements.length - 1];
    return { name: g.title, score: last?.score || 0, weightage: g.weightage };
  });

  const overallScore = approved.length > 0
    ? Math.round(latestScores.reduce((s, g) => s + (g.score * g.weightage) / 100, 0))
    : 0;

  const pieData = [
    { name: 'Approved', value: approved.length, color: 'var(--success)' },
    { name: 'Submitted', value: submitted.length, color: 'var(--primary)' },
    { name: 'Draft', value: draft.length, color: 'var(--gray-400)' },
    { name: 'Returned', value: returned.length, color: 'var(--danger)' },
  ].filter(d => d.value > 0);

  return (
    <div>
      <div className="page-header">
        <h1>Welcome back, {user.name.split(' ')[0]} 👋</h1>
        <p>Here's your goal performance overview for {year}</p>
      </div>

      {/* Stats */}
      <div className="grid-4" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card">
          <div className="stat-label">Total Goals</div>
          <div className="stat-value">{goals.length}<span style={{ fontSize: '1rem', color: 'var(--gray-400)', fontFamily: 'var(--font-body)' }}>/8</span></div>
          <div className="stat-sub">Max 8 goals allowed</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Weightage</div>
          <div className="stat-value" style={{ color: weight === 100 ? 'var(--success)' : weight > 100 ? 'var(--danger)' : 'var(--accent)' }}>{weight}%</div>
          <div className="stat-sub">{weight === 100 ? '✓ Ready to submit' : `${100 - weight}% remaining`}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Approved Goals</div>
          <div className="stat-value" style={{ color: 'var(--success)' }}>{approved.length}</div>
          <div className="stat-sub">{returned.length > 0 ? `${returned.length} returned for rework` : 'No returns'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Overall Score</div>
          <div className="stat-value" style={{ color: scoreColor(overallScore) }}>{overallScore}%</div>
          <div className="stat-sub">Weighted performance</div>
        </div>
      </div>

      <div className="grid-2" style={{ marginBottom: '1.5rem' }}>
        {/* Goal status distribution */}
        <div className="card">
          <h3 style={{ marginBottom: '1rem' }}>Goal Status</h3>
          {pieData.length > 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
              <ResponsiveContainer width={140} height={140}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value" paddingAngle={2}>
                    {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip formatter={(v, n) => [v, n]} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ flex: 1 }}>
                {pieData.map((d, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: d.color, flexShrink: 0 }}></div>
                    <span style={{ fontSize: 13, color: 'var(--gray-700)', flex: 1 }}>{d.name}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--gray-900)' }}>{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="empty-state" style={{ padding: '1rem' }}>
              <p>No goals created yet</p>
            </div>
          )}
        </div>

        {/* Goal scores */}
        <div className="card">
          <h3 style={{ marginBottom: '1rem' }}>Goal Scores</h3>
          {latestScores.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {latestScores.map((g, i) => (
                <div key={i}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 13, color: 'var(--gray-700)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>{g.name}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: scoreColor(g.score) }}>{g.score}%</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${Math.min(g.score, 100)}%`, background: scoreColor(g.score) }}></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state" style={{ padding: '1rem' }}>
              <p>No achievements logged yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Recent goals list */}
      {goals.length > 0 && (
        <div className="card">
          <h3 style={{ marginBottom: '1rem' }}>Recent Goals</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Goal Title</th>
                  <th>Thrust Area</th>
                  <th>UoM</th>
                  <th>Target</th>
                  <th>Weightage</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {goals.slice(0, 5).map(g => (
                  <tr key={g._id}>
                    <td style={{ fontWeight: 500 }}>{g.title}</td>
                    <td><span className="tag">{g.thrustArea}</span></td>
                    <td><span className={`tag uom-${g.uom}`}>{g.uom.replace('_', ' ')}</span></td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>{g.target}</td>
                    <td style={{ fontWeight: 600 }}>{g.weightage}%</td>
                    <td><span className={`badge badge-${g.status}`}>{g.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function ManagerDashboard({ goals, checkins, user, year }) {
  const employees = [...new Set(goals.map(g => g.employee?._id))];
  const approved = goals.filter(g => g.status === 'approved');
  const pending = goals.filter(g => g.status === 'submitted');

  const completionRate = checkins.length > 0
    ? Math.round(checkins.reduce((s, c) => s + c.completionRate, 0) / checkins.length)
    : 0;

  return (
    <div>
      <div className="page-header">
        <h1>Team Dashboard 👔</h1>
        <p>Team performance overview — {year} cycle</p>
      </div>

      <div className="grid-4" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card"><div className="stat-label">Team Members</div><div className="stat-value">{checkins.length || employees.length}</div><div className="stat-sub">Active employees</div></div>
        <div className="stat-card"><div className="stat-label">Pending Approvals</div><div className="stat-value" style={{ color: pending.length ? 'var(--warning)' : 'var(--success)' }}>{pending.length}</div><div className="stat-sub">Goals awaiting review</div></div>
        <div className="stat-card"><div className="stat-label">Approved Goals</div><div className="stat-value" style={{ color: 'var(--success)' }}>{approved.length}</div><div className="stat-sub">Across all team members</div></div>
        <div className="stat-card"><div className="stat-label">Check-in Rate</div><div className="stat-value" style={{ color: scoreColor(completionRate) }}>{completionRate}%</div><div className="stat-sub">Quarterly completion</div></div>
      </div>

      {/* Team check-in status */}
      {checkins.length > 0 && (
        <div className="card">
          <h3 style={{ marginBottom: '1rem' }}>Team Check-in Status</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Department</th>
                  <th>Q1</th><th>Q2</th><th>Q3</th><th>Q4</th>
                  <th>Completion</th>
                </tr>
              </thead>
              <tbody>
                {checkins.slice(0, 10).map((c, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 500 }}>{c.employee.name}</td>
                    <td><span className="tag">{c.employee.department || '—'}</span></td>
                    {['Q1','Q2','Q3','Q4'].map(q => (
                      <td key={q} style={{ textAlign: 'center' }}>
                        {c.completedQuarters.includes(q) ? <span style={{ color: 'var(--success)' }}>✓</span> : <span style={{ color: 'var(--gray-300)' }}>○</span>}
                      </td>
                    ))}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className="progress-bar" style={{ flex: 1 }}>
                          <div className="progress-fill" style={{ width: `${c.completionRate}%`, background: scoreColor(c.completionRate) }}></div>
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 600, color: scoreColor(c.completionRate), width: 36 }}>{c.completionRate}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
