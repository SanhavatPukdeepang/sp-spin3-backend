import mongoose from 'mongoose';
import { connectDB } from './src/configs/mongodb.js';
import { User } from './src/modules/users/User.js';

const mockPhones = [
  '081-234-5678',
  '082-345-6789',
  '083-456-7890',
  '084-567-8901',
  '085-678-9012',
];

const mockAddresses = [
  '123/45 Sukhumvit Rd, Khlong Toei, Bangkok 10110',
  '88/12 Rama 9 Rd, Huai Khwang, Bangkok 10310',
  '55/9 Phahon Yothin Rd, Chatuchak, Bangkok 10900',
  '19/7 Sathorn Rd, Yan Nawa, Bangkok 10120',
  '42/6 Lat Phrao Rd, Wang Thonglang, Bangkok 10310',
];

const buildMockContact = (user, index) => ({
  phone: mockPhones[index % mockPhones.length],
  address: {
    addressName: 'Home',
    tag: 'Home',
    firstname: user.name || 'Customer',
    lastname: user.surname || '',
    address: mockAddresses[index % mockAddresses.length],
    isDefault: true,
  },
});

const backfillUserContactInfo = async () => {
  try {
    await connectDB();

    const users = await User.find();
    let updatedCount = 0;

    for (const [index, user] of users.entries()) {
      const mock = buildMockContact(user, index);
      let changed = false;

      if (!user.phone) {
        user.phone = mock.phone;
        changed = true;
      }

      if (!Array.isArray(user.addresses) || user.addresses.length === 0) {
        user.addresses = [mock.address];
        changed = true;
      }

      if (changed) {
        await user.save();
        updatedCount += 1;
        console.log(`Backfilled contact info for ${user.email}`);
      }
    }

    console.log(`Done. Updated ${updatedCount} user(s).`);
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Failed to backfill user contact info:', err);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  }
};

backfillUserContactInfo();
