const Joi = require('joi');

const validateFieldValue = (field, value) => {
  const errors = [];

  // Check required - but skip early return for file type to allow type validation
  const isEmpty = value === null || value === undefined || value === '';
  
  if (field.required && isEmpty && field.type !== 'file') {
    errors.push(`${field.label} is required`);
    return errors;
  }

  // Skip validation if value is empty and not required
  if (!field.required && isEmpty) {
    return errors;
  }

  // Type-specific validation
  switch (field.type) {
    case 'text':
    case 'textarea':
      if (typeof value !== 'string') {
        errors.push(`${field.label} must be a string`);
      } else {
        if (field.validation?.minLength && value.length < field.validation.minLength) {
          errors.push(`${field.label} must be at least ${field.validation.minLength} characters`);
        }
        if (field.validation?.maxLength && value.length > field.validation.maxLength) {
          errors.push(`${field.label} must be at most ${field.validation.maxLength} characters`);
        }
        if (field.validation?.regex) {
          const regex = new RegExp(field.validation.regex);
          if (!regex.test(value)) {
            errors.push(`${field.label} format is invalid`);
          }
        }
      }
      break;

    case 'number':
      const numValue = Number(value);
      if (isNaN(numValue)) {
        errors.push(`${field.label} must be a valid number`);
      } else {
        if (field.validation?.min !== undefined && numValue < field.validation.min) {
          errors.push(`${field.label} must be at least ${field.validation.min}`);
        }
        if (field.validation?.max !== undefined && numValue > field.validation.max) {
          errors.push(`${field.label} must be at most ${field.validation.max}`);
        }
      }
      break;

    case 'email':
      const emailSchema = Joi.string().email();
      const { error } = emailSchema.validate(value);
      if (error) {
        errors.push(`${field.label} must be a valid email address`);
      }
      break;

    case 'date':
      const dateValue = new Date(value);
      if (isNaN(dateValue.getTime())) {
        errors.push(`${field.label} must be a valid date`);
      }
      break;

    case 'checkbox':
      if (typeof value !== 'boolean') {
        errors.push(`${field.label} must be a boolean`);
      }
      break;

    case 'radio':
    case 'select':
      if (!field.options || field.options.length === 0) {
        errors.push(`${field.label} has no valid options`);
      } else {
        const validValues = field.options.map(opt => typeof opt === 'object' ? opt.value : opt);
        if (!validValues.includes(value)) {
          errors.push(`${field.label} must be one of the provided options`);
        }
      }
      break;

    case 'file':
      // File validation - value should be a file path or filename (string)
      if (field.required) {
        if (typeof value !== 'string' || value.trim() === '') {
          errors.push(`${field.label} is required`);
        }
      } else {
        // Optional file - only validate if value is provided
        if (value !== null && value !== undefined && value !== '') {
          if (typeof value !== 'string' || value.trim() === '') {
            errors.push(`${field.label} must be a valid file path`);
          }
        }
      }
      break;
  }

  return errors;
};

// Validate conditional fields based on parent field selection
const validateConditionalFields = (field, selectedValue, answers) => {
  const errors = [];
  
  if (!field.conditionalFields || !selectedValue) {
    return errors;
  }

  // Get conditionalFields as object
  const conditionalFieldsMap = field.conditionalFields || {};

  // Get nested fields for the selected option
  const nestedFields = conditionalFieldsMap[selectedValue] || [];
  
  if (nestedFields && nestedFields.length > 0) {
    const answerMap = new Map(answers.map(a => [a.name, a.value]));
    
    nestedFields.forEach(nestedField => {
      // Frontend sends nested fields with prefixed name: parentFieldName_nestedFieldName
      const prefixedName = `${field.name}_${nestedField.name}`;
      const value = answerMap.get(prefixedName);
      const fieldErrors = validateFieldValue(nestedField, value);
      errors.push(...fieldErrors);
    });
  }

  return errors;
};

const validateSubmission = (form, answers) => {
  const errors = [];
  const answerMap = new Map(answers.map(a => [a.name, a.value]));

  // Validate all fields including conditional fields
  form.fields.forEach(field => {
    const value = answerMap.get(field.name);
    const fieldErrors = validateFieldValue(field, value);
    errors.push(...fieldErrors);

    // If this is a radio/select field with conditional fields, validate them
    if ((field.type === 'radio' || field.type === 'select') && field.conditionalFields && value) {
      const conditionalErrors = validateConditionalFields(field, value, answers);
      errors.push(...conditionalErrors);
    }
  });

  return errors;
};

module.exports = {
  validateFieldValue,
  validateConditionalFields,
  validateSubmission
};

