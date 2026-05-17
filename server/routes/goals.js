const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const Goal = require('../models/Goal');
const User = require('../models/User');

// Helper: get current cycle year
const currentCycle = () => new Date().getFullYear().toString();

// Helper: current quarter
const currentQuarter = () => {
  const m = new Date().getMonth() + 1;
  if (m >= 7 && m <= 9) return 'Q1';
  if (m >= 10 && m <= 12) return 'Q2';
  if (m >= 1 && m <= 3) return 'Q3';
  return 'Q4';
};

// ──────────────────────────────────────────────
// EMPLOYEE — Create goal
// ──────────────────────────────────────────────
router.post('/', protect, authorize('employee', 'manager'), async (req, res) => {
  try {
    const { thrustArea, title, description, uom, target, weightage, cycle } = req.body;

    // Max 8 goals check
    const existingCount = await Goal.countDocuments({
      employee: req.user._id,
      cycle: cycle || currentCycle(),
      status: { $ne: 'returned' },
    });
    if (existingCount >= 8)
      return res.status(400).json({ message: 'Maximum 8 goals per employee allowed' });

    // Weightage check
    if (weightage < 10)
      return res.status(400).json({ message: 'Minimum weightage is 10%' });

    const existing = await Goal.find({
      employee: req.user._id,
      cycle: cycle || currentCycle(),
      status: { $nin: ['returned'] },
    });
    const totalWeight = existing.reduce((sum, g) => sum + g.weightage, 0) + weightage;
    if (totalWeight > 100)
      return res.status(400).json({ message: `Total weightage cannot exceed 100%. Current used: ${100 - existing.reduce((s, g) => s + g.weightage, 0)}%` });

    const goal = await Goal.create({
      employee: req.user._id,
      cycle: cycle || currentCycle(),
      thrustArea, title, description, uom, target, weightage,
    });

    res.status(201).json(goal);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ──────────────────────────────────────────────
// EMPLOYEE — Get my goals
// ──────────────────────────────────────────────
router.get('/my', protect, async (req, res) => {
  try {
    const { cycle } = req.query;
    const goals = await Goal.find({
      employee: req.user._id,
      cycle: cycle || currentCycle(),
    }).sort({ createdAt: 1 });
    res.json(goals);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ──────────────────────────────────────────────
// EMPLOYEE — Update goal (only if draft/returned)
// ──────────────────────────────────────────────
router.put('/:id', protect, async (req, res) => {
  try {
    const goal = await Goal.findById(req.params.id);
    if (!goal) return res.status(404).json({ message: 'Goal not found' });
    if (!goal.employee.equals(req.user._id) && req.user.role !== 'admin')
      return res.status(403).json({ message: 'Not authorized' });

    if (goal.isLocked && req.user.role !== 'admin')
      return res.status(403).json({ message: 'Goal is locked. Contact admin to unlock.' });

    if (!['draft', 'returned'].includes(goal.status) && req.user.role === 'employee')
      return res.status(400).json({ message: 'Only draft or returned goals can be edited' });

    const allowedFields = ['thrustArea', 'title', 'description', 'uom', 'target', 'weightage'];
    const updates = {};
    allowedFields.forEach((f) => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

    // Weightage re-validation
    if (updates.weightage !== undefined) {
      if (updates.weightage < 10)
        return res.status(400).json({ message: 'Minimum weightage is 10%' });
      const others = await Goal.find({
        employee: goal.employee,
        cycle: goal.cycle,
        _id: { $ne: goal._id },
        status: { $nin: ['returned'] },
      });
      const total = others.reduce((s, g) => s + g.weightage, 0) + updates.weightage;
      if (total > 100)
        return res.status(400).json({ message: `Total weightage would exceed 100%. Available: ${100 - others.reduce((s, g) => s + g.weightage, 0)}%` });
    }

    // Audit log if locked (admin edit)
    if (goal.isLocked) {
      Object.keys(updates).forEach((field) => {
        goal.auditLog.push({
          changedBy: req.user._id,
          field,
          oldValue: goal[field],
          newValue: updates[field],
          reason: req.body.reason || 'Admin edit post-lock',
        });
      });
    }

    Object.assign(goal, updates);
    await goal.save();
    res.json(goal);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ──────────────────────────────────────────────
// EMPLOYEE — Delete draft goal
// ──────────────────────────────────────────────
router.delete('/:id', protect, async (req, res) => {
  try {
    const goal = await Goal.findById(req.params.id);
    if (!goal) return res.status(404).json({ message: 'Goal not found' });
    if (!goal.employee.equals(req.user._id) && req.user.role !== 'admin')
      return res.status(403).json({ message: 'Not authorized' });
    if (goal.status !== 'draft')
      return res.status(400).json({ message: 'Only draft goals can be deleted' });

    await goal.deleteOne();
    res.json({ message: 'Goal deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ──────────────────────────────────────────────
// EMPLOYEE — Submit goals for approval
// ──────────────────────────────────────────────
router.post('/submit', protect, authorize('employee', 'manager'), async (req, res) => {
  try {
    const { cycle } = req.body;
    const goals = await Goal.find({
      employee: req.user._id,
      cycle: cycle || currentCycle(),
      status: 'draft',
    });

    if (goals.length === 0)
      return res.status(400).json({ message: 'No draft goals to submit' });

    const totalWeight = goals.reduce((s, g) => s + g.weightage, 0);
    if (totalWeight !== 100)
      return res.status(400).json({ message: `Total weightage must equal 100%. Current: ${totalWeight}%` });

    await Goal.updateMany(
      { employee: req.user._id, cycle: cycle || currentCycle(), status: 'draft' },
      { status: 'submitted', submittedAt: new Date() }
    );

    res.json({ message: 'Goals submitted successfully', count: goals.length });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ──────────────────────────────────────────────
// EMPLOYEE — Log quarterly achievement
// ──────────────────────────────────────────────
router.post('/:id/achievement', protect, async (req, res) => {
  try {
    const goal = await Goal.findById(req.params.id);
    if (!goal) return res.status(404).json({ message: 'Goal not found' });
    if (!goal.employee.equals(req.user._id))
      return res.status(403).json({ message: 'Not authorized' });
    if (goal.status !== 'approved')
      return res.status(400).json({ message: 'Goal must be approved before logging achievement' });

    const { quarter, year, actual, status } = req.body;
    const score = goal.computeScore(actual, quarter, year);

    const existing = goal.achievements.find((a) => a.quarter === quarter && a.year === year);
    if (existing) {
      existing.actual = actual;
      existing.status = status;
      existing.score = score;
      existing.updatedAt = new Date();
    } else {
      goal.achievements.push({ quarter, year, actual, status, score });
    }

    // Sync to linked shared goals
    if (goal.isShared === false) {
      const linked = await Goal.find({ sharedFrom: goal._id });
      for (const linked_goal of linked) {
        const la = linked_goal.achievements.find((a) => a.quarter === quarter && a.year === year);
        if (la) {
          la.actual = actual; la.score = score; la.status = status;
        } else {
          linked_goal.achievements.push({ quarter, year, actual, status, score });
        }
        await linked_goal.save();
      }
    }

    await goal.save();
    res.json(goal);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ──────────────────────────────────────────────
// MANAGER — Get team goals
// ──────────────────────────────────────────────
router.get('/team', protect, authorize('manager', 'admin'), async (req, res) => {
  try {
    const { cycle, employeeId, status } = req.query;
    const query = { cycle: cycle || currentCycle() };

    if (req.user.role === 'manager') {
      const teamMembers = await User.find({ manager: req.user._id }).select('_id');
      query.employee = { $in: teamMembers.map((u) => u._id) };
    }
    if (employeeId) query.employee = employeeId;
    if (status) query.status = status;

    const goals = await Goal.find(query)
      .populate('employee', 'name email department employeeId')
      .populate('approvedBy', 'name')
      .sort({ 'employee.name': 1, createdAt: 1 });

    res.json(goals);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ──────────────────────────────────────────────
// MANAGER — Approve / Return goal
// ──────────────────────────────────────────────
router.put('/:id/approve', protect, authorize('manager', 'admin'), async (req, res) => {
  try {
    const goal = await Goal.findById(req.params.id).populate('employee');
    if (!goal) return res.status(404).json({ message: 'Goal not found' });

    const { action, managerNote, target, weightage } = req.body;

    // Inline edits during approval
    if (target !== undefined) goal.target = target;
    if (weightage !== undefined) {
      if (weightage < 10) return res.status(400).json({ message: 'Min weightage 10%' });
      goal.weightage = weightage;
    }
    if (managerNote) goal.managerNote = managerNote;

    if (action === 'approve') {
      goal.status = 'approved';
      goal.isLocked = true;
      goal.approvedAt = new Date();
      goal.approvedBy = req.user._id;
    } else if (action === 'return') {
      goal.status = 'returned';
      goal.isLocked = false;
    } else {
      return res.status(400).json({ message: 'Action must be approve or return' });
    }

    await goal.save();
    res.json(goal);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ──────────────────────────────────────────────
// ADMIN — Push shared goal to employees
// ──────────────────────────────────────────────
router.post('/shared', protect, authorize('admin', 'manager'), async (req, res) => {
  try {
    const { thrustArea, title, description, uom, target, cycle, employeeIds, weightage } = req.body;

    // Create master goal (primary owner = admin/manager)
    const master = await Goal.create({
      employee: req.user._id,
      cycle: cycle || currentCycle(),
      thrustArea, title, description, uom, target,
      weightage: weightage || 10,
      isShared: false,
      status: 'approved',
      isLocked: true,
      approvedBy: req.user._id,
      approvedAt: new Date(),
    });

    // Push to each employee
    const linked = [];
    for (const empId of employeeIds) {
      const emp = await User.findById(empId);
      if (!emp) continue;
      const g = await Goal.create({
        employee: empId,
        cycle: cycle || currentCycle(),
        thrustArea, title, description, uom, target,
        weightage: weightage || 10,
        isShared: true,
        sharedFrom: master._id,
        primaryOwner: req.user._id,
        status: 'approved',
        isLocked: true,
        approvedBy: req.user._id,
        approvedAt: new Date(),
      });
      linked.push(g);
    }

    res.status(201).json({ master, linked, count: linked.length });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ──────────────────────────────────────────────
// ADMIN — Unlock goal
// ──────────────────────────────────────────────
router.put('/:id/unlock', protect, authorize('admin'), async (req, res) => {
  try {
    const goal = await Goal.findById(req.params.id);
    if (!goal) return res.status(404).json({ message: 'Goal not found' });

    goal.auditLog.push({
      changedBy: req.user._id,
      field: 'isLocked',
      oldValue: true,
      newValue: false,
      reason: req.body.reason || 'Admin unlock',
    });

    goal.isLocked = false;
    goal.status = 'returned';
    await goal.save();
    res.json(goal);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ──────────────────────────────────────────────
// Get single goal + audit log
// ──────────────────────────────────────────────
router.get('/:id', protect, async (req, res) => {
  try {
    const goal = await Goal.findById(req.params.id)
      .populate('employee', 'name email department employeeId')
      .populate('approvedBy', 'name email')
      .populate('auditLog.changedBy', 'name email role');
    if (!goal) return res.status(404).json({ message: 'Goal not found' });
    res.json(goal);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
