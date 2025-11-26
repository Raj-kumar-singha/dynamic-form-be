const AdminUser = require('../models/AdminUser');
const bcrypt = require('bcryptjs');

const createDefaultAdmin = async () => {
  try {
    // Check if any admin exists
    const adminCount = await AdminUser.countDocuments();
    
    if (adminCount === 0) {
      // Create default admin user
      const defaultUsername = process.env.DEFAULT_ADMIN_USERNAME || 'admin';
      const defaultPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'admin123';
      
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(defaultPassword, salt);
      
      const admin = new AdminUser({
        username: defaultUsername.toLowerCase(),
        passwordHash
      });
      
      await admin.save();
      console.log('========================================');
      console.log('Default admin user created successfully!');
      console.log(`Username: ${defaultUsername}`);
      console.log(`Password: ${defaultPassword}`);
      console.log('⚠️  IMPORTANT: Change the password after first login!');
      console.log('========================================');
    }
  } catch (error) {
    console.error('Error creating default admin user:', error.message);
  }
};

module.exports = { createDefaultAdmin };

