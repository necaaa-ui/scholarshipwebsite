const express = require('express');
const router = express.Router();
const { getUserByEmail } = require('../controllers/userController');

// GET user by email or register number
router.get('/user', getUserByEmail);

module.exports = router;