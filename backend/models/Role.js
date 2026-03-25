const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      enum: ['student', 'staff', 'admin'],
    },
    description: {
      type: String,
      required: true,
    },
    status: {
      type: Number,
      default: 1, // 1 = active, 0 = inactive
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Role', roleSchema);