import bcrypt from 'bcryptjs';
import { User } from './src/modules/users/User.js';
import { connectDB } from './src/configs/mongodb.js';
import dotenv from 'dotenv';

dotenv.config();

const seedUsers = async () => {
  try {
    await connectDB();

    // Clear existing users (optional - remove if you want to keep existing users)
    // await User.deleteMany({});

    // Create test owner account
    const hashedPassword = await bcrypt.hash('owner123', 10);

    const owner = new User({
      name: 'Owner',
      surname: 'Admin',
      username: 'owner',
      email: 'owner@spc.com',
      password: hashedPassword,
      role: 'owner'
    });

    await owner.save();
    console.log('✓ Owner account created: owner@spc.com / owner123');

    process.exit(0);
  } catch (err) {
    console.error('Error seeding users:', err);
    process.exit(1);
  }
};

seedUsers();
