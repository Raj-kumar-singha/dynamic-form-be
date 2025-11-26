const express = require('express');
const router = express.Router();
const {
  getAllForms,
  getFormById,
  createForm,
  updateForm,
  deleteForm,
  restoreForm
} = require('../controllers/formController');
const { validateForm, validateFormUpdate, sanitizeInput } = require('../middleware/validator');
const normalizeFieldNames = require('../middleware/fieldNameNormalizer');
const authMiddleware = require('../middleware/auth');
const { apiLimiter } = require('../middleware/rateLimiter');

// Public routes
router.get('/', apiLimiter, getAllForms);
router.get('/:id', apiLimiter, getFormById);

// Admin routes
router.post('/', authMiddleware, apiLimiter, sanitizeInput, normalizeFieldNames, validateForm, createForm);
router.put('/:id', authMiddleware, apiLimiter, sanitizeInput, normalizeFieldNames, validateFormUpdate, updateForm);
router.delete('/:id', authMiddleware, apiLimiter, deleteForm);
router.post('/:id/restore', authMiddleware, apiLimiter, restoreForm);

module.exports = router;

