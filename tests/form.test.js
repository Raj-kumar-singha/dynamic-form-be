const request = require('supertest');
const app = require('../src/app');
const Form = require('../src/models/Form');
const AdminUser = require('../src/models/AdminUser');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

describe('Form API', () => {
  let authToken;
  let testAdminId;

  beforeAll(async () => {
    // Create test admin user
    const bcrypt = require('bcryptjs');
    const passwordHash = await bcrypt.hash('testpassword', 10);
    const admin = new AdminUser({
      username: 'testadmin',
      passwordHash
    });
    await admin.save();
    testAdminId = admin._id;

    // Generate token
    authToken = jwt.sign({ id: admin._id }, process.env.JWT_SECRET || 'test-secret');
  });

  afterAll(async () => {
    await Form.deleteMany({});
    await AdminUser.deleteMany({});
    await mongoose.connection.close();
  });

  test('GET /api/forms - should fetch all forms', async () => {
    const response = await request(app)
      .get('/api/forms');

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  test('POST /api/forms - should create form with authentication', async () => {
    const response = await request(app)
      .post('/api/forms')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        title: 'Test Form',
        description: 'Test Description',
        fields: [
          {
            label: 'Name',
            name: 'name',
            type: 'text',
            required: true,
            order: 0
          }
        ]
      });

    expect(response.status).toBe(201);
    expect(response.body.title).toBe('Test Form');
  });

  test('POST /api/forms - should reject without authentication', async () => {
    const response = await request(app)
      .post('/api/forms')
      .send({
        title: 'Test Form',
        fields: []
      });

    expect(response.status).toBe(401);
  });
});

