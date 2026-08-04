const mongoose = require('mongoose');

const ScholarshipDetailSchema = new mongoose.Schema({
  scholarshipId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Scholarship',
    required: true
  },
  name: {
    type: String,
    enum: ['AICTE', 'Pragathi', 'Community', 'NGO', 'anyother', 'Central', 'State', 'Private'],
    required: true
  },
  amount: {
    type: Number,
    default: 0
  },
  specificName: {
    type: String,
    default: ''
  }
}, { 
  collection: 'scholarshipdetails',  // ✅ Uses scholarshipdetails collection in Scholarship database
  timestamps: true
});

ScholarshipDetailSchema.index({ scholarshipId: 1 });

module.exports = ScholarshipDetailSchema;  // ✅ Export schema, not model