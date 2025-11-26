const request = require('supertest');
const app = require('../src/app');
const Form = require('../src/models/Form');
const Submission = require('../src/models/Submission');
const mongoose = require('mongoose');

describe('Submission API', () => {
  let testFormId;

  beforeAll(async () => {
    // Create a test form
    const form = new Form({
      title: 'Test Form',
      description: 'Test Description',
      fields: [
        {
          label: 'Name',
          name: 'name',
          type: 'text',
          required: true,
          order: 0
        },
        {
          label: 'Email',
          name: 'email',
          type: 'email',
          required: true,
          order: 1
        }
      ]
    });
    await form.save();
    testFormId = form._id.toString();
  });

  afterAll(async () => {
    await Form.deleteMany({});
    await Submission.deleteMany({});
    await mongoose.connection.close();
  });

  test('POST /api/submissions - should submit form successfully', async () => {
    const response = await request(app)
      .post('/api/submissions')
      .send({
        formId: testFormId,
        answers: [
          { name: 'name', value: 'John Doe' },
          { name: 'email', value: 'john@example.com' }
        ]
      });

    expect(response.status).toBe(201);
    expect(response.body.message).toBe('Form submitted successfully');
  });

  test('POST /api/submissions - should reject invalid submission', async () => {
    const response = await request(app)
      .post('/api/submissions')
      .send({
        formId: testFormId,
        answers: [
          { name: 'name', value: '' }
        ]
      });

    expect(response.status).toBe(400);
    expect(response.body.errors).toBeDefined();
  });

  test('POST /api/submissions - should reject submission for inactive form', async () => {
    const inactiveForm = new Form({
      title: 'Inactive Form',
      description: 'Test',
      isActive: false,
      fields: [
        {
          label: 'Test',
          name: 'test',
          type: 'text',
          required: false,
          order: 0
        }
      ]
    });
    await inactiveForm.save();

    const response = await request(app)
      .post('/api/submissions')
      .send({
        formId: inactiveForm._id.toString(),
        answers: [
          { name: 'test', value: 'value' }
        ]
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('not active');
    
    await Form.findByIdAndDelete(inactiveForm._id);
  });
});

