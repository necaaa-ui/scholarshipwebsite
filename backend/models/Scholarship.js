const mongoose = require('mongoose');

const ScholarshipSchema = new mongoose.Schema({
  applicationId: { type: String, required: true },
  appliedDate: { type: Date, default: Date.now },
  
  personalDetails: {
    name: { type: String, required: true },
    email: { type: String, required: true },
    mobileNumber: { type: String, required: true }
  },
  
  eligibility: {
    aicteFeeWaiver: { type: String, enum: ['yes', 'no'], required: true },
    govtScholarship: { type: String, enum: ['yes', 'no'], required: true }
  },
  
  additionalPersonalDetails: {
    registerNo: { type: String, required: true },
    quota: { type: String, enum: ['management', 'govt'], required: true },
    collegeEmail: { type: String, required: true },
    addressCommunication: { type: String, required: true },
    native: { type: String, required: true },
    year: { type: String, required: true },
    department: { type: String, required: true },
    dateOfBirth: { type: Date, required: true },
    studentType: { type: String, enum: ['hosteller', 'dayscholar'], required: true }
  },
  
  feeDetails: {
    hostelFees: { type: Number, default: 0 },
    transportFees: { type: Number, default: 0 },
    collegeFees: { type: Number, required: true }
  },
  
  fatherDetails: {
    name: { type: String, required: true },
    occupation: { type: String, required: true },
    income: { type: Number, required: true },
    mobile: { type: String, required: true }
  },
  
  motherDetails: {
    name: { type: String, required: true },
    occupation: { type: String, required: true },
    income: { type: Number, required: true },
    mobile: { type: String, required: true }
  },
  
  academicDetails: {
    sslcPercentage: { type: Number, required: true },
    hslcPercentage: { type: Number, required: true },
    firstSemGPA: { type: Number, required: true },
    secondSemGPA: { type: Number, required: true },
    cgpa: { type: Number },
    firstGraduate: { type: String, enum: ['yes', 'no'], required: true },
    firstGraduateAmount: { type: Number, default: 0 }
  },
  
  // History of Arrears
  arrearsDetails: {
    historyOfArrears: { type: String, enum: ['yes', 'no'], default: 'no' },
    numberOfArrears: { type: Number, default: 0 }
  },
  
  bankLoanDetails: {
    bankLoanAvailed: { type: String, enum: ['yes', 'no'], required: true },
    bankName: { type: String, default: '' },
    bankBranch: { type: String, default: '' },
    loanAmount: { type: Number, default: 0 }
  },
  
  additionalInfo: {
    areaOfInterest: { type: String, required: true },
    dreamCompany: { type: String, required: true },
    message: { type: String, required: true }
  },
  
  eligibilityResult: {
    isEligible: { type: Boolean, default: false },
    reasons: { type: [String], default: [] },
    totalParentIncome: { type: Number, default: 0 },
    siblingIncome: { type: Number, default: 0 },
    cgpa: { type: Number, default: 0 },
    hasArrears: { type: Boolean, default: false },
    numberOfArrears: { type: Number, default: 0 }
  },
  
  fetchedUserData: {
    userId: mongoose.Schema.Types.ObjectId,
    name: String,
    email: String,
    branch: String,
    graduationYear: Number,
    isCurrentlyStudying: Boolean
  },
  
  familyMembers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'FamilyMember' }],
  scholarshipDetails: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ScholarshipDetail' }],
  
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  }
}, { 
  collection: 'scholarships',  // ✅ Uses scholarships collection in Scholarship database
  timestamps: true
});

// ============================================
// INDEXES
// ============================================
ScholarshipSchema.index({ applicationId: 1 }, { unique: true });
ScholarshipSchema.index({ 'personalDetails.email': 1 });
ScholarshipSchema.index({ 'additionalPersonalDetails.registerNo': 1 });
ScholarshipSchema.index({ createdAt: -1 });
ScholarshipSchema.index({ status: 1 });

module.exports = ScholarshipSchema;  // ✅ Export schema, not model