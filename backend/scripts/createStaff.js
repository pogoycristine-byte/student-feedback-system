const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
require('dotenv').config();

const createStaff = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const staff = [
      {
        name: 'Staff Member 1',
        email: 'staff1@schoolname.edu',
        password: await bcrypt.hash('staff123', 10),
        role: 'staff',
        studentId: 'STAFF001',
        isActive: true
      },
      {
        name: 'Staff Member 2',
        email: 'staff2@schoolname.edu',
        password: await bcrypt.hash('staff123', 10),
        role: 'staff',
        studentId: 'STAFF002',
        isActive: true
      }
    ];

    for (const s of staff) {
      const existing = await User.findOne({ email: s.email });
      if (existing) {
        console.log(`⚠️  ${s.email} already exists`);
      } else {
        await User.create(s);
        console.log(`✅ Created: ${s.email}`);
      }
    }

    console.log('\n✅ Staff accounts ready!');
    console.log('📧 staff1@schoolname.edu / staff123');
    console.log('📧 staff2@schoolname.edu / staff123');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

createStaff();