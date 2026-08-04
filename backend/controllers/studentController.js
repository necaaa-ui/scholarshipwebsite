// D:\Scholar_ship\scholarship\backend\controllers\studentController.js

const mongoose = require('mongoose');

// Get models from global or from the scholarship connection
const getModels = () => {
  // First try to get from global (set by server.js initModels)
  let Scholarship = global.Scholarship;
  let FamilyMember = global.FamilyMember;
  let ScholarshipDetail = global.ScholarshipDetail;
  
  // If not in global, try to get from mongoose.models
  if (!Scholarship) {
    console.log('🔄 Attempting to load models from mongoose.models...');
    try {
      Scholarship = mongoose.model('Scholarship');
      FamilyMember = mongoose.model('FamilyMember');
      ScholarshipDetail = mongoose.model('ScholarshipDetail');
      
      // Set to global for future use
      global.Scholarship = Scholarship;
      global.FamilyMember = FamilyMember;
      global.ScholarshipDetail = ScholarshipDetail;
      
      console.log('✅ Models loaded from mongoose.models');
    } catch (error) {
      console.log('❌ Failed to load models from mongoose.models');
    }
  }
  
  // If still not found, try to get from the app (set by server.js)
  if (!Scholarship) {
    try {
      const app = require('../server');
      Scholarship = app.get('Scholarship');
      FamilyMember = app.get('FamilyMember');
      ScholarshipDetail = app.get('ScholarshipDetail');
      
      if (Scholarship) {
        global.Scholarship = Scholarship;
        global.FamilyMember = FamilyMember;
        global.ScholarshipDetail = ScholarshipDetail;
        console.log('✅ Models loaded from app');
      }
    } catch (error) {
      console.log('❌ Failed to load models from app');
    }
  }
  
  // If still not found, try to get from the custom connection directly
  if (!Scholarship) {
    try {
      // Try to get the scholarship connection from server.js
      // The connection is stored in the app
      const app = require('../server');
      const connection = app.get('scholarshipConnection');
      
      if (connection && connection.models) {
        Scholarship = connection.models.Scholarship;
        FamilyMember = connection.models.FamilyMember;
        ScholarshipDetail = connection.models.ScholarshipDetail;
        
        if (Scholarship) {
          global.Scholarship = Scholarship;
          global.FamilyMember = FamilyMember;
          global.ScholarshipDetail = ScholarshipDetail;
          console.log('✅ Models loaded from scholarship connection');
        }
      }
    } catch (error) {
      console.log('❌ Failed to load models from connection');
    }
  }
  
  // Final check
  if (!Scholarship || !FamilyMember || !ScholarshipDetail) {
    console.error('❌ Models not initialized');
    console.log('📊 Scholarship:', !!Scholarship);
    console.log('📊 FamilyMember:', !!FamilyMember);
    console.log('📊 ScholarshipDetail:', !!ScholarshipDetail);
    console.log('📊 Available mongoose models:', Object.keys(mongoose.models));
    throw new Error('Scholarship models not initialized yet');
  }
  
  return { Scholarship, FamilyMember, ScholarshipDetail };
};

