const mongoose = require('mongoose');

const accessRightSchema = new mongoose.Schema(
  {
    accessright: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    category: {
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

module.exports = mongoose.model('AccessRight', accessRightSchema);