const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE });

// @route POST /api/auth/register
router.post(
  '/register',
  [
    body('name').notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 6 }).withMessage('Password min 6 chars'),
    body('role').isIn(['employee', 'manager', 'admin']).withMessage('Invalid role'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { name, email, password, role, department, manager, employeeId } = req.body;
    try {
      if (await User.findOne({ email }))
        return res.status(400).json({ message: 'Email already registered' });

      const user = await User.create({ name, email, password, role, department, manager, employeeId });
      res.status(201).json({ token: generateToken(user._id), user: user.toSafeObject() });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

// @route POST /api/auth/login
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email required'),
    body('password').notEmpty().withMessage('Password required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { email, password } = req.body;
    try {
      const user = await User.findOne({ email }).populate('manager', 'name email');
      if (!user || !(await user.matchPassword(password)))
        return res.status(401).json({ message: 'Invalid credentials' });
      if (!user.isActive)
        return res.status(401).json({ message: 'Account deactivated' });

      res.json({ token: generateToken(user._id), user: user.toSafeObject() });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

// @route GET /api/auth/me
router.get('/me', protect, async (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