// ============================================
// STUDENT DASHBOARD - GET APPLICATIONS BY EMAIL
// ============================================
exports.getStudentApplications = async (req, res) => {
  try {
    console.log('📡 Student applications request received');
    const { email } = req.query;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    const decodedEmail = decodeURIComponent(email);
    console.log('📧 Email:', decodedEmail);

    let Scholarship;
    try {
      const models = getModels();
      Scholarship = models.Scholarship;
    } catch (error) {
      return res.status(503).json({
        success: false,
        message: 'Service temporarily unavailable. Models are initializing. Please refresh in a few seconds.',
        error: error.message,
        retryAfter: 5
      });
    }

    const applications = await Scholarship.find({ 
      'personalDetails.email': { $regex: new RegExp(`^${decodedEmail}$`, 'i') }
    })
    .sort({ createdAt: -1 })
    .populate('familyMembers')
    .populate('scholarshipDetails');

    console.log(`✅ Found ${applications.length} applications`);

    let user = null;
    if (applications.length > 0) {
      const firstApp = applications[0];
      user = {
        personalDetails: firstApp.personalDetails || {},
        additionalPersonalDetails: firstApp.additionalPersonalDetails || {}
      };
    }

    const total = applications.length;
    const pending = applications.filter(app => app.status === 'pending').length;
    const approved = applications.filter(app => app.status === 'approved').length;
    const rejected = applications.filter(app => app.status === 'rejected').length;

    const formattedApplications = applications.map(app => {
      const appObj = app.toObject ? app.toObject() : app;
      
      // Log the raw data to debug
      console.log('📊 Raw app data for arrears:', {
        arrearsDetails: appObj.arrearsDetails,
        eligibilityResult: appObj.eligibilityResult
      });
      
      // Extract arrears details - check multiple possible locations
      let hasArrears = false;
      let numberOfArrears = 0;
      
      // Check in arrearsDetails
      if (appObj.arrearsDetails) {
        if (appObj.arrearsDetails.historyOfArrears === 'yes' || appObj.arrearsDetails.historyOfArrears === true) {
          hasArrears = true;
          numberOfArrears = appObj.arrearsDetails.numberOfArrears || 0;
        }
      }
      
      // Check in eligibilityResult if not found in arrearsDetails
      if (!hasArrears && appObj.eligibilityResult) {
        if (appObj.eligibilityResult.hasArrears === true) {
          hasArrears = true;
          numberOfArrears = appObj.eligibilityResult.numberOfArrears || 0;
        }
      }
      
      // Also check the reasons array for arrears mention
      if (!hasArrears && appObj.eligibilityResult?.reasons) {
        const arrearsReason = appObj.eligibilityResult.reasons.find(reason => 
          reason.toLowerCase().includes('arrears')
        );
        if (arrearsReason) {
          hasArrears = true;
          // Try to extract number from the reason
          const match = arrearsReason.match(/(\d+)\s*arrears?/i);
          if (match) {
            numberOfArrears = parseInt(match[1]) || 0;
          }
        }
      }
      
      console.log(`📊 Arrears for ${appObj.applicationId}: hasArrears=${hasArrears}, numberOfArrears=${numberOfArrears}`);
      
      return {
        id: appObj._id,
        _id: appObj._id,
        applicationId: appObj.applicationId || 'N/A',
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
        status: appObj.status || 'pending',
        appliedDate: appObj.appliedDate || appObj.createdAt,
        createdAt: appObj.createdAt,
        isEligible: appObj.eligibilityResult?.isEligible || false,
        familyMembers: appObj.familyMembers || [],
        scholarshipDetails: appObj.scholarshipDetails || [],
        // Arrears details
        hasArrears: hasArrears,
        numberOfArrears: numberOfArrears,
        arrearsDetails: appObj.arrearsDetails || { historyOfArrears: 'no', numberOfArrears: 0 }
      };
    });

    return res.status(200).json({
      success: true,
      data: formattedApplications,
      stats: {
        total,
        pending,
        approved,
        rejected
      },
      user: user,
      count: formattedApplications.length,
      message: `Successfully fetched ${formattedApplications.length} applications`
    });

  } catch (error) {
    console.error('❌ Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch applications',
      error: error.message
    });
  }
};

