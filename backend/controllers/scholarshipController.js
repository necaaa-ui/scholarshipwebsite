const mongoose = require('mongoose');
const User = require('../models/User');

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const getAcademicYearFromLabel = (label) => {
  const graduationYearMatch = label?.match(/\d{4}/);
  if (!graduationYearMatch) return null;

  const yearsUntilGraduation = Number(graduationYearMatch[0]) - new Date().getFullYear();
  const academicYearByRemainingYears = { 4: 1, 3: 2, 2: 3, 1: 4 };

  return academicYearByRemainingYears[yearsUntilGraduation] || null;
};

// Get models from global
const getModels = () => {
  const Scholarship = global.Scholarship;
  const FamilyMember = global.FamilyMember;
  const ScholarshipDetail = global.ScholarshipDetail;
  
  if (!Scholarship || !FamilyMember || !ScholarshipDetail) {
    throw new Error('Scholarship models not initialized yet');
  }
  
  return { Scholarship, FamilyMember, ScholarshipDetail };
};

// ============================================
// GENERATE APPLICATION ID - FIXED
// Counts actual applications for the year
// ============================================
const generateApplicationId = async (ScholarshipModel) => {
  try {
    const currentYear = new Date().getFullYear();
    
    // Create date range for current year
    const startDate = new Date(currentYear, 0, 1);
    const endDate = new Date(currentYear + 1, 0, 1);
    
    console.log(`🔍 Looking for applications in ${currentYear}`);
    
    // Count ALL applications for the current year
    const count = await ScholarshipModel.countDocuments({
      $or: [
        { appliedDate: { $gte: startDate, $lt: endDate } },
        { createdAt: { $gte: startDate, $lt: endDate } }
      ]
    });
    
    console.log(`📊 Found ${count} applications for ${currentYear}`);
    
    // Next number is count + 1 (starting from 1 if count is 0)
    const nextNumber = count + 1;
    
    // Format: sch-YYYY-XXX (e.g., sch-2024-001)
    const newId = `sch-${currentYear}-${String(nextNumber).padStart(3, '0')}`;
    console.log(`✅ Generated application ID: ${newId}`);
    
    return newId;
  } catch (error) {
    console.error('❌ Error generating ID, using fallback:', error);
    // Fallback: use timestamp
    const timestamp = Date.now().toString().slice(-6);
    return `sch-${new Date().getFullYear()}-${timestamp}`;
  }
};

