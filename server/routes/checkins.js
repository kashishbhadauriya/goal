const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const Checkin = require('../models/Checkin');
const Goal = require('../models/Goal');
const User = require('../models/User');

// Manager logs a check-in for an employee
router.post('/', protect, authorize('manager', 'admin'), async (req, res) => {
  try {
    const { employeeId, quarter, year, comment } = req.body;

    const employee = await User.findById(employeeId);
    if (!employee) return res.status(404).json({ message: 'Employee not found' });

    // Gather approved goals with achievements
    const goals = await Goal.find({
      employee: employeeId,
      cycle: year.toString(),
      status: 'approved',
    });

    const goalSummary = goals.map((g) => {
      const ach = g.achievements.find((a) => a.quarter === quarter && a.year === year);
      return {
        goal: g._id,
        planned: g.target,
        actual: ach ? ach.actual : null,
        score: ach ? ach.score : 0,
        status: ach ? ach.status : 'not_started',
      };
    });

    let checkin = await Checkin.findOne({ employee: employeeId, quarter, year });
    if (checkin) {
      checkin.comment = comment;
      checkin.goalSummary = goalSummary;
      checkin.isCompleted = true;
      checkin.completedAt = new Date();
    } else {
      checkin = await Checkin.create({
        employee: employeeId,
        manager: req.user._id,
        quarter, year, comment,
        goalSummary,
        isCompleted: true,
        completedAt: new Date(),
      });
    }

    await checkin.save();
    res.json(checkin);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get check-ins for a team member or self
router.get('/', protect, async (req, res) => {
  try {
    const { employeeId, quarter, year } = req.query;
    const query = {};

    if (req.user.role === 'employee') {
      query.employee = req.user._id;
    } else if (employeeId) {
      query.employee = employeeId;
    } else if (req.user.role === 'manager') {
      const team = await User.find({ manager: req.user._id }).select('_id');
      query.employee = { $in: team.map((u) => u._id) };
    }

    if (quarter) query.quarter = quarter;
    if (year) query.year = parseInt(year);

    const checkins = await Checkin.find(query)
      .populate('employee', 'name email department employeeId')
      .populate('manager', 'name email')
      .populate('goalSummary.goal', 'title uom weightage')
      .sort({ createdAt: -1 });

    res.json(checkins);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Completion dashboard
router.get('/dashboard', protect, authorize('manager', 'admin'), async (req, res) => {
  try {
    const { year, quarter } = req.query;
    const currentYear = parseInt(year) || new Date().getFullYear();

    let teamQuery = {};
    if (req.user.role === 'manager') {
      teamQuery.manager = req.user._id;
    }

    const employees = await User.find({ ...teamQuery, role: 'employee', isActive: true })
      .select('name email department employeeId manager')
      .populate('manager', 'name');

    const quarters = quarter ? [quarter] : ['Q1', 'Q2', 'Q3', 'Q4'];

    const result = await Promise.all(
      employees.map(async (emp) => {
        const checkins = await Checkin.find({
          employee: emp._id,
          year: currentYear,
          quarter: { $in: quarters },
        });
        const completedQuarters = checkins.filter((c) => c.isCompleted).map((c) => c.quarter);
        return {
          employee: emp,
          completedQuarters,
          pendingQuarters: quarters.filter((q) => !completedQuarters.includes(q)),
          completionRate: Math.round((completedQuarters.length / quarters.length) * 100),
        };
      })
    );

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
