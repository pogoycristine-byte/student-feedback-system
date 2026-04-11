const express = require('express');
const router  = express.Router();
const {
  getStaffList,
  getThreads,
  getMessages,
  sendMessage,
  markAsRead,
} = require('../controllers/messageController');
const { protect } = require('../middleware/auth');

// All routes require a valid JWT
router.use(protect);

// GET  /api/messages/staff                    — list staff to message (admin)
router.get('/staff', getStaffList);

// GET  /api/messages/threads                  — all threads for current user
router.get('/threads', getThreads);

// GET  /api/messages/:threadId                — messages inside a thread
router.get('/:threadId', getMessages);

// PUT  /api/messages/:threadId/read           — mark thread as read for current user
router.put('/:threadId/read', markAsRead);

// POST /api/messages/:recipientIdOrThreadId   — send (creates thread if new)
router.post('/:recipientIdOrThreadId', sendMessage);

module.exports = router;