// ============================================
// SAVE SCHOLARSHIP - FIXED
// ============================================
exports.saveScholarship = async (req, res) => {
  try {
    // Get models
    const { Scholarship, FamilyMember, ScholarshipDetail } = getModels();
    
    const formData = req.body;
    const email = formData.email?.trim();
    const user = email
      ? await User.collection.findOne({
          'basic.email_id': { $regex: new RegExp(`^${escapeRegex(email)}$`, 'i') }
        })
      : null;
    const academicYear = getAcademicYearFromLabel(user?.basic?.label);

    if (academicYear !== 2) {
      return res.status(403).json({
        success: false,
        message: 'You are not eligible for this scholarship. Only 2nd year students can apply.'
      });
    }
    console.log('📝 Received form data');
    
    // Generate application ID FIRST
    const applicationId = await generateApplicationId(Scholarship);
    console.log(`📝 Generated application ID: ${applicationId}`);
    
    // Calculate CGPA
    const firstSem = parseFloat(formData.firstSemGPA) || 0;
    const secondSem = parseFloat(formData.secondSemGPA) || 0;
    const cgpa = (firstSem + secondSem) / 2;
    
    // Calculate total parent income
    const totalParentIncome = (parseFloat(formData.fatherIncome) || 0) + (parseFloat(formData.motherIncome) || 0);
    
    // Calculate sibling income
    let siblingIncome = 0;
    if (formData.familyMembers) {
      formData.familyMembers.forEach(member => {
        if (member.status === 'working' && member.workingAmount) {
          siblingIncome += parseFloat(member.workingAmount) || 0;
        }
      });
    }
    
    // Get arrears data
    const hasArrears = formData.historyOfArrears === 'yes';
    const numberOfArrears = parseInt(formData.numberOfArrears) || 0;
    
    // Check eligibility
    const eligibilityResult = checkEligibility(formData, cgpa, totalParentIncome, siblingIncome, hasArrears, numberOfArrears);
    
    // Create main scholarship document - WITH applicationId
    const scholarshipData = {
      applicationId: applicationId, // IMPORTANT: Include this
      appliedDate: new Date(),
      
      personalDetails: {
        name: formData.name,
        email: formData.email,
        mobileNumber: formData.mobileNumber
      },
      
      eligibility: {
        aicteFeeWaiver: formData.aicteFeeWaiver,
        govtScholarship: formData.govtScholarship
      },
      
      additionalPersonalDetails: {
        registerNo: formData.registerNo,
        quota: formData.quota,
        collegeEmail: formData.collegeEmail,
        addressCommunication: formData.addressCommunication,
        native: formData.native,
        year: formData.year,
        department: formData.department,
        dateOfBirth: formData.dateOfBirth,
        studentType: formData.studentType
      },
      
      feeDetails: {
        hostelFees: parseFloat(formData.hostelFees) || 0,
        transportFees: parseFloat(formData.transportFees) || 0,
        collegeFees: parseFloat(formData.collegeFees) || 0
      },
      
      fatherDetails: {
        name: formData.fatherName,
        occupation: formData.fatherOccupation,
        income: parseFloat(formData.fatherIncome) || 0,
        mobile: formData.fatherMobile
      },
      
      motherDetails: {
        name: formData.motherName,
        occupation: formData.motherOccupation,
        income: parseFloat(formData.motherIncome) || 0,
        mobile: formData.motherMobile
      },
      
      academicDetails: {
        sslcPercentage: parseFloat(formData.sslcPercentage) || 0,
        hslcPercentage: parseFloat(formData.hslcPercentage) || 0,
        firstSemGPA: parseFloat(formData.firstSemGPA) || 0,
        secondSemGPA: parseFloat(formData.secondSemGPA) || 0,
        cgpa: cgpa,
        firstGraduate: formData.firstGraduate,
        firstGraduateAmount: parseFloat(formData.firstGraduateAmount) || 0
      },
      
      // Store arrears details
      arrearsDetails: {
        historyOfArrears: formData.historyOfArrears || 'no',
        numberOfArrears: numberOfArrears
      },
      
      bankLoanDetails: {
        bankLoanAvailed: formData.bankLoanAvailed,
        bankName: formData.bankName || '',
        bankBranch: formData.bankBranch || '',
        loanAmount: parseFloat(formData.loanAmount) || 0
      },
      
      additionalInfo: {
        areaOfInterest: formData.areaOfInterest,
        dreamCompany: formData.dreamCompany,
        message: formData.message
      },
      
      eligibilityResult: {
        isEligible: eligibilityResult.isEligible,
        reasons: eligibilityResult.reasons,
        totalParentIncome: totalParentIncome,
        siblingIncome: siblingIncome,
        cgpa: cgpa,
        hasArrears: hasArrears,
        numberOfArrears: numberOfArrears
      },
      
      fetchedUserData: formData.fetchedUser || {},
      status: 'pending',
      familyMembers: [],
      scholarshipDetails: []
    };
    
    console.log('📝 Creating scholarship with ID:', applicationId);
    
    // Create and save the main scholarship
    const scholarship = new Scholarship(scholarshipData);
    await scholarship.save();
    console.log('✅ Scholarship saved:', scholarship._id);
    console.log('✅ Application ID:', scholarship.applicationId);
    
    // Save family members
    const familyMemberIds = [];
    if (formData.familyMembers && formData.familyMembers.length > 0) {
      for (const member of formData.familyMembers) {
        if (!member.relation && !member.name) continue;
        
        const familyMember = new FamilyMember({
          scholarshipId: scholarship._id,
          relation: member.relation || 'other',
          name: member.name || 'Unknown',
          qualification: member.qualification || '',
          status: member.status || 'other',
          workingAmount: parseFloat(member.workingAmount) || 0
        });
        
        await familyMember.save();
        familyMemberIds.push(familyMember._id);
        console.log('✅ Family member saved:', familyMember._id);
      }
    }
    
    // Save scholarship details
    const scholarshipDetailIds = [];
    if (formData.scholarships && formData.scholarships.length > 0) {
      for (const sch of formData.scholarships) {
        if (!sch.name && !sch.amount) continue;
        
        const scholarshipDetail = new ScholarshipDetail({
          scholarshipId: scholarship._id,
          name: sch.name || 'anyother',
          amount: parseFloat(sch.amount) || 0,
          specificName: sch.specificName || ''
        });
        
        await scholarshipDetail.save();
        scholarshipDetailIds.push(scholarshipDetail._id);
        console.log('✅ Scholarship detail saved:', scholarshipDetail._id);
      }
    }
    
    // Update scholarship with references
    scholarship.familyMembers = familyMemberIds;
    scholarship.scholarshipDetails = scholarshipDetailIds;
    await scholarship.save();
    
    return res.status(201).json({
      success: true,
      message: 'Scholarship application submitted successfully!',
      applicationId: scholarship.applicationId,
      data: scholarship,
      familyMembersCount: familyMemberIds.length,
      scholarshipsCount: scholarshipDetailIds.length
    });
    
  } catch (error) {
    console.error('❌ Error saving scholarship:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to save scholarship application',
      error: error.message
    });
  }
};

