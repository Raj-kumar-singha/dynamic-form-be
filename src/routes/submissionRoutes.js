const express = require('express');
const router = express.Router();
const {
  submitForm,
  getSubmissions,
  getSubmissionById,
  exportSubmissionsCSV
} = require('../controllers/submissionController');
const { sanitizeInput } = require('../middleware/validator');
const authMiddleware = require('../middleware/auth');
const { apiLimiter, submissionLimiter } = require('../middleware/rateLimiter');
const { upload } = require('../middleware/upload');

// Public route - handle both JSON and multipart/form-data (for file uploads)
router.post('/', submissionLimiter, upload.any(), sanitizeInput, submitForm);

// Admin routes
router.get('/', authMiddleware, apiLimiter, getSubmissions);
router.get('/export', authMiddleware, apiLimiter, exportSubmissionsCSV);
router.get('/:id', authMiddleware, apiLimiter, getSubmissionById);

module.exports = router;

