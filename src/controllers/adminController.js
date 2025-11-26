const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const AdminUser = require('../models/AdminUser');

const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET is not set in environment variables');
      return res.status(500).json({ error: 'Server configuration error. Please contact administrator.' });
    }

    const admin = await AdminUser.findOne({ username: username.toLowerCase() });
    if (!admin) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: admin._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ token, username: admin.username });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error during login', details: process.env.NODE_ENV === 'development' ? error.message : undefined });
  }
};

const createAdmin = async (req, res) => {
  try {
    const { username, password } = req.body;

    const existingAdmin = await AdminUser.findOne({ username: username.toLowerCase() });
    if (existingAdmin) {
      return res.status(400).json({ error: 'Admin user already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const admin = new AdminUser({
      username: username.toLowerCase(),
      passwordHash
    });

    await admin.save();

    res.status(201).json({ message: 'Admin user created successfully', username: admin.username });
  } catch (error) {
    console.error('Error creating admin user:', error);
    const errorMessage = process.env.NODE_ENV === 'development' 
      ? `Error creating admin user: ${error.message}` 
      : 'Server error creating admin user';
    res.status(500).json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

module.exports = {
  login,
  createAdmin
};