// Helper function to check eligibility
function checkEligibility(formData, cgpa, totalParentIncome, siblingIncome, hasArrears, numberOfArrears) {
  const reasons = [];
  let isEligible = true;
  
  if (formData.aicteFeeWaiver === 'yes') {
    isEligible = false;
    reasons.push('AICTE Fee Waiver students are not eligible');
  }
  
  if (formData.govtScholarship === 'yes') {
    isEligible = false;
    reasons.push('7.5% Government Scholarship students are not eligible');
  }
  
  if (formData.quota === 'management') {
    isEligible = false;
    reasons.push('Management quota students are not eligible');
  }
  
  if (totalParentIncome > 150000) {
    isEligible = false;
    reasons.push(`Parent income (₹${totalParentIncome.toLocaleString()}) exceeds ₹1,50,000 limit`);
  }
  
  if (siblingIncome > 300000) {
    isEligible = false;
    reasons.push(`Sibling income (₹${siblingIncome.toLocaleString()}) exceeds ₹3,00,000 limit`);
  }
  
  if (cgpa < 8) {
    isEligible = false;
    reasons.push(`CGPA (${cgpa.toFixed(2)}) is below 8.0`);
  }
  
  // Check for arrears
  if (hasArrears && numberOfArrears > 0) {
    isEligible = false;
    reasons.push(`Student has ${numberOfArrears} arrears. Students with arrears are not eligible.`);
  }
  
  return {
    isEligible,
    reasons
  };
}

// ============================================
// REST OF THE CONTROLLER FUNCTIONS (KEEP AS IS)
// ============================================

// Get scholarship with populated family members and scholarship details
exports.getScholarshipWithDetails = async (req, res) => {
  try {
    const { Scholarship } = getModels();
    const { id } = req.params;
    
    const scholarship = await Scholarship.findById(id)
      .populate('familyMembers')
      .populate('scholarshipDetails');
    
    if (!scholarship) {
      return res.status(404).json({
        success: false,
        message: 'Scholarship not found'
      });
    }
    
    return res.status(200).json({
      success: true,
      data: scholarship
    });
  } catch (error) {
    console.error('Error fetching scholarship:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch scholarship',
      error: error.message
    });
  }
};

