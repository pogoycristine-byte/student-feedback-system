const mongoose = require('mongoose');

const supportMessageSchema = new mongoose.Schema(
  {
    sender:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    senderName: { type: String, required: true },
    senderRole: { type: String, required: true },
    message:    { type: String, required: true, trim: true },
    edited:     { type: Boolean, default: false },
    hiddenFrom: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

const supportThreadSchema = new mongoose.Schema(
  {
    subject:  { type: String, required: true, trim: true },
    status:   { type: String, enum: ['pending', 'in_progress', 'resolved'], default: 'pending' },
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }],
    messages: [supportMessageSchema],
    lastReadBy: [
      {
        userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        messageId: { type: mongoose.Schema.Types.ObjectId, required: true },
      },
    ],
  },
  { timestamps: true }
);

supportThreadSchema.index({ participants: 1 });

module.exports = mongoose.model('SupportThread', supportThreadSchema);