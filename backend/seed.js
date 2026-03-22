const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const Category = require('./models/Category');

dotenv.config();

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ MongoDB Connected'))
.catch((err) => console.error('❌ MongoDB Connection Error:', err));

const categories = [
  {
    name: 'Teaching Method',
    description: 'Feedback about teaching styles, delivery, and instructional approaches',
    icon: '👨‍🏫'
  },
  {
    name: 'Classroom Environment',
    description: 'Feedback about classroom atmosphere, cleanliness, and conditions',
    icon: '🏫'
  },
  {
    name: 'Course Content',
    description: 'Feedback about curriculum, materials, and course structure',
    icon: '📚'
  },
  {
    name: 'Facilities',
    description: 'Feedback about school facilities, equipment, and resources',
    icon: '🏗️'
  },
  {
    name: 'Teacher Behavior',
    description: 'Feedback about teacher conduct, professionalism, and interaction',
    icon: '👤'
  },
  {
    name: 'Library Resources',
    description: 'Feedback about library services, books, and study spaces',
    icon: '📖'
  },
  {
    name: 'Laboratory Equipment',
    description: 'Feedback about lab facilities, equipment, and safety',
    icon: '🔬'
  },
  {
    name: 'Technology & Internet',
    description: 'Feedback about Wi-Fi, computers, and technology access',
    icon: '💻'
  },
  {
    name: 'Student Services',
    description: 'Feedback about registration, counseling, and student support',
    icon: '🤝'
  },
  {
    name: 'Other',
    description: 'Any other feedback not covered by the categories above',
    icon: '📝'
  }
];

const adminUser = {
  name: 'System Administrator',
  email: process.env.ADMIN_EMAIL || 'admin@schoolname.edu',
  password: process.env.ADMIN_PASSWORD || 'admin123',
  role: 'admin',
  isActive: true
};

const seedDatabase = async () => {
  try {
    console.log('🌱 Starting database seeding...');

    console.log('🗑️  Clearing existing data...');
    await User.deleteMany({ role: 'admin' });
    await Category.deleteMany({});

    console.log('👤 Creating admin user...');
    const admin = await User.create(adminUser);
    console.log(`✅ Admin created: ${admin.email}`);

    console.log('📁 Creating categories...');
    const createdCategories = await Category.insertMany(
      categories.map(cat => ({ ...cat, createdBy: admin._id }))
    );
    console.log(`✅ Created ${createdCategories.length} categories`);

    console.log('\n🎉 Database seeded successfully!');
    console.log('\n📋 Admin Credentials:');
    console.log(`   Email: ${adminUser.email}`);
    console.log(`   Password: ${adminUser.password}`);
    console.log('\n⚠️  IMPORTANT: Change the admin password after first login!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase();
