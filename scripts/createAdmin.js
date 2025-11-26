require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const AdminUser = require('../src/models/AdminUser');

const createAdmin = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error('Error: MONGODB_URI is not set in .env file');
      console.error('Please set MONGODB_URI in your .env file');
      process.exit(1);
    }

    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    const username = process.argv[2] || 'admin';
    const password = process.argv[3] || 'admin123';

    const existingAdmin = await AdminUser.findOne({ username: username.toLowerCase() });
    if (existingAdmin) {
      console.log(`Admin user "${username}" already exists`);
      console.log('Use a different username or delete the existing admin first.');
      await mongoose.connection.close();
      process.exit(0);
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const admin = new AdminUser({
      username: username.toLowerCase(),
      passwordHash
    });

    await admin.save();
    console.log('========================================');
    console.log('Admin user created successfully!');
    console.log(`Username: ${username}`);
    console.log(`Password: ${password}`);
    console.log('⚠️  IMPORTANT: Change the password after first login!');
    console.log('========================================');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Error creating admin:', error.message);
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
    }
    process.exit(1);
  }
};

createAdmin();

