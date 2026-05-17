const mongoose = require('mongoose');

const CheckinSchema = new mongoose.Schema(
  {
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    manager: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    quarter: { type: String, enum: ['Q1', 'Q2', 'Q3', 'Q4'], required: true },
    year: { type: Number, required: true },
    comment: { type: String, trim: true },
    completedAt: { type: Date },
    isCompleted: { type: Boolean, default: false },
    goalSummary: [
      {
        goal: { type: mongoose.Schema.Types.ObjectId, ref: 'Goal' },
        planned: mongoose.Schema.Types.Mixed,
        actual: mongoose.Schema.Types.Mixed,
        score: Number,
        status: String,
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Checkin', CheckinSchema);
