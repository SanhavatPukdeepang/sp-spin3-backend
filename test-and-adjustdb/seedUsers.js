import bcrypt from 'bcryptjs';
import { User } from '../src/modules/users/User.js';
import { connectDB } from '../src/configs/mongodb.js';
import dotenv from 'dotenv';

dotenv.config();

const accounts = [
  { name: 'Owner', surname: 'Admin', username: 'owner', email: 'owner@spc.com', password: 'owner123', role: 'owner' },
  { name: 'Cashier', surname: 'Staff', username: 'cashier', email: 'cashier@spc.com', password: 'cashier123', role: 'cashier' },
  { name: 'Rider', surname: 'Staff', username: 'rider', email: 'rider@spc.com', password: 'rider123', role: 'rider' },
  { name: 'Cook', surname: 'Staff', username: 'cook', email: 'cook@gmail.com', password: 'cook123', role: 'cook' },
  { name: 'Red', surname: 'Customer', username: 'red', email: 'red@gmail.com', password: 'red12345', role: 'customer' },
];

const seedUsers = async () => {
  try {
    await connectDB();

    for (const account of accounts) {
      const hashedPassword = await bcrypt.hash(account.password, 10);
      await User.findOneAndUpdate(
        { email: account.email },
        { ...account, password: hashedPassword, active_status: true },
        { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
      );
      console.log(`Account ready: ${account.email} / ${account.password}`);
    }

    process.exit(0);
  } catch (err) {
    console.error('Error seeding users:', err);
    process.exit(1);
  }
};

seedUsers();
