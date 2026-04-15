const express = require('express');
const router = express.Router();
const {
  getStaffList,
  getThreads,
  getMessages,
  sendMessage,
  markAsRead,
  editMessage,
  deleteMessage,
  deleteThread,
} = require('../controllers/messageController');
const { protect } = require('../middleware/auth');
const rateLimit = require('express-rate-limit');

// ✅ ADDED: limit message sending to prevent flooding
const messageLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 30,
  message: { success: false, message: 'Too many messages sent, please slow down.' }
});

// All routes require a valid JWT
router.use(protect);

router.get('/staff',    getStaffList);
router.get('/threads',  getThreads);
router.get('/:threadId',         getMessages);
router.put('/:threadId/read',    markAsRead);

// ✅ ADDED: messageLimiter on send only
router.post('/:recipientIdOrThreadId', messageLimiter, sendMessage);

// ✅ ADDED: edit and delete a single message
router.put('/:threadId/message/:msgId',    editMessage);
router.delete('/:threadId/message/:msgId', deleteMessage);

// ✅ ADDED: delete entire thread
router.delete('/:threadId', deleteThread);

module.exports = router;