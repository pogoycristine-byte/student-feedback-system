const Message = require('../models/Message');
const User    = require('../models/User');

// GET /api/messages/staff
// Admin only — returns all staff/admin users except self (to start new DMs)
exports.getStaffList = async (req, res) => {
  try {
    const staff = await User.find({
      role: { $in: ['staff', 'admin'] },
      _id:  { $ne: req.user._id },
    })
      .select('name email role')
      .sort({ name: 1 });

    res.json({ staff });
  } catch (err) {
    console.error('getStaffList:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/messages/threads
// Returns all DM threads the current user is part of, newest first
exports.getThreads = async (req, res) => {
  try {
    const userId = req.user._id;

    const threads = await Message.find({ participants: userId })
      .populate('participants', 'name email role')
      .sort({ updatedAt: -1 });

    // Shape response: attach lastMessage for sidebar preview
    const shaped = threads.map((t) => ({
      _id:          t._id,
      participants: t.participants,
      lastMessage:  t.messages.length ? t.messages[t.messages.length - 1] : null,
      updatedAt:    t.updatedAt,
    }));

    res.json({ threads: shaped });
  } catch (err) {
    console.error('getThreads:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/messages/:threadId
// Returns all messages inside a thread (must be a participant)
exports.getMessages = async (req, res) => {
  try {
    const thread = await Message.findOne({
      _id:          req.params.threadId,
      participants: req.user._id,
    }).populate('participants', 'name email role');

    if (!thread) return res.status(404).json({ message: 'Thread not found' });

    res.json({ messages: thread.messages, participants: thread.participants });
  } catch (err) {
    console.error('getMessages:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/messages/:recipientIdOrThreadId
// Send a message. Param can be an existing threadId OR a userId (creates thread if new)
exports.sendMessage = async (req, res) => {
  try {
    const { recipientIdOrThreadId } = req.params;
    const { message } = req.body;
    const senderId = req.user._id;

    if (!message?.trim()) {
      return res.status(400).json({ message: 'Message cannot be empty' });
    }

    let thread = null;

    // 1. Try to find existing thread by _id where user is participant
    thread = await Message.findOne({
      _id:          recipientIdOrThreadId,
      participants: senderId,
    });

    // 2. Not a threadId — treat as recipientId, find or create thread
    if (!thread) {
      const recipient = await User.findById(recipientIdOrThreadId);
      if (!recipient) return res.status(404).json({ message: 'Recipient not found' });

      thread = await Message.findOne({
        participants: { $all: [senderId, recipient._id], $size: 2 },
      });

      if (!thread) {
        thread = new Message({
          participants: [senderId, recipient._id],
          messages:     [],
        });
      }
    }

    thread.messages.push({
      sender:     senderId,
      senderName: req.user.name,
      senderRole: req.user.role,
      message:    message.trim(),
    });
    thread.updatedAt = new Date();
    await thread.save();

    const saved = thread.messages[thread.messages.length - 1];
    res.status(201).json({ message: saved, threadId: thread._id });
  } catch (err) {
    console.error('sendMessage:', err);
    res.status(500).json({ message: 'Server error' });
  }
};