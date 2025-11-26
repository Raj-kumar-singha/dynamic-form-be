const { validateSubmission, validateFieldValue } = require('../src/services/validationService');

describe('Validation Service', () => {
  describe('validateFieldValue', () => {
    test('should validate required text field', () => {
      const field = {
        label: 'Name',
        name: 'name',
        type: 'text',
        required: true
      };
      const errors = validateFieldValue(field, '');
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('required');
    });

    test('should validate email format', () => {
      const field = {
        label: 'Email',
        name: 'email',
        type: 'email',
        required: true
      };
      const errors = validateFieldValue(field, 'invalid-email');
      expect(errors.length).toBeGreaterThan(0);
    });

    test('should validate number range', () => {
      const field = {
        label: 'Age',
        name: 'age',
        type: 'number',
        required: true,
        validation: { min: 18, max: 100 }
      };
      const errors = validateFieldValue(field, 15);
      expect(errors.length).toBeGreaterThan(0);
    });

    test('should validate select/radio options', () => {
      const field = {
        label: 'Country',
        name: 'country',
        type: 'select',
        required: true,
        options: ['USA', 'Canada', 'Mexico']
      };
      const errors = validateFieldValue(field, 'Invalid');
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('validateSubmission', () => {
    test('should validate complete submission', () => {
      const form = {
        fields: [
          {
            label: 'Name',
            name: 'name',
            type: 'text',
            required: true
          },
          {
            label: 'Email',
            name: 'email',
            type: 'email',
            required: true
          }
        ]
      };

      const answers = [
        { name: 'name', value: 'John Doe' },
        { name: 'email', value: 'john@example.com' }
      ];

      const errors = validateSubmission(form, answers);
      expect(errors.length).toBe(0);
    });

    test('should catch missing required fields', () => {
      const form = {
        fields: [
          {
            label: 'Name',
            name: 'name',
            type: 'text',
            required: true
          }
        ]
      };

      const answers = [];

      const errors = validateSubmission(form, answers);
      expect(errors.length).toBeGreaterThan(0);
    });
  });
});

