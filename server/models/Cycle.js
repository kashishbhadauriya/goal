const mongoose = require('mongoose');

const CycleSchema = new mongoose.Schema(
  {
    year: { type: Number, required: true, unique: true },
    goalSettingOpen: { type: Date },
    goalSettingClose: { type: Date },
    quarters: [
      {
        name: { type: String, enum: ['Q1', 'Q2', 'Q3', 'Q4'] },
        windowOpen: { type: Date },
        windowClose: { type: Date },
        label: String, // e.g. "July Check-in"
      },
    ],
    isActive: { type: Boolean, default: true },
    thrustAreas: [{ type: String }],
  },
  { timestamps: true }
);

// Default thrust areas seed
CycleSchema.statics.getDefaultThrustAreas = function () {
  return [
    'Financial Performance',
    'Customer Satisfaction',
    'Operational Excellence',
    'People & Culture',
    'Innovation & Growth',
    'Safety & Compliance',
    'Digital Transformation',
    'Strategic Initiatives',
  ];
};

module.exports = mongoose.model('Cycle', CycleSchema);
