const express = require('express');
const router  = express.Router();
const {
  getStaffList,
  getThreads,
  getMessages,
  sendMessage,
} = require('../controllers/messageController');
const { protect } = require('../middleware/auth');

// All routes require a valid JWT
router.use(protect);

// GET  /api/messages/staff              — list staff to message (admin)
router.get('/staff', getStaffList);

// GET  /api/messages/threads            — all threads for current user
router.get('/threads', getThreads);

// GET  /api/messages/:threadId          — messages inside a thread
router.get('/:threadId', getMessages);

// POST /api/messages/:recipientIdOrThreadId  — send (creates thread if new)
router.post('/:recipientIdOrThreadId', sendMessage);

module.exports = router;