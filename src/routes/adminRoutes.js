const express = require('express');
const router = express.Router();
const { login, createAdmin } = require('../controllers/adminController');
const { validateLogin, sanitizeInput } = require('../middleware/validator');
const authMiddleware = require('../middleware/auth');
const { apiLimiter } = require('../middleware/rateLimiter');

router.post('/login', apiLimiter, sanitizeInput, validateLogin, login);
router.post('/create', authMiddleware, sanitizeInput, validateLogin, createAdmin);

module.exports = router;