// Get all scholarships with populated data
exports.getAllScholarshipsWithDetails = async (req, res) => {
  try {
    const { Scholarship } = getModels();
    
    const scholarships = await Scholarship.find()
      .sort({ createdAt: -1 })
      .populate('familyMembers')
      .populate('scholarshipDetails');
    
    return res.status(200).json({
      success: true,
      count: scholarships.length,
      data: scholarships
    });
  } catch (error) {
    console.error('Error fetching scholarships:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch scholarships',
      error: error.message
    });
  }
};

// Get all scholarships (basic info)
exports.getAllScholarships = async (req, res) => {
  try {
    const { Scholarship } = getModels();
    
    const scholarships = await Scholarship.find()
      .sort({ createdAt: -1 })
      .select('applicationId personalDetails additionalPersonalDetails status createdAt eligibilityResult arrearsDetails');
    
    return res.status(200).json({
      success: true,
      count: scholarships.length,
      data: scholarships
    });
  } catch (error) {
    console.error('Error fetching scholarships:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch scholarships',
      error: error.message
    });
  }
};

// Get scholarship by Application ID
exports.getScholarshipByAppId = async (req, res) => {
  try {
    const { Scholarship } = getModels();
    const { appId } = req.params;
    
    const scholarship = await Scholarship.findOne({ applicationId: appId })
      .populate('familyMembers')
      .populate('scholarshipDetails');
    
    if (!scholarship) {
      return res.status(404).json({
        success: false,
        message: 'Scholarship not found'
      });
    }
    
    return res.status(200).json({
      success: true,
      data: scholarship
    });
  } catch (error) {
    console.error('Error fetching scholarship by app ID:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch scholarship',
      error: error.message
    });
  }
};

// Get family members by scholarship ID
exports.getFamilyMembers = async (req, res) => {
  try {
    const { FamilyMember } = getModels();
    const { scholarshipId } = req.params;
    
    const familyMembers = await FamilyMember.find({ scholarshipId });
    
    return res.status(200).json({
      success: true,
      count: familyMembers.length,
      data: familyMembers
    });
  } catch (error) {
    console.error('Error fetching family members:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch family members',
      error: error.message
    });
  }
};

// Get scholarship details by scholarship ID
exports.getScholarshipDetails = async (req, res) => {
  try {
    const { ScholarshipDetail } = getModels();
    const { scholarshipId } = req.params;
    
    const scholarshipDetails = await ScholarshipDetail.find({ scholarshipId });
    
    return res.status(200).json({
      success: true,
      count: scholarshipDetails.length,
      data: scholarshipDetails
    });
  } catch (error) {
    console.error('Error fetching scholarship details:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch scholarship details',
      error: error.message
    });
  }
};

// Update family member
exports.updateFamilyMember = async (req, res) => {
  try {
    const { FamilyMember } = getModels();
    const { id } = req.params;
    const updateData = req.body;
    
    const familyMember = await FamilyMember.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    );
    
    if (!familyMember) {
      return res.status(404).json({
        success: false,
        message: 'Family member not found'
      });
    }
    
    return res.status(200).json({
      success: true,
      data: familyMember
    });
  } catch (error) {
    console.error('Error updating family member:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update family member',
      error: error.message
    });
  }
};

// Delete family member
exports.deleteFamilyMember = async (req, res) => {
  try {
    const { Scholarship, FamilyMember } = getModels();
    const { id } = req.params;
    
    const familyMember = await FamilyMember.findByIdAndDelete(id);
    
    if (!familyMember) {
      return res.status(404).json({
        success: false,
        message: 'Family member not found'
      });
    }
    
    await Scholarship.updateOne(
      { familyMembers: id },
      { $pull: { familyMembers: id } }
    );
    
    return res.status(200).json({
      success: true,
      message: 'Family member deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting family member:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete family member',
      error: error.message
    });
  }
};

