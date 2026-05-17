const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const User = require('../models/User');

// Get all users (admin) or team members (manager)
router.get('/', protect, authorize('manager', 'admin'), async (req, res) => {
  try {
    let query = {};
    if (req.user.role === 'manager') query.manager = req.user._id;
    const { role, department } = req.query;
    if (role) query.role = role;
    if (department) query.department = department;

    const users = await User.find(query)
      .select('-password')
      .populate('manager', 'name email');
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get single user
router.get('/:id', protect, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password').populate('manager', 'name email');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update user (admin only)
router.put('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const { name, email, role, department, manager, employeeId, isActive } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { name, email, role, department, manager, employeeId, isActive },
      { new: true, runValidators: true }
    ).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get managers list
router.get('/list/managers', protect, authorize('admin'), async (req, res) => {
  try {
    const managers = await User.find({ role: { $in: ['manager', 'admin'] }, isActive: true }).select('name email department');
    res.json(managers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
