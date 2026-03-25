const mongoose = require('mongoose');
const Role = require('../models/Role');
const AccessRight = require('../models/AccessRight');
require('dotenv').config();

const roles = [
  {
    name: 'student',
    description: 'A student who can submit and track feedback',
    status: 1,
  },
  {
    name: 'staff',
    description: 'A staff member who can manage and respond to feedback',
    status: 1,
  },
  {
    name: 'admin',
    description: 'An administrator with full access to the system',
    status: 1,
  },
];

const accessRights = [
  // Student access rights
  { accessright: 'Submit Feedback',       description: 'Ability to submit a new feedback',                    category: 'student', status: 1 },
  { accessright: 'View Own Feedback',     description: 'Ability to view own submitted feedback',              category: 'student', status: 1 },
  { accessright: 'Rate Resolution',       description: 'Ability to rate the resolution of a feedback',        category: 'student', status: 1 },
  { accessright: 'View Announcements',    description: 'Ability to view announcements from admin',            category: 'student', status: 1 },
  { accessright: 'View Notifications',    description: 'Ability to view status update notifications',         category: 'student', status: 1 },
  { accessright: 'Edit Own Profile',      description: 'Ability to edit own profile information',             category: 'student', status: 1 },
  { accessright: 'Change Password',       description: 'Ability to change own account password',             category: 'student', status: 1 },

  // Staff access rights
  { accessright: 'View All Feedback',     description: 'Ability to view all submitted feedback',              category: 'staff',   status: 1 },
  { accessright: 'Respond to Feedback',   description: 'Ability to respond to student feedback',              category: 'staff',   status: 1 },
  { accessright: 'Update Feedback Status',description: 'Ability to update the status of a feedback',         category: 'staff',   status: 1 },
  { accessright: 'Manage Assigned Cases', description: 'Ability to manage feedback cases assigned to them',  category: 'staff',   status: 1 },

  // Admin access rights
  { accessright: 'Manage Users',          description: 'Ability to manage all user accounts',                 category: 'admin',   status: 1 },
  { accessright: 'Manage Categories',     description: 'Ability to create, edit, and delete categories',      category: 'admin',   status: 1 },
  { accessright: 'Manage Announcements',  description: 'Ability to create, edit, and delete announcements',   category: 'admin',   status: 1 },
  { accessright: 'View Reports',          description: 'Ability to view analytics and reports',               category: 'admin',   status: 1 },
  { accessright: 'Manage System Settings',description: 'Ability to configure system settings',               category: 'admin',   status: 1 },
  { accessright: 'Full Feedback Access',  description: 'Ability to view, respond, and manage all feedback',   category: 'admin',   status: 1 },
];

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing
    await Role.deleteMany({});
    await AccessRight.deleteMany({});
    console.log('🗑️  Cleared existing roles and access rights');

    // Insert new
    await Role.insertMany(roles);
    console.log(`✅ Inserted ${roles.length} roles`);

    await AccessRight.insertMany(accessRights);
    console.log(`✅ Inserted ${accessRights.length} access rights`);

    console.log('🎉 Seed completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed error:', error);
    process.exit(1);
  }
};

seed();