// Update scholarship detail
exports.updateScholarshipDetail = async (req, res) => {
  try {
    const { ScholarshipDetail } = getModels();
    const { id } = req.params;
    const updateData = req.body;
    
    const scholarshipDetail = await ScholarshipDetail.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    );
    
    if (!scholarshipDetail) {
      return res.status(404).json({
        success: false,
        message: 'Scholarship detail not found'
      });
    }
    
    return res.status(200).json({
      success: true,
      data: scholarshipDetail
    });
  } catch (error) {
    console.error('Error updating scholarship detail:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update scholarship detail',
      error: error.message
    });
  }
};

// Delete scholarship detail
exports.deleteScholarshipDetail = async (req, res) => {
  try {
    const { Scholarship, ScholarshipDetail } = getModels();
    const { id } = req.params;
    
    const scholarshipDetail = await ScholarshipDetail.findByIdAndDelete(id);
    
    if (!scholarshipDetail) {
      return res.status(404).json({
        success: false,
        message: 'Scholarship detail not found'
      });
    }
    
    await Scholarship.updateOne(
      { scholarshipDetails: id },
      { $pull: { scholarshipDetails: id } }
    );
    
    return res.status(200).json({
      success: true,
      message: 'Scholarship detail deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting scholarship detail:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete scholarship detail',
      error: error.message
    });
  }
};

// Update scholarship status
exports.updateScholarshipStatus = async (req, res) => {
  try {
    const { Scholarship } = getModels();
    const { id } = req.params;
    const { status } = req.body;
    
    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be pending, approved, or rejected'
      });
    }
    
    const scholarship = await Scholarship.findByIdAndUpdate(
      id,
      { status, updatedAt: new Date() },
      { new: true }
    );
    
    if (!scholarship) {
      return res.status(404).json({
        success: false,
        message: 'Scholarship not found'
      });
    }
    
    return res.status(200).json({
      success: true,
      message: `Scholarship status updated to ${status}`,
      data: scholarship
    });
  } catch (error) {
    console.error('Error updating scholarship status:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update scholarship status',
      error: error.message
    });
  }
};

// Delete scholarship (with all related data)
exports.deleteScholarship = async (req, res) => {
  try {
    const { Scholarship, FamilyMember, ScholarshipDetail } = getModels();
    const { id } = req.params;
    
    const scholarship = await Scholarship.findById(id);
    if (!scholarship) {
      return res.status(404).json({
        success: false,
        message: 'Scholarship not found'
      });
    }
    
    // Delete all related family members
    if (scholarship.familyMembers && scholarship.familyMembers.length > 0) {
      await FamilyMember.deleteMany({
        _id: { $in: scholarship.familyMembers }
      });
    }
    
    // Delete all related scholarship details
    if (scholarship.scholarshipDetails && scholarship.scholarshipDetails.length > 0) {
      await ScholarshipDetail.deleteMany({
        _id: { $in: scholarship.scholarshipDetails }
      });
    }
    
    // Delete the scholarship
    await Scholarship.findByIdAndDelete(id);
    
    return res.status(200).json({
      success: true,
      message: 'Scholarship and all related data deleted successfully'
    });
    
  } catch (error) {
    console.error('Error deleting scholarship:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete scholarship',
      error: error.message
    });
  }
};

// Get scholarship statistics
exports.getScholarshipStats = async (req, res) => {
  try {
    const { Scholarship } = getModels();
    
    const total = await Scholarship.countDocuments();
    const pending = await Scholarship.countDocuments({ status: 'pending' });
    const approved = await Scholarship.countDocuments({ status: 'approved' });
    const rejected = await Scholarship.countDocuments({ status: 'rejected' });
    const eligible = await Scholarship.countDocuments({ 'eligibilityResult.isEligible': true });
    const notEligible = await Scholarship.countDocuments({ 'eligibilityResult.isEligible': false });
    const hasArrears = await Scholarship.countDocuments({ 'arrearsDetails.historyOfArrears': 'yes' });
    
    return res.status(200).json({
      success: true,
      stats: {
        total,
        pending,
        approved,
        rejected,
        eligible,
        notEligible,
        hasArrears
      }
    });
  } catch (error) {
    console.error('Error fetching scholarship stats:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch scholarship stats',
      error: error.message
    });
  }
};

