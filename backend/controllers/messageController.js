const Message      = require('../models/Message');
const User         = require('../models/User');
const Notification = require('../models/Notification');

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
// Returns all DM threads the current user is part of, newest first.
// Each thread includes lastMessage and isUnread (for the current user).
exports.getThreads = async (req, res) => {
  try {
    const userId = req.user._id;

    const threads = await Message.find({ participants: userId })
      .populate('participants', 'name email role')
      .sort({ updatedAt: -1 });

    const shaped = threads.map((t) => {
      const lastMessage = t.messages.length
        ? t.messages[t.messages.length - 1]
        : null;

      // Find this user's read pointer in lastReadBy
      const myRead = t.lastReadBy?.find(
        (r) => r.userId.toString() === userId.toString()
      );

      let isUnread = false;
      if (lastMessage) {
        const sentByMe = lastMessage.sender.toString() === userId.toString();
        if (!sentByMe) {
          if (!myRead) {
            // Never read this thread at all
            isUnread = true;
          } else {
            // Unread if the last message is newer than what we last read
            isUnread = myRead.messageId.toString() !== lastMessage._id.toString();
          }
        }
      }

      return {
        _id:          t._id,
        participants: t.participants,
        lastMessage,
        isUnread,
        updatedAt:    t.updatedAt,
      };
    });

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

// PUT /api/messages/:threadId/read
// Marks the thread as read for the current user (upserts lastReadBy entry)
exports.markAsRead = async (req, res) => {
  try {
    const userId   = req.user._id;
    const threadId = req.params.threadId;

    const thread = await Message.findOne({
      _id:          threadId,
      participants: userId,
    });

    if (!thread) return res.status(404).json({ message: 'Thread not found' });
    if (!thread.messages.length) return res.json({ success: true });

    const lastMessageId = thread.messages[thread.messages.length - 1]._id;

    // Upsert: update existing entry or push a new one
    const existing = thread.lastReadBy?.find(
      (r) => r.userId.toString() === userId.toString()
    );

    if (existing) {
      existing.messageId = lastMessageId;
    } else {
      thread.lastReadBy.push({ userId, messageId: lastMessageId });
    }

    await thread.save();
    res.json({ success: true });
  } catch (err) {
    console.error('markAsRead:', err);
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
          lastReadBy:   [],
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

    // Sender has implicitly read up to this message
    const newMsg    = thread.messages[thread.messages.length - 1];
    const myRead    = thread.lastReadBy?.find(
      (r) => r.userId.toString() === senderId.toString()
    );
    if (myRead) {
      myRead.messageId = newMsg._id;
    } else {
      thread.lastReadBy.push({ userId: senderId, messageId: newMsg._id });
    }

    await thread.save();

    // ── DM Notification ──────────────────────────────────────────
    try {
      await thread.populate('participants', 'name role');

      const recipient = thread.participants.find(
        (p) => p._id.toString() !== senderId.toString()
      );

      if (recipient) {
        const senderLabel = req.user.role === 'admin' ? 'Admin' : req.user.name;
        const preview = message.trim().length > 60
          ? message.trim().slice(0, 60) + '…'
          : message.trim();

        await Notification.create({
          type:         'dm_message',
          title:        `💬 New message from ${senderLabel}`,
          message:      preview,
          threadId:     thread._id,
          targetUserId: recipient._id,
          targetRoles:  [recipient.role],
          readBy:       [],
        });
      }
    } catch (notifErr) {
      console.error('DM notification error:', notifErr);
    }
    // ─────────────────────────────────────────────────────────────

    const saved = thread.messages[thread.messages.length - 1];
    res.status(201).json({ message: saved, threadId: thread._id });
  } catch (err) {
    console.error('sendMessage:', err);
    res.status(500).json({ message: 'Server error' });
  }
};