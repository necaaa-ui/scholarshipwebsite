const express = require('express');
const router = express.Router();
const { getUserByEmail, debugGetUser } = require('../controllers/userController');

// GET user by email or register number
router.get('/user', getUserByEmail);
// Dev-only debug route
router.get('/debug/user', debugGetUser);

module.exports = router;