// ============================================
// STUDENT DASHBOARD - GET SINGLE APPLICATION BY ID
// ============================================
exports.getStudentApplicationById = async (req, res) => {
  try {
    const { id } = req.params;
    
    let Scholarship;
    try {
      const models = getModels();
      Scholarship = models.Scholarship;
    } catch (error) {
      return res.status(503).json({
        success: false,
        message: 'Service temporarily unavailable. Models are initializing.',
        error: error.message
      });
    }
    
    const application = await Scholarship.findById(id)
      .populate('familyMembers')
      .populate('scholarshipDetails');
    
    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    const appObj = application.toObject ? application.toObject() : application;
    
    // Log the raw data to debug
    console.log('📊 Raw app data for arrears (single):', {
      arrearsDetails: appObj.arrearsDetails,
      eligibilityResult: appObj.eligibilityResult
    });
    
    // Extract arrears details - check multiple possible locations
    let hasArrears = false;
    let numberOfArrears = 0;
    
    // Check in arrearsDetails
    if (appObj.arrearsDetails) {
      if (appObj.arrearsDetails.historyOfArrears === 'yes' || appObj.arrearsDetails.historyOfArrears === true) {
        hasArrears = true;
        numberOfArrears = appObj.arrearsDetails.numberOfArrears || 0;
      }
    }
    
    // Check in eligibilityResult if not found in arrearsDetails
    if (!hasArrears && appObj.eligibilityResult) {
      if (appObj.eligibilityResult.hasArrears === true) {
        hasArrears = true;
        numberOfArrears = appObj.eligibilityResult.numberOfArrears || 0;
      }
    }
    
    // Also check the reasons array for arrears mention
    if (!hasArrears && appObj.eligibilityResult?.reasons) {
      const arrearsReason = appObj.eligibilityResult.reasons.find(reason => 
        reason.toLowerCase().includes('arrears')
      );
      if (arrearsReason) {
        hasArrears = true;
        // Try to extract number from the reason
        const match = arrearsReason.match(/(\d+)\s*arrears?/i);
        if (match) {
          numberOfArrears = parseInt(match[1]) || 0;
        }
      }
    }
    
    console.log(`📊 Arrears for ${appObj.applicationId}: hasArrears=${hasArrears}, numberOfArrears=${numberOfArrears}`);

    const formattedApp = {
      id: appObj._id,
      applicationId: appObj.applicationId || 'N/A',
      personalDetails: appObj.personalDetails || {},
      additionalDetails: appObj.additionalPersonalDetails || {},
      feeDetails: appObj.feeDetails || {},
      fatherDetails: appObj.fatherDetails || {},
      motherDetails: appObj.motherDetails || {},
      academicDetails: appObj.academicDetails || {},
      bankLoanDetails: appObj.bankLoanDetails || {},
      additionalInfo: appObj.additionalInfo || {},
      eligibilityResult: appObj.eligibilityResult || {},
      status: appObj.status || 'pending',
      appliedDate: appObj.appliedDate || appObj.createdAt,
      createdAt: appObj.createdAt,
      isEligible: appObj.eligibilityResult?.isEligible || false,
      familyMembers: appObj.familyMembers || [],
      scholarshipDetails: appObj.scholarshipDetails || [],
      // Arrears details
      hasArrears: hasArrears,
      numberOfArrears: numberOfArrears,
      arrearsDetails: appObj.arrearsDetails || { historyOfArrears: 'no', numberOfArrears: 0 }
    };

    return res.status(200).json({
      success: true,
      data: formattedApp
    });

  } catch (error) {
    console.error('❌ Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch application details',
      error: error.message
    });
  }
};

// ============================================
// STUDENT DASHBOARD - GET STATS
// ============================================
exports.getStudentStats = async (req, res) => {
  try {
    const { email } = req.query;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    const decodedEmail = decodeURIComponent(email);
    
    let Scholarship;
    try {
      const models = getModels();
      Scholarship = models.Scholarship;
    } catch (error) {
      return res.status(503).json({
        success: false,
        message: 'Service temporarily unavailable. Models are initializing.',
        error: error.message
      });
    }

    const applications = await Scholarship.find({ 
      'personalDetails.email': { $regex: new RegExp(`^${decodedEmail}$`, 'i') }
    });

    const total = applications.length;
    const pending = applications.filter(app => app.status === 'pending').length;
    const approved = applications.filter(app => app.status === 'approved').length;
    const rejected = applications.filter(app => app.status === 'rejected').length;
    const eligible = applications.filter(app => app.eligibilityResult?.isEligible === true).length;
    const notEligible = applications.filter(app => app.eligibilityResult?.isEligible === false).length;
    const hasArrears = applications.filter(app => {
      // Check both locations for arrears
      const hasArrearsFromDetails = app.arrearsDetails?.historyOfArrears === 'yes';
      const hasArrearsFromResult = app.eligibilityResult?.hasArrears === true;
      return hasArrearsFromDetails || hasArrearsFromResult;
    }).length;

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
    console.error('❌ Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch stats',
      error: error.message
    });
  }
};

// ============================================
// STUDENT DASHBOARD - CHECK STUDENT EXISTS
// ============================================
exports.checkStudentExists = async (req, res) => {
  try {
    const { email } = req.query;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    const decodedEmail = decodeURIComponent(email);
    
    let Scholarship;
    try {
      const models = getModels();
      Scholarship = models.Scholarship;
    } catch (error) {
      return res.status(503).json({
        success: false,
        message: 'Service temporarily unavailable. Models are initializing.',
        error: error.message
      });
    }

    const application = await Scholarship.findOne({ 
      'personalDetails.email': { $regex: new RegExp(`^${decodedEmail}$`, 'i') }
    });

    return res.status(200).json({
      success: true,
      exists: !!application,
      student: application ? {
        name: application.personalDetails?.name,
        email: application.personalDetails?.email,
        department: application.additionalPersonalDetails?.department,
        year: application.additionalPersonalDetails?.year
      } : null
    });

  } catch (error) {
    console.error('❌ Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to check student',
      error: error.message
    });
  }
};