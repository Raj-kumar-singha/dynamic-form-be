const { body, validationResult } = require('express-validator');
const sanitizeHtml = require('sanitize-html');

const sanitizeInput = (req, res, next) => {
  if (req.body) {
    const sanitize = (obj) => {
      for (let key in obj) {
        if (typeof obj[key] === 'string') {
          obj[key] = sanitizeHtml(obj[key], {
            allowedTags: [],
            allowedAttributes: {}
          });
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          sanitize(obj[key]);
        }
      }
    };
    sanitize(req.body);
  }
  next();
};

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

const validateForm = [
  body('title').trim().notEmpty().withMessage('Title is required').isLength({ max: 200 }),
  body('description').optional().trim().isLength({ max: 1000 }),
  body('fields').isArray().withMessage('Fields must be an array'),
  body('fields.*.label').trim().notEmpty().withMessage('Field label is required'),
  body('fields.*.name').trim().notEmpty().withMessage('Field name is required').matches(/^[a-zA-Z][a-zA-Z0-9_]*$/).withMessage('Field name must start with a letter and contain only alphanumeric characters and underscores'),
  body('fields.*.type').isIn(['text', 'textarea', 'number', 'email', 'date', 'checkbox', 'radio', 'select', 'file']).withMessage('Invalid field type'),
  body('fields.*.required').optional().isBoolean(),
  body('fields.*.order').optional().isInt({ min: 0 }),
  handleValidationErrors
];

// Validation for form updates - makes most fields optional for partial updates
const validateFormUpdate = [
  body('title').optional().trim().notEmpty().withMessage('Title cannot be empty').isLength({ max: 200 }),
  body('description').optional().trim().isLength({ max: 1000 }),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
  body('fields').optional().isArray().withMessage('Fields must be an array'),
  body('fields.*.label').optional().trim().notEmpty().withMessage('Field label cannot be empty'),
  body('fields.*.name').optional().trim().notEmpty().withMessage('Field name cannot be empty').matches(/^[a-zA-Z][a-zA-Z0-9_]*$/).withMessage('Field name must start with a letter and contain only alphanumeric characters and underscores'),
  body('fields.*.type').optional().isIn(['text', 'textarea', 'number', 'email', 'date', 'checkbox', 'radio', 'select', 'file']).withMessage('Invalid field type'),
  body('fields.*.required').optional().isBoolean(),
  body('fields.*.order').optional().isInt({ min: 0 }),
  handleValidationErrors
];

const validateLogin = [
  body('username').trim().notEmpty().withMessage('Username is required'),
  body('password').notEmpty().withMessage('Password is required'),
  handleValidationErrors
];

module.exports = {
  sanitizeInput,
  validateForm,
  validateFormUpdate,
  validateLogin
};

