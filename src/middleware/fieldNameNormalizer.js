// Middleware to automatically normalize field names
// Converts labels to valid field names (lowercase, underscores instead of spaces, etc.)
const normalizeFieldName = (label) => {
  if (!label) return '';
  
  // Convert to lowercase
  let name = label.toLowerCase();
  
  // Replace spaces and special characters with underscores
  name = name.replace(/[^a-z0-9_]/g, '_');
  
  // Remove multiple consecutive underscores
  name = name.replace(/_+/g, '_');
  
  // Remove leading/trailing underscores
  name = name.replace(/^_+|_+$/g, '');
  
  // Ensure it starts with a letter
  if (name && !/^[a-z]/.test(name)) {
    name = 'field_' + name;
  }
  
  // If empty after normalization, use a default
  if (!name) {
    name = 'field_' + Date.now();
  }
  
  return name;
};

const normalizeFieldNames = (req, res, next) => {
  // Only normalize if fields are being sent in the request
  if (req.body && req.body.fields && Array.isArray(req.body.fields) && req.body.fields.length > 0) {
    req.body.fields = req.body.fields.map((field, index) => {
      // If name is invalid or missing, generate from label
      if (!field.name || !/^[a-zA-Z][a-zA-Z0-9_]*$/.test(field.name)) {
        if (field.label) {
          field.name = normalizeFieldName(field.label);
        } else {
          field.name = `field_${index + 1}`;
        }
      } else {
        // Ensure name is lowercase and valid format
        field.name = field.name.toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/^_+|_+$/g, '');
        if (!/^[a-z]/.test(field.name)) {
          field.name = 'field_' + field.name;
        }
      }

      // Normalize nested fields in conditionalFields
      if (field.conditionalFields && typeof field.conditionalFields === 'object' && !Array.isArray(field.conditionalFields)) {
        Object.keys(field.conditionalFields).forEach(optionKey => {
          const nestedFields = field.conditionalFields[optionKey];
          if (Array.isArray(nestedFields)) {
            field.conditionalFields[optionKey] = nestedFields.map((nestedField, nestedIndex) => {
              if (!nestedField.name || !/^[a-zA-Z][a-zA-Z0-9_]*$/.test(nestedField.name)) {
                if (nestedField.label) {
                  nestedField.name = normalizeFieldName(nestedField.label);
                } else {
                  nestedField.name = `nested_field_${nestedIndex + 1}`;
                }
              } else {
                nestedField.name = nestedField.name.toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/^_+|_+$/g, '');
                if (!/^[a-z]/.test(nestedField.name)) {
                  nestedField.name = 'field_' + nestedField.name;
                }
              }
              return nestedField;
            });
          }
        });
      }

      return field;
    });
  }
  next();
};

module.exports = normalizeFieldNames;

