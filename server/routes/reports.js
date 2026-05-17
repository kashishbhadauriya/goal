const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const Goal = require('../models/Goal');
const User = require('../models/User');
const { Parser } = require('json2csv');

// Achievement report — JSON
router.get('/achievement', protect, authorize('manager', 'admin'), async (req, res) => {
  try {
    const { cycle, quarter, year, department } = req.query;

    let empQuery = { role: 'employee', isActive: true };
    if (department) empQuery.department = department;
    if (req.user.role === 'manager') {
      const teamIds = (await User.find({ manager: req.user._id })).map((u) => u._id);
      empQuery._id = { $in: teamIds };
    }

    const employees = await User.find(empQuery).populate('manager', 'name');
    const currentYear = parseInt(year) || new Date().getFullYear();
    const currentCycle = cycle || currentYear.toString();

    const data = await Promise.all(
      employees.map(async (emp) => {
        const goals = await Goal.find({ employee: emp._id, cycle: currentCycle, status: 'approved' });

        const goalData = goals.map((g) => {
          const quarters = quarter ? [quarter] : ['Q1', 'Q2', 'Q3', 'Q4'];
          const achData = quarters.map((q) => {
            const a = g.achievements.find((ach) => ach.quarter === q && ach.year === currentYear);
            return { quarter: q, actual: a?.actual ?? '-', score: a?.score ?? 0, status: a?.status ?? 'not_started' };
          });
          return { title: g.title, thrustArea: g.thrustArea, uom: g.uom, target: g.target, weightage: g.weightage, achievements: achData };
        });

        const totalWeightedScore = goals.reduce((sum, g) => {
          const latest = g.achievements[g.achievements.length - 1];
          return sum + (latest ? (latest.score * g.weightage) / 100 : 0);
        }, 0);

        return { employee: { id: emp.employeeId, name: emp.name, email: emp.email, department: emp.department, manager: emp.manager?.name }, goals: goalData, overallScore: Math.round(totalWeightedScore) };
      })
    );

    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Achievement report — CSV export
router.get('/achievement/export', protect, authorize('manager', 'admin'), async (req, res) => {
  try {
    const { cycle, year } = req.query;
    const currentYear = parseInt(year) || new Date().getFullYear();
    const currentCycle = cycle || currentYear.toString();

    let empQuery = { role: 'employee', isActive: true };
    if (req.user.role === 'manager') {
      const teamIds = (await User.find({ manager: req.user._id })).map((u) => u._id);
      empQuery._id = { $in: teamIds };
    }

    const employees = await User.find(empQuery).populate('manager', 'name');
    const rows = [];

    for (const emp of employees) {
      const goals = await Goal.find({ employee: emp._id, cycle: currentCycle, status: 'approved' });
      for (const g of goals) {
        for (const q of ['Q1', 'Q2', 'Q3', 'Q4']) {
          const a = g.achievements.find((ach) => ach.quarter === q && ach.year === currentYear);
          rows.push({
            'Employee ID': emp.employeeId || '-',
            'Employee Name': emp.name,
            'Department': emp.department || '-',
            'Manager': emp.manager?.name || '-',
            'Cycle': currentCycle,
            'Thrust Area': g.thrustArea,
            'Goal Title': g.title,
            'UoM': g.uom,
            'Target': g.target,
            'Weightage (%)': g.weightage,
            'Quarter': q,
            'Actual Achievement': a?.actual ?? '-',
            'Score (%)': a?.score ?? '-',
            'Status': a?.status ?? 'not_started',
          });
        }
      }
    }

    const parser = new Parser();
    const csv = parser.parse(rows);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="achievement_report_${currentCycle}.csv"`);
    res.send(csv);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Audit log
router.get('/audit', protect, authorize('admin'), async (req, res) => {
  try {
    const { employeeId, cycle } = req.query;
    const query = { 'auditLog.0': { $exists: true } };
    if (employeeId) query.employee = employeeId;
    if (cycle) query.cycle = cycle;

    const goals = await Goal.find(query)
      .populate('employee', 'name email department employeeId')
      .populate('auditLog.changedBy', 'name email role')
      .select('title cycle employee auditLog');

    const auditEntries = [];
    goals.forEach((g) => {
      g.auditLog.forEach((entry) => {
        auditEntries.push({
          goalTitle: g.title,
          cycle: g.cycle,
          employee: g.employee,
          ...entry.toObject(),
        });
      });
    });

    auditEntries.sort((a, b) => new Date(b.changedAt) - new Date(a.changedAt));
    res.json(auditEntries);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
