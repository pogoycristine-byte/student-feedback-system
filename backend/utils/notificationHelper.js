const Notification = require('../models/Notification');

const createNotification = async ({ type, title, message, feedbackId, studentName, targetRoles, excludeUserId }) => {
  try {
    await Notification.create({
      type,
      title,
      message,
      feedbackId: feedbackId || null,
      studentName: studentName || '',
      targetRoles: targetRoles || ['admin', 'staff'],
      excludeUserId: excludeUserId || null,
    });
  } catch (err) {
    console.error('Failed to create notification:', err.message);
  }
};

module.exports = { createNotification };