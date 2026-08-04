const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

dotenv.config();

const app = express();

// CORS
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Log requests
app.use((req, res, next) => {
  console.log(`📡 ${req.method} ${req.url}`);
  next();
});

// ============================================
// DATABASE CONNECTIONS
// ============================================

let testConnection = null;
let scholarshipConnection = null;
let modelsInitialized = false;

// Store models to export
let ScholarshipModel = null;
let FamilyMemberModel = null;
let ScholarshipDetailModel = null;

// Connection for test database (members)
const connectTestDB = async () => {
  try {
    if (mongoose.connection.readyState === 1) {
      console.log('✅ Test DB already connected');
      return mongoose.connection;
    }
    
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      family: 4,
    });
    console.log(`✅ Test DB Connected: ${conn.connection.host}`);
    console.log(`📁 Test Database: ${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.error(`❌ Test DB Error: ${error.message}`);
    return null;
  }
};

// Connection for Scholarship database
const connectScholarshipDB = async () => {
  try {
    const conn = await mongoose.createConnection(process.env.SCHOLARSHIP_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      family: 4,
    });
    console.log(`✅ Scholarship DB Connected: ${conn.host}`);
    console.log(`📁 Scholarship Database: ${conn.name}`);
    return conn;
  } catch (error) {
    console.error(`❌ Scholarship DB Error: ${error.message}`);
    return null;
  }
};

// ============================================
// INITIALIZE MODELS
// ============================================

const initModels = () => {
  try {
    if (!scholarshipConnection) {
      console.log('⚠️ Scholarship connection not ready');
      return false;
    }
    
    const ScholarshipSchema = require('./models/Scholarship');
    const FamilyMemberSchema = require('./models/FamilyMember');
    const ScholarshipDetailSchema = require('./models/ScholarshipDetail');
    
    ScholarshipModel = scholarshipConnection.model('Scholarship', ScholarshipSchema);
    FamilyMemberModel = scholarshipConnection.model('FamilyMember', FamilyMemberSchema);
    ScholarshipDetailModel = scholarshipConnection.model('ScholarshipDetail', ScholarshipDetailSchema);
    
    // Make models available globally
    global.Scholarship = ScholarshipModel;
    global.FamilyMember = FamilyMemberModel;
    global.ScholarshipDetail = ScholarshipDetailModel;
    
    // Also attach to app for access in routes
    app.set('Scholarship', ScholarshipModel);
    app.set('FamilyMember', FamilyMemberModel);
    app.set('ScholarshipDetail', ScholarshipDetailModel);
    app.set('scholarshipConnection', scholarshipConnection);
    
    modelsInitialized = true;
    console.log('✅ Scholarship models initialized successfully');
    console.log('📊 Scholarship model ready:', !!global.Scholarship);
    console.log('📊 FamilyMember model ready:', !!global.FamilyMember);
    console.log('📊 ScholarshipDetail model ready:', !!global.ScholarshipDetail);
    return true;
  } catch (error) {
    console.error('❌ Error initializing models:', error);
    return false;
  }
};

// ============================================
// INITIALIZE CONNECTIONS AND MODELS
// ============================================

const initializeApp = async () => {
  try {
    console.log('🔄 Initializing application...');
    
    // Connect to test database (members)
    testConnection = await connectTestDB();
    
    // Connect to Scholarship database
    scholarshipConnection = await connectScholarshipDB();
    
    // Store connection reference for studentController
    if (scholarshipConnection) {
      app.set('scholarshipConnection', scholarshipConnection);
      console.log('✅ Scholarship connection stored in app');
    }
    
    if (scholarshipConnection) {
      // Initialize models
      const success = initModels();
      if (success) {
        console.log('✅ All connections and models initialized');
      } else {
        console.log('⚠️ Models not initialized, will retry...');
        // Retry after 2 seconds
        setTimeout(() => {
          initModels();
        }, 2000);
      }
    } else {
      console.log('⚠️ No scholarship connection available');
    }
    
    console.log('✅ Initialization complete');
  } catch (error) {
    console.error('❌ Initialization error:', error);
  }
};

// Start initialization
initializeApp();

// ============================================
// MIDDLEWARE TO CHECK MODEL INITIALIZATION
// ============================================

const checkModels = (req, res, next) => {
  // Skip model check for student routes - they handle it themselves
  if (req.path.startsWith('/api/student')) {
    return next();
  }
  
  if (!modelsInitialized || !global.Scholarship) {
    return res.status(503).json({
      success: false,
      message: 'Scholarship models not initialized yet. Please wait and try again.'
    });
  }
  next();
};

// Apply model check to scholarship routes only
app.use('/api/scholarship', checkModels);
app.use('/api/scholarships', checkModels);
app.use('/api/family', checkModels);
app.use('/api/scholarship-detail', checkModels);
app.use('/api/admin', checkModels); // Apply to admin routes as well

// ============================================
// TEST ROUTE
// ============================================

app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'Backend is running!',
    modelsInitialized: modelsInitialized,
    timestamp: new Date().toISOString()
  });
});

// ============================================
// ROUTES
// ============================================

const userRoutes = require('./routes/userRoutes');
const scholarshipRoutes = require('./routes/scholarshipRoutes');
const adminRoutes = require('./routes/admin');

// Pass models to routes
app.use('/api', (req, res, next) => {
  // Attach models to request for routes to use
  req.models = {
    Scholarship: global.Scholarship,
    FamilyMember: global.FamilyMember,
    ScholarshipDetail: global.ScholarshipDetail
  };
  next();
});

// Use routes
app.use('/api', userRoutes);
app.use('/api', scholarshipRoutes);
app.use('/api', adminRoutes);

// ============================================
// ERROR HANDLING
// ============================================

// 404 handler
app.use((req, res, next) => {
  console.log(`❌ 404 - Route not found: ${req.method} ${req.url}`);
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.url}`
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.stack);
  res.status(500).json({ 
    success: false,
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// ============================================
// START SERVER
// ============================================

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📡 Test: http://localhost:${PORT}/api/test`);
  console.log(`📡 User: http://localhost:${PORT}/api/user?email=test@example.com`);
  console.log(`📡 Scholarship: http://localhost:${PORT}/api/scholarship`);
  console.log(`📡 Admin: http://localhost:${PORT}/api/admin/applications`);
  console.log(`📡 Admin Stats: http://localhost:${PORT}/api/admin/stats`);
  console.log(`📡 Admin All: http://localhost:${PORT}/api/admin/applications/all`);
  console.log(`📡 Student: http://localhost:${PORT}/api/student/applications?email=test@example.com`);
  console.log(`📊 Models Initialized: ${modelsInitialized}`);
});

// ============================================
// HANDLE UNCAUGHT EXCEPTIONS
// ============================================

process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Rejection:', err);
});

process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  setTimeout(() => {
    process.exit(1);
  }, 1000);
});