const mongoose = require('mongoose');

const AchievementSchema = new mongoose.Schema({
  quarter: { type: String, enum: ['Q1', 'Q2', 'Q3', 'Q4'], required: true },
  year: { type: Number, required: true },
  actual: { type: mongoose.Schema.Types.Mixed }, // number, date string, or boolean
  status: {
    type: String,
    enum: ['not_started', 'on_track', 'completed'],
    default: 'not_started',
  },
  score: { type: Number, default: 0 }, // computed 0–100
  updatedAt: { type: Date, default: Date.now },
});

const GoalSchema = new mongoose.Schema(
  {
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    cycle: { type: String, required: true }, // e.g. "2025"
    thrustArea: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    uom: {
      type: String,
      enum: ['numeric_min', 'numeric_max', 'timeline', 'zero'],
      required: true,
    },
    target: { type: mongoose.Schema.Types.Mixed, required: true }, // number or date string
    weightage: { type: Number, required: true, min: 10, max: 100 },

    // Shared goal fields
    isShared: { type: Boolean, default: false },
    sharedFrom: { type: mongoose.Schema.Types.ObjectId, ref: 'Goal', default: null },
    primaryOwner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    // Approval workflow
    status: {
      type: String,
      enum: ['draft', 'submitted', 'approved', 'returned'],
      default: 'draft',
    },
    isLocked: { type: Boolean, default: false },
    submittedAt: { type: Date },
    approvedAt: { type: Date },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    managerNote: { type: String, trim: true },

    // Quarterly achievements
    achievements: [AchievementSchema],

    // Audit trail
    auditLog: [
      {
        changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        changedAt: { type: Date, default: Date.now },
        field: String,
        oldValue: mongoose.Schema.Types.Mixed,
        newValue: mongoose.Schema.Types.Mixed,
        reason: String,
      },
    ],
  },
  { timestamps: true }
);

// Compute score helper
GoalSchema.methods.computeScore = function (actual, quarter, year) {
  let score = 0;
  const target = this.target;

  if (this.uom === 'numeric_min') {
    score = target > 0 ? Math.min((actual / target) * 100, 150) : 0;
  } else if (this.uom === 'numeric_max') {
    score = actual > 0 ? Math.min((target / actual) * 100, 150) : 0;
  } else if (this.uom === 'timeline') {
    const deadline = new Date(target);
    const completion = new Date(actual);
    score = completion <= deadline ? 100 : Math.max(0, 100 - Math.ceil((completion - deadline) / 86400000) * 5);
  } else if (this.uom === 'zero') {
    score = actual === 0 || actual === '0' ? 100 : 0;
  }

  return Math.round(score);
};

module.exports = mongoose.model('Goal', GoalSchema);