// ============================================
// ADMIN DASHBOARD - GET ALL APPLICATIONS
// ============================================
exports.getAllApplications = async (req, res) => {
  try {
    const { status, page = 1, limit = 20, search } = req.query;
    
    // Build query
    let query = {};
    if (status && status !== 'all') {
      query.status = status;
    }
    if (search) {
      query.$or = [
        { 'personalDetails.name': { $regex: search, $options: 'i' } },
        { 'personalDetails.email': { $regex: search, $options: 'i' } },
        { 'additionalPersonalDetails.registerNo': { $regex: search, $options: 'i' } }
      ];
    }
    
    // Check if this is a request for all data (no pagination params)
    const isAllRequest = !req.query.page && !req.query.limit;
    
    let applications;
    let total;
    
    // Build the base query with population
    const baseQuery = Scholarship.find(query)
      .sort({ createdAt: -1 })
      .populate('familyMembers')
      .populate('scholarshipDetails');
    
    if (isAllRequest) {
      // Fetch all applications without pagination
      applications = await baseQuery;
      total = applications.length;
    } else {
      // Fetch with pagination
      const skip = (parseInt(page) - 1) * parseInt(limit);
      applications = await baseQuery.skip(skip).limit(parseInt(limit));
      total = await Scholarship.countDocuments(query);
    }
    
    // Log to verify data is populated
    console.log(`Found ${applications.length} applications`);
    if (applications.length > 0) {
      console.log('First application family members:', applications[0].familyMembers);
      console.log('First application scholarship details:', applications[0].scholarshipDetails);
    }
    
    // Format data for admin dashboard
    const formattedData = applications.map(app => {
      // Convert to plain object if it's a mongoose document
      const appObj = app.toObject ? app.toObject() : app;
      
      // Extract arrears details from both possible locations
      const hasArrears = appObj.arrearsDetails?.historyOfArrears === 'yes' || 
                         appObj.eligibilityResult?.hasArrears || false;
      const numberOfArrears = appObj.arrearsDetails?.numberOfArrears || 
                              appObj.eligibilityResult?.numberOfArrears || 0;
      
      return {
        id: appObj._id,
        _id: appObj._id,
        applicationId: appObj.applicationId,
        name: appObj.personalDetails?.name || 'N/A',
        email: appObj.personalDetails?.email || 'N/A',
        mobile: appObj.personalDetails?.mobileNumber || 'N/A',
        department: appObj.additionalPersonalDetails?.department || 'N/A',
        year: appObj.additionalPersonalDetails?.year || 'N/A',
        registerNo: appObj.additionalPersonalDetails?.registerNo || 'N/A',
        quota: appObj.additionalPersonalDetails?.quota || 'N/A',
        status: appObj.status || 'pending',
        isEligible: appObj.eligibilityResult?.isEligible || false,
        reasons: appObj.eligibilityResult?.reasons || [],
        appliedDate: appObj.createdAt,
        appliedYear: appObj.createdAt ? new Date(appObj.createdAt).getFullYear() : null,
        createdAt: appObj.createdAt,
        cgpa: appObj.academicDetails?.cgpa || 0,
        totalParentIncome: appObj.eligibilityResult?.totalParentIncome || 0,
        siblingIncome: appObj.eligibilityResult?.siblingIncome || 0,
        hasArrears: hasArrears,
        numberOfArrears: numberOfArrears,
        
        // Keep all nested data for Excel export
        personalDetails: appObj.personalDetails || {},
        additionalPersonalDetails: appObj.additionalPersonalDetails || {},
        feeDetails: appObj.feeDetails || {},
        fatherDetails: appObj.fatherDetails || {},
        motherDetails: appObj.motherDetails || {},
        academicDetails: appObj.academicDetails || {},
        bankLoanDetails: appObj.bankLoanDetails || {},
        additionalInfo: appObj.additionalInfo || {},
        eligibility: appObj.eligibility || {},
        eligibilityResult: appObj.eligibilityResult || {},
        familyMembers: appObj.familyMembers || [],
        scholarshipDetails: appObj.scholarshipDetails || [],
        arrearsDetails: appObj.arrearsDetails || {},
        
        // Also keep the full details for backward compatibility
        fullDetails: appObj
      };
    });
    
    if (isAllRequest) {
      // Return all data without pagination
      return res.status(200).json({
        success: true,
        data: formattedData,
        count: formattedData.length,
        message: `Successfully fetched ${formattedData.length} applications`
      });
    }
    
    // Return with pagination
    return res.status(200).json({
      success: true,
      data: formattedData,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching applications:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch applications',
      error: error.message
    });
  }
};

