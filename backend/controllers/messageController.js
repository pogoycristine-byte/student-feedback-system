const Message      = require('../models/Message');
const User         = require('../models/User');
const Notification = require('../models/Notification');

// ✅ ADDED: sanitizer to prevent XSS in messages
const sanitizeString = (str) => {
  if (!str) return str;
  return str
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

// GET /api/messages/staff
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

      const myRead = t.lastReadBy?.find(
        (r) => r.userId.toString() === userId.toString()
      );

      let isUnread = false;
      if (lastMessage) {
        const sentByMe = lastMessage.sender.toString() === userId.toString();
        if (!sentByMe) {
          if (!myRead) {
            isUnread = true;
          } else {
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
exports.getMessages = async (req, res) => {
  try {
    const userId = req.user._id;

    const thread = await Message.findOne({
      _id:          req.params.threadId,
      participants: userId,
    }).populate('participants', 'name email role');

    if (!thread) return res.status(404).json({ message: 'Thread not found' });

    // Filter out messages hidden for this user
    const messages = thread.messages.filter(
      (m) => !m.hiddenFrom?.some((id) => id.toString() === userId.toString())
    );

    res.json({ messages, participants: thread.participants, lastReadBy: thread.lastReadBy });
  } catch (err) {
    console.error('getMessages:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// PUT /api/messages/:threadId/read
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
exports.sendMessage = async (req, res) => {
  try {
    const { recipientIdOrThreadId } = req.params;
    const { message } = req.body;
    const senderId = req.user._id;

    if (!message?.trim()) {
      return res.status(400).json({ message: 'Message cannot be empty' });
    }

    // ✅ ADDED: message length limit
    if (message.trim().length > 2000) {
      return res.status(400).json({ message: 'Message must be under 2000 characters' });
    }

    let thread = null;

    thread = await Message.findOne({
      _id:          recipientIdOrThreadId,
      participants: senderId,
    });

    if (!thread) {
      const recipient = await User.findById(recipientIdOrThreadId);
      if (!recipient) return res.status(404).json({ message: 'Recipient not found' });

      // ✅ ADDED: only allow messaging staff or admin (not students)
      if (recipient.role === 'student') {
        return res.status(403).json({ message: 'You can only message staff or admin' });
      }

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
      // ✅ ADDED: sanitize message before saving to prevent XSS
      message:    sanitizeString(message.trim()),
    });
    thread.updatedAt = new Date();

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

    const saved = thread.messages[thread.messages.length - 1];
    res.status(201).json({ message: saved, threadId: thread._id });
  } catch (err) {
    console.error('sendMessage:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// PUT /api/messages/:threadId/message/:msgId
exports.editMessage = async (req, res) => {
  try {
    const { threadId, msgId } = req.params;
    const { message } = req.body;
    const userId = req.user._id;

    if (!message?.trim()) {
      return res.status(400).json({ message: 'Message cannot be empty' });
    }

    if (message.trim().length > 2000) {
      return res.status(400).json({ message: 'Message must be under 2000 characters' });
    }

    const thread = await Message.findOne({
      _id:          threadId,
      participants: userId,
    });

    if (!thread) return res.status(404).json({ message: 'Thread not found' });

    const msg = thread.messages.id(msgId);
    if (!msg) return res.status(404).json({ message: 'Message not found' });

    // Only the sender can edit their own message
    if (msg.sender.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'You can only edit your own messages' });
    }

    msg.message = sanitizeString(message.trim());
    msg.edited  = true;

    await thread.save();
    res.json({ success: true, message: msg });
  } catch (err) {
    console.error('editMessage:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// DELETE /api/messages/:threadId/message/:msgId
exports.deleteMessage = async (req, res) => {
  try {
    const { threadId, msgId } = req.params;
    const userId = req.user._id;

    const thread = await Message.findOne({
      _id:          threadId,
      participants: userId,
    });

    if (!thread) return res.status(404).json({ message: 'Thread not found' });

    const msg = thread.messages.id(msgId);
    if (!msg) return res.status(404).json({ message: 'Message not found' });

    // Only the sender can delete their own message
    if (msg.sender.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'You can only delete your own messages' });
    }

    msg.deleteOne();
    thread.updatedAt = new Date();

    await thread.save();
    res.json({ success: true });
  } catch (err) {
    console.error('deleteMessage:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// DELETE /api/messages/:threadId/message/:msgId/me  ✅ ADDED: soft-delete for one user only
exports.deleteMessageForMe = async (req, res) => {
  try {
    const { threadId, msgId } = req.params;
    const userId = req.user._id;

    const thread = await Message.findOne({
      _id:          threadId,
      participants: userId,
    });

    if (!thread) return res.status(404).json({ message: 'Thread not found' });

    const msg = thread.messages.id(msgId);
    if (!msg) return res.status(404).json({ message: 'Message not found' });

    // Any participant can hide a message from themselves
    if (!msg.hiddenFrom) msg.hiddenFrom = [];
    const alreadyHidden = msg.hiddenFrom.some((id) => id.toString() === userId.toString());
    if (!alreadyHidden) {
      msg.hiddenFrom.push(userId);
    }

    await thread.save();
    res.json({ success: true });
  } catch (err) {
    console.error('deleteMessageForMe:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// DELETE /api/messages/:threadId
exports.deleteThread = async (req, res) => {
  try {
    const { threadId } = req.params;
    const userId = req.user._id;

    const thread = await Message.findOne({
      _id:          threadId,
      participants: userId,
    });

    if (!thread) return res.status(404).json({ message: 'Thread not found' });

    await thread.deleteOne();
    res.json({ success: true });
  } catch (err) {
    console.error('deleteThread:', err);
    res.status(500).json({ message: 'Server error' });
  }
};