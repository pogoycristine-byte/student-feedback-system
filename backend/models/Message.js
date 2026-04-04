const mongoose = require('mongoose');

const messageItemSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    senderName: { type: String, required: true },
    senderRole: { type: String, required: true },
    message:    { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

const messageThreadSchema = new mongoose.Schema(
  {
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
    ],
    messages: [messageItemSchema],
  },
  { timestamps: true }
);

messageThreadSchema.index({ participants: 1 });

module.exports = mongoose.model('Message', messageThreadSchema);