// ============================================
// ADMIN DASHBOARD - GET APPLICATION BY ID
// ============================================
exports.getApplicationById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const application = await Scholarship.findById(id)
      .populate('familyMembers')
      .populate('scholarshipDetails');
    
    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }
    
    // Extract arrears details from both possible locations
    const hasArrears = application.arrearsDetails?.historyOfArrears === 'yes' || 
                       application.eligibilityResult?.hasArrears || false;
    const numberOfArrears = application.arrearsDetails?.numberOfArrears || 
                            application.eligibilityResult?.numberOfArrears || 0;
    
    // Format full details
    const details = {
      id: application._id,
      applicationId: application.applicationId,
      appliedDate: application.createdAt,
      appliedYear: application.createdAt ? new Date(application.createdAt).getFullYear() : null,
      status: application.status,
      isEligible: application.eligibilityResult?.isEligible || false,
      
      // Arrears Details - Add this at the top level for easy access
      hasArrears: hasArrears,
      numberOfArrears: numberOfArrears,
      
      // Personal Details
      personalDetails: {
        name: application.personalDetails?.name || 'N/A',
        email: application.personalDetails?.email || 'N/A',
        mobileNumber: application.personalDetails?.mobileNumber || 'N/A'
      },
      
      // Additional Personal Details
      additionalDetails: {
        registerNo: application.additionalPersonalDetails?.registerNo || 'N/A',
        quota: application.additionalPersonalDetails?.quota || 'N/A',
        collegeEmail: application.additionalPersonalDetails?.collegeEmail || 'N/A',
        address: application.additionalPersonalDetails?.addressCommunication || 'N/A',
        native: application.additionalPersonalDetails?.native || 'N/A',
        year: application.additionalPersonalDetails?.year || 'N/A',
        department: application.additionalPersonalDetails?.department || 'N/A',
        dateOfBirth: application.additionalPersonalDetails?.dateOfBirth || 'N/A',
        studentType: application.additionalPersonalDetails?.studentType || 'N/A'
      },
      
      // Fee Details
      feeDetails: {
        hostelFees: application.feeDetails?.hostelFees || 0,
        transportFees: application.feeDetails?.transportFees || 0,
        collegeFees: application.feeDetails?.collegeFees || 0
      },
      
      // Father Details
      fatherDetails: {
        name: application.fatherDetails?.name || 'N/A',
        occupation: application.fatherDetails?.occupation || 'N/A',
        income: application.fatherDetails?.income || 0,
        mobile: application.fatherDetails?.mobile || 'N/A'
      },
      
      // Mother Details
      motherDetails: {
        name: application.motherDetails?.name || 'N/A',
        occupation: application.motherDetails?.occupation || 'N/A',
        income: application.motherDetails?.income || 0,
        mobile: application.motherDetails?.mobile || 'N/A'
      },
      
      // Academic Details
      academicDetails: {
        sslcPercentage: application.academicDetails?.sslcPercentage || 0,
        hslcPercentage: application.academicDetails?.hslcPercentage || 0,
        firstSemGPA: application.academicDetails?.firstSemGPA || 0,
        secondSemGPA: application.academicDetails?.secondSemGPA || 0,
        cgpa: application.academicDetails?.cgpa || 0,
        firstGraduate: application.academicDetails?.firstGraduate || 'N/A',
        firstGraduateAmount: application.academicDetails?.firstGraduateAmount || 0
      },
      
      // Arrears Details (full object)
      arrearsDetails: {
        historyOfArrears: application.arrearsDetails?.historyOfArrears || 'no',
        numberOfArrears: application.arrearsDetails?.numberOfArrears || 0
      },
      
      // Family Members
      familyMembers: application.familyMembers || [],
      
      // Scholarship Details
      scholarshipDetails: application.scholarshipDetails || [],
      
      // Bank Loan Details
      bankLoanDetails: {
        bankLoanAvailed: application.bankLoanDetails?.bankLoanAvailed || 'N/A',
        bankName: application.bankLoanDetails?.bankName || 'N/A',
        bankBranch: application.bankLoanDetails?.bankBranch || 'N/A',
        loanAmount: application.bankLoanDetails?.loanAmount || 0
      },
      
      // Additional Info
      additionalInfo: {
        areaOfInterest: application.additionalInfo?.areaOfInterest || 'N/A',
        dreamCompany: application.additionalInfo?.dreamCompany || 'N/A',
        message: application.additionalInfo?.message || 'N/A'
      },
      
      // Eligibility Results
      eligibilityResult: {
        isEligible: application.eligibilityResult?.isEligible || false,
        reasons: application.eligibilityResult?.reasons || [],
        totalParentIncome: application.eligibilityResult?.totalParentIncome || 0,
        siblingIncome: application.eligibilityResult?.siblingIncome || 0,
        cgpa: application.eligibilityResult?.cgpa || 0,
        hasArrears: application.eligibilityResult?.hasArrears || false,
        numberOfArrears: application.eligibilityResult?.numberOfArrears || 0
      },
      
      // Fetched User Data
      fetchedUserData: application.fetchedUserData || {},
      
      // Eligibility Check (frontend check)
      eligibility: {
        aicteFeeWaiver: application.eligibility?.aicteFeeWaiver || 'N/A',
        govtScholarship: application.eligibility?.govtScholarship || 'N/A'
      }
    };
    
    return res.status(200).json({
      success: true,
      data: details
    });
  } catch (error) {
    console.error('Error fetching application details:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch application details',
      error: error.message
    });
  }
};

// ============================================
// ADMIN DASHBOARD - GET STATISTICS
// ============================================
exports.getDashboardStats = async (req, res) => {
  try {
    const total = await Scholarship.countDocuments();
    const pending = await Scholarship.countDocuments({ status: 'pending' });
    const approved = await Scholarship.countDocuments({ status: 'approved' });
    const rejected = await Scholarship.countDocuments({ status: 'rejected' });
    const eligible = await Scholarship.countDocuments({ 'eligibilityResult.isEligible': true });
    const notEligible = await Scholarship.countDocuments({ 'eligibilityResult.isEligible': false });
    const hasArrears = await Scholarship.countDocuments({ 'arrearsDetails.historyOfArrears': 'yes' });
    
    // Get recent applications (last 5)
    const recent = await Scholarship.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('applicationId personalDetails additionalPersonalDetails status createdAt arrearsDetails eligibilityResult');
    
    const recentData = recent.map(app => ({
      applicationId: app.applicationId,
      name: app.personalDetails?.name || 'N/A',
      department: app.additionalPersonalDetails?.department || 'N/A',
      status: app.status || 'pending',
      appliedDate: app.createdAt,
      hasArrears: app.arrearsDetails?.historyOfArrears === 'yes' || 
                  app.eligibilityResult?.hasArrears || false,
      numberOfArrears: app.arrearsDetails?.numberOfArrears || 
                       app.eligibilityResult?.numberOfArrears || 0
    }));
    
    return res.status(200).json({
      success: true,
      stats: {
        total,
        pending,
        approved,
        rejected,
        eligible,
        notEligible,
        hasArrears
      },
      recent: recentData
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard stats',
      error: error.message
    });
  }
};
