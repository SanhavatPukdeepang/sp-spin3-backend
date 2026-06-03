import bcrypt from 'bcryptjs';
import { User } from '../src/modules/users/User.js';
import { connectDB } from '../src/configs/mongodb.js';
import dotenv from 'dotenv';

dotenv.config();

const accounts = [
  { name: 'Owner', surname: 'Admin', username: 'owner', email: 'owner@spc.com', password: 'owner123', role: 'owner', phone: '081-234-5678', address: '123/45 Sukhumvit Rd, Bangkok' },
  { name: 'Cashier', surname: 'Staff', username: 'cashier', email: 'cashier@spc.com', password: 'cashier123', role: 'cashier', phone: '082-345-6789', address: '88/12 Rama 9 Rd, Bangkok' },
  { name: 'Rider', surname: 'Staff', username: 'rider', email: 'rider@spc.com', password: 'rider123', role: 'rider', phone: '083-456-7890', address: '55/9 Phahon Yothin Rd, Bangkok' },
  { name: 'Cook', surname: 'Staff', username: 'cook', email: 'cook@gmail.com', password: 'cook123', role: 'cook', phone: '084-567-8901', address: '19/7 Sathorn Rd, Bangkok' },
  { name: 'Red', surname: 'Customer', username: 'red', email: 'red@gmail.com', password: 'red12345', role: 'customer', phone: '085-678-9012', address: '42/6 Lat Phrao Rd, Bangkok' },
];

const seedUsers = async () => {
  try {
    await connectDB();

    for (const account of accounts) {
      const hashedPassword = await bcrypt.hash(account.password, 10);
      await User.findOneAndUpdate(
        { email: account.email },
        {
          ...account,
          password: hashedPassword,
          active_status: true,
          addresses: [{
            addressName: 'Home',
            tag: 'Home',
            firstname: account.name,
            lastname: account.surname,
            address: account.address,
            isDefault: true,
          }],
        },
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
