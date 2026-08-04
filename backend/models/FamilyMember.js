const mongoose = require('mongoose');

const FamilyMemberSchema = new mongoose.Schema({
  scholarshipId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Scholarship',
    required: true
  },
  relation: {
    type: String,
    enum: ['brother', 'sister', 'father', 'mother', 'other'],
    required: true
  },
  name: {
    type: String,
    required: true
  },
  qualification: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['working', 'studying', 'retired', 'other'],
    required: true
  },
  workingAmount: {
    type: Number,
    default: 0
  }
}, { 
  collection: 'familymembers',  // ✅ Uses familymembers collection in Scholarship database
  timestamps: true
});

FamilyMemberSchema.index({ scholarshipId: 1 });

module.exports = FamilyMemberSchema;  // ✅ Export schema, not model