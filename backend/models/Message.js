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
    edited:     { type: Boolean, default: false },
    // ✅ ADDED: tracks which users have hidden this message from their view
    hiddenFrom: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
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
    lastReadBy: [
      {
        userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        messageId: { type: mongoose.Schema.Types.ObjectId, required: true },
      },
    ],
  },
  { timestamps: true }
);

messageThreadSchema.index({ participants: 1 });

module.exports = mongoose.model('Message', messageThreadSchema);