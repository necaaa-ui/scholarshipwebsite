const mongoose = require('mongoose');

// Connection for test database (members)
const connectTestDB = async () => {
  try {
    // Check if already connected
    if (mongoose.connection.readyState === 1) {
      console.log('✅ Test DB already connected');
      return mongoose.connection;
    }
    
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      family: 4, // Use IPv4, skip trying IPv6
    });
    console.log(`✅ Test DB Connected: ${conn.connection.host}`);
    console.log(`📁 Test Database: ${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.error(`❌ Test DB Error: ${error.message}`);
    // Don't exit, retry
    setTimeout(() => connectTestDB(), 5000);
    return null;
  }
};

// Connection for Scholarship database
const connectScholarshipDB = async () => {
  try {
    const conn = await mongoose.createConnection(process.env.SCHOLARSHIP_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      family: 4,
    });
    console.log(`✅ Scholarship DB Connected: ${conn.host}`);
    console.log(`📁 Scholarship Database: ${conn.name}`);
    return conn;
  } catch (error) {
    console.error(`❌ Scholarship DB Error: ${error.message}`);
    setTimeout(() => connectScholarshipDB(), 5000);
    return null;
  }
};

let scholarshipConnection = null;

const getScholarshipDB = async () => {
  if (!scholarshipConnection) {
    scholarshipConnection = await connectScholarshipDB();
  }
  return scholarshipConnection;
};

module.exports = { connectTestDB, connectScholarshipDB, getScholarshipDB };