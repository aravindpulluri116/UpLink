const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// User schema (simplified version)
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  role: { type: String, enum: ['creator', 'client', 'admin'], default: 'creator' },
  isActive: { type: Boolean, default: true },
  isVerified: { type: Boolean, default: false }
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

async function createTestUser() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://aravindpulluri:aravind116@aravindpulluri.h1xmcos.mongodb.net/uplink');
    console.log('Connected to MongoDB');

    // Check if user already exists
    const existingUser = await User.findOne({ email: 'test@example.com' });
    if (existingUser) {
      console.log('Test user already exists:', existingUser.email);
      // Continue to test login even if user exists
    }

    // Hash password
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
    const hashedPassword = await bcrypt.hash('TestPass123', saltRounds);

    if (!existingUser) {
      // Create test user
      const testUser = new User({
        email: 'test@example.com',
        password: hashedPassword,
        name: 'Test User',
        role: 'creator',
        isActive: true,
        isVerified: true
      });

      await testUser.save();
      console.log('Test user created successfully:', testUser.email);
    } else {
      // Update existing user's password
      existingUser.password = hashedPassword;
      await existingUser.save();
      console.log('Updated existing user password');
    }
    
    // Test login
    const loginUser = await User.findOne({ email: 'test@example.com' }).select('+password');
    if (loginUser) {
      console.log('Found user:', loginUser.email);
      console.log('User isActive:', loginUser.isActive);
      const isPasswordValid = await bcrypt.compare('TestPass123', loginUser.password);
      console.log('Password validation test:', isPasswordValid ? 'PASSED' : 'FAILED');
    } else {
      console.log('User not found');
    }

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('Error:', error);
    await mongoose.disconnect();
  }
}

createTestUser();
