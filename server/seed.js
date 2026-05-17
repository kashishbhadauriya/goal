/**
 * Seed script — run with: node server/seed.js
 * Creates demo users (admin, 2 managers, 6 employees) and a default cycle.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Cycle = require('./models/Cycle');

const YEAR = new Date().getFullYear();

const USERS = [
  // Admin
  { name: 'Admin User', email: 'admin@demo.com', password: 'demo1234', role: 'admin', department: 'HR', employeeId: 'ADM001' },
  // Managers
  { name: 'Priya Sharma', email: 'manager@demo.com', password: 'demo1234', role: 'manager', department: 'Sales', employeeId: 'MGR001' },
  { name: 'Rohit Mehta', email: 'manager2@demo.com', password: 'demo1234', role: 'manager', department: 'Operations', employeeId: 'MGR002' },
  // Employees — Sales team
  { name: 'Anjali Verma', email: 'employee@demo.com', password: 'demo1234', role: 'employee', department: 'Sales', employeeId: 'EMP001', managerEmail: 'manager@demo.com' },
  { name: 'Karan Patel', email: 'karan@demo.com', password: 'demo1234', role: 'employee', department: 'Sales', employeeId: 'EMP002', managerEmail: 'manager@demo.com' },
  { name: 'Sneha Iyer', email: 'sneha@demo.com', password: 'demo1234', role: 'employee', department: 'Sales', employeeId: 'EMP003', managerEmail: 'manager@demo.com' },
  // Employees — Ops team
  { name: 'Vikram Nair', email: 'vikram@demo.com', password: 'demo1234', role: 'employee', department: 'Operations', employeeId: 'EMP004', managerEmail: 'manager2@demo.com' },
  { name: 'Deepika Rao', email: 'deepika@demo.com', password: 'demo1234', role: 'employee', department: 'Operations', employeeId: 'EMP005', managerEmail: 'manager2@demo.com' },
  { name: 'Arjun Singh', email: 'arjun@demo.com', password: 'demo1234', role: 'employee', department: 'Operations', employeeId: 'EMP006', managerEmail: 'manager2@demo.com' },
];

const DEFAULT_CYCLE = {
  year: YEAR,
  goalSettingOpen: new Date(`${YEAR}-05-01`),
  goalSettingClose: new Date(`${YEAR}-06-30`),
  isActive: true,
  thrustAreas: [
    'Financial Performance',
    'Customer Satisfaction',
    'Operational Excellence',
    'People & Culture',
    'Innovation & Growth',
    'Safety & Compliance',
    'Digital Transformation',
    'Strategic Initiatives',
  ],
  quarters: [
    { name: 'Q1', label: 'July Check-in', windowOpen: new Date(`${YEAR}-07-01`), windowClose: new Date(`${YEAR}-07-31`) },
    { name: 'Q2', label: 'October Check-in', windowOpen: new Date(`${YEAR}-10-01`), windowClose: new Date(`${YEAR}-10-31`) },
    { name: 'Q3', label: 'January Check-in', windowOpen: new Date(`${YEAR + 1}-01-01`), windowClose: new Date(`${YEAR + 1}-01-31`) },
    { name: 'Q4', label: 'Annual Review', windowOpen: new Date(`${YEAR + 1}-03-01`), windowClose: new Date(`${YEAR + 1}-04-30`) },
  ],
};

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Cycle.deleteMany({});
    console.log('🗑️  Cleared existing users and cycles');

    // Create users without manager reference first
    const created = {};
    for (const u of USERS) {
      const { managerEmail, ...userData } = u;
      const user = await User.create(userData);
      created[u.email] = user;
      console.log(`👤 Created: ${u.name} (${u.role})`);
    }

    // Set manager references for employees
    for (const u of USERS) {
      if (u.managerEmail && created[u.managerEmail]) {
        await User.findByIdAndUpdate(created[u.email]._id, { manager: created[u.managerEmail]._id });
        console.log(`🔗 ${u.name} → ${u.managerEmail}`);
      }
    }

    // Create cycle
    await Cycle.create(DEFAULT_CYCLE);
    console.log(`📅 Created cycle for ${YEAR}`);

    console.log('\n🎉 Seed complete!\n');
    console.log('Demo accounts:');
    console.log('  Admin:    admin@demo.com    / demo1234');
    console.log('  Manager:  manager@demo.com  / demo1234');
    console.log('  Manager:  manager2@demo.com / demo1234');
    console.log('  Employee: employee@demo.com / demo1234');
    console.log('  (+ 5 more employees)\n');

    process.exit(0);
  } catch (err) {
    console.error('❌ Seed error:', err);
    process.exit(1);
  }
}

seed();
