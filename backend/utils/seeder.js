require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
const { Admin } = require('../models/index');

const seed = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const args = process.argv.slice(2);
  const shouldReset = args.includes('--reset-password');

  const existingAdmin = await Admin.findOne({ email: process.env.ADMIN_EMAIL });

  if (existingAdmin) {
    if (shouldReset) {
      existingAdmin.password = process.env.ADMIN_PASSWORD || 'Musamarch@121';
      await existingAdmin.save();
      console.log('✅ Admin password updated successfully');
      console.log('   Email:', existingAdmin.email);
      console.log('   New Password:', process.env.ADMIN_PASSWORD || 'Musamarch@121');
    } else {
      console.log('ℹ️  Admin already exists:', existingAdmin.email);
      console.log('   To reset password run: node backend/utils/seeder.js --reset-password');
    }
    process.exit(0);
  }

  await Admin.create({
    firstName: 'Platform',
    lastName: 'Admin',
    email: process.env.ADMIN_EMAIL || 'schoolgates0@gmail.com',
    password: process.env.ADMIN_PASSWORD || 'Musamarch@121',
    role: 'platform_admin',
  });

  console.log('✅ Admin created successfully');
  console.log('   Email:', process.env.ADMIN_EMAIL || 'schoolgates0@gmail.com');
  console.log('   Password:', process.env.ADMIN_PASSWORD || 'Musamarch@121');
  console.log('   Role: platform_admin');
  process.exit(0);
};

seed().catch(err => { console.error(err); process.exit(1); });