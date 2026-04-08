const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['new_feedback', 'student_reply', 'overdue_feedback', 'status_changed'],
    required: true
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  feedbackId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Feedback',
    default: null
  },
  studentName: { type: String, default: '' },
  readBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  targetRoles: [{
    type: String,
    enum: ['admin', 'staff']
  }],
}, {
  timestamps: true
});

module.exports = mongoose.model('Notification', notificationSchema);