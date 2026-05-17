const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const Cycle = require('../models/Cycle');
const User = require('../models/User');

// Get all cycles
router.get('/cycles', protect, authorize('admin'), async (req, res) => {
  try {
    const cycles = await Cycle.find().sort({ year: -1 });
    res.json(cycles);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get active cycle
router.get('/cycles/active', protect, async (req, res) => {
  try {
    const cycle = await Cycle.findOne({ isActive: true }).sort({ year: -1 });
    res.json(cycle);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create / update cycle
router.post('/cycles', protect, authorize('admin'), async (req, res) => {
  try {
    const { year, goalSettingOpen, goalSettingClose, quarters, thrustAreas } = req.body;
    let cycle = await Cycle.findOne({ year });

    if (cycle) {
      Object.assign(cycle, { goalSettingOpen, goalSettingClose, quarters, thrustAreas });
    } else {
      cycle = new Cycle({
        year,
        goalSettingOpen,
        goalSettingClose,
        quarters: quarters || [
          { name: 'Q1', label: 'July Check-in', windowOpen: new Date(`${year}-07-01`), windowClose: new Date(`${year}-07-31`) },
          { name: 'Q2', label: 'October Check-in', windowOpen: new Date(`${year}-10-01`), windowClose: new Date(`${year}-10-31`) },
          { name: 'Q3', label: 'January Check-in', windowOpen: new Date(`${year + 1}-01-01`), windowClose: new Date(`${year + 1}-01-31`) },
          { name: 'Q4', label: 'Annual Review', windowOpen: new Date(`${year + 1}-03-01`), windowClose: new Date(`${year + 1}-04-30`) },
        ],
        thrustAreas: thrustAreas || Cycle.getDefaultThrustAreas(),
      });
    }

    await cycle.save();
    res.json(cycle);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Org hierarchy stats
router.get('/stats', protect, authorize('admin'), async (req, res) => {
  try {
    const totalEmployees = await User.countDocuments({ role: 'employee', isActive: true });
    const totalManagers = await User.countDocuments({ role: 'manager', isActive: true });
    const departments = await User.distinct('department');
    res.json({ totalEmployees, totalManagers, totalDepartments: departments.length, departments });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
