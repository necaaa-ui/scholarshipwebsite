const mongoose = require('mongoose');

// Member schema - User model
const userSchema = new mongoose.Schema({
  basic: {
    name: String,
    email_id: String,
    alternate_email_id: String,
    label: String,
    register_no: String,
    dateofbirth: Date,
    gender: String,
    salutation: String
  },
  contact_details: {
    mobile: String
  },
  education_details: Array
}, { 
  strict: false,
  collection: 'members'  // Explicitly use 'members' collection
});

module.exports = mongoose.model('User', userSchema);