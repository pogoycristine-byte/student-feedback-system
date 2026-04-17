const SupportThread = require('../models/SupportThread');
const User          = require('../models/User');
const mongoose = require('mongoose');  
const sanitize = (str) => {
  if (!str) return str;
  return str
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&#x27;');
};// ✅ ADD THIS
// ✅ ADD THIS HELPER at top of file (after imports)
const isValidObjectId = (str) => {
  return mongoose.Types.ObjectId.isValid(str);
};

// ✅ UPDATE getMessages
exports.getMessages = async (req, res) => {
  try {
    const { id } = req.params;  // ← This can be empty!
    
    // ✅ VALIDATE ID FIRST
    if (!id || !isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid thread ID' });
    }

    const userId = req.user._id;
    const thread = await SupportThread.findById(id)
      .populate('participants', 'name email role');

    if (!thread) return res.status(404).json({ message: 'Thread not found' });

    // ✅ Check participant access
    const isParticipant = thread.participants.some(p => p._id.toString() === userId.toString());
    if (!isParticipant) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const messages = thread.messages.filter(
      (m) => !m.hiddenFrom?.some((hid) => hid.toString() === userId.toString())
    );

    res.json({ messages, participants: thread.participants, lastReadBy: thread.lastReadBy });
  } catch (err) {
    console.error('getMessages:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
exports.getMyThreads = async (req, res) => {
  try {
    const userId = req.user._id;

    const threads = await SupportThread.find({ participants: userId })
      .populate('participants', 'name email role')
      .sort({ updatedAt: -1 });

    const shaped = threads.map((t) => {
      const lastMsg = t.messages.length ? t.messages[t.messages.length - 1] : null;
      const myRead = t.lastReadBy?.find(r => r.userId.toString() === userId.toString());

      let isUnread = false;
      if (lastMsg) {
        const sentByMe = lastMsg.sender.toString() === userId.toString();
        if (!sentByMe) {
          isUnread = !myRead || myRead.messageId.toString() !== lastMsg._id.toString();
        }
      }

      return {
        _id:          t._id,
        subject:      t.subject,
        status:       t.status,
        participants: t.participants,
        lastMessage:  lastMsg ? { message: lastMsg.message, createdAt: lastMsg.createdAt } : null,
        isUnread,
        updatedAt:    t.updatedAt,
      };
    });

    res.json({ threads: shaped });
  } catch (err) {
    console.error('getMyThreads:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
// ✅ UPDATE sendMessage  
exports.sendMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { message, subject } = req.body;
    const senderId = req.user._id;

    // ✅ VALIDATE USER ID
    if (!senderId || !isValidObjectId(senderId.toString())) {
      return res.status(401).json({ message: 'Invalid user' });
    }

    if (!message?.trim()) {
      return res.status(400).json({ message: 'Message cannot be empty' });
    }

    let thread;

    // ✅ If valid ObjectId, check existing thread
    if (isValidObjectId(id)) {
      thread = await SupportThread.findById(id);
    }

    // ✅ Create new thread if no existing or invalid ID
    if (!thread) {
      const student = await User.findById(id);
      if (!student) {
        return res.status(404).json({ message: 'Student not found' });
      }

      thread = new SupportThread({
        subject: sanitize(subject?.trim()) || 'Support Request',
        participants: [student._id, senderId],
        messages: [],
        lastReadBy: [],
      });
    }

    // Rest unchanged...
    thread.messages.push({
      sender: senderId,
      senderName: req.user.name,
      senderRole: req.user.role,
      message: sanitize(message.trim()),
    });
    thread.updatedAt = new Date();

    const newMsg = thread.messages[thread.messages.length - 1];
    const myRead = thread.lastReadBy?.find(r => r.userId.toString() === senderId.toString());
    if (myRead) {
      myRead.messageId = newMsg._id;
    } else {
      thread.lastReadBy.push({ userId: senderId, messageId: newMsg._id });
    }

    await thread.save();
    res.status(201).json({ 
      message: newMsg, 
      threadId: thread._id.toString()  // ✅ Force string
    });
  } catch (err) {
    console.error('sendMessage:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ✅ UPDATE markAsRead
exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    
    // ✅ VALIDATE ID
    if (!id || !isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid thread ID' });
    }

    const userId = req.user._id;
    const thread = await SupportThread.findById(id);
    
    if (!thread) return res.status(404).json({ message: 'Thread not found' });
    if (!thread.messages.length) return res.json({ success: true });

    // Rest unchanged...
  } catch (err) {
    console.error('markAsRead:', err);
    res.status(500).json({ message: 'Server error' });
  }
};


// GET /api/support/students
// Returns all students (for sidebar list)
exports.getStudents = async (req, res) => {
  try {
    const students = await User.find({ role: 'student' })
      .select('name email studentId')
      .sort({ name: 1 });
    res.json({ students });
  } catch (err) {
    console.error('getStudents:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/support/threads
// Returns all support threads (admin sees all)
exports.getThreads = async (req, res) => {
  try {
    const userId = req.user._id;

    const threads = await SupportThread.find()
      .populate('participants', 'name email role')
      .sort({ updatedAt: -1 });

    const shaped = threads.map((t) => {
      const lastMsg = t.messages.length
        ? t.messages[t.messages.length - 1]
        : null;

      const myRead = t.lastReadBy?.find(
        (r) => r.userId.toString() === userId.toString()
      );

      let isUnread = false;
      if (lastMsg) {
        const sentByMe = lastMsg.sender.toString() === userId.toString();
        if (!sentByMe) {
          if (!myRead) {
            isUnread = true;
          } else {
            isUnread = myRead.messageId.toString() !== lastMsg._id.toString();
          }
        }
      }

      return {
        _id:          t._id,
        subject:      t.subject,
        status:       t.status,
        participants: t.participants,
        lastMessage:  lastMsg
          ? { message: lastMsg.message, createdAt: lastMsg.createdAt }
          : null,
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

// GET /api/support/threads/:id/messages
exports.getMessages = async (req, res) => {
  try {
    const userId = req.user._id;

    const thread = await SupportThread.findById(req.params.id)
      .populate('participants', 'name email role');

    if (!thread) return res.status(404).json({ message: 'Thread not found' });

    const messages = thread.messages.filter(
      (m) => !m.hiddenFrom?.some((id) => id.toString() === userId.toString())
    );

    res.json({ messages, participants: thread.participants, lastReadBy: thread.lastReadBy });
  } catch (err) {
    console.error('getMessages:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/support/threads/:id/messages
// If :id is a studentId (not a threadId), creates a new thread
exports.sendMessage = async (req, res) => {
  try {
    const { id }      = req.params;
    const { message, subject } = req.body;
    const senderId    = req.user._id;

    if (!message?.trim()) {
      return res.status(400).json({ message: 'Message cannot be empty' });
    }
    if (message.trim().length > 2000) {
      return res.status(400).json({ message: 'Message must be under 2000 characters' });
    }

    let thread = await SupportThread.findById(id).catch(() => null);

    // No thread yet — create one using id as the student's userId
    if (!thread) {
      const student = await User.findById(id);
      if (!student) return res.status(404).json({ message: 'Student not found' });

      thread = new SupportThread({
        subject:      sanitize(subject?.trim()) || 'Support Request',
        participants: [student._id, senderId],
        messages:     [],
        lastReadBy:   [],
      });
    }

    thread.messages.push({
      sender:     senderId,
      senderName: req.user.name,
      senderRole: req.user.role,
      message:    sanitize(message.trim()),
    });
    thread.updatedAt = new Date();

    // Mark as read for sender
    const newMsg = thread.messages[thread.messages.length - 1];
    const myRead = thread.lastReadBy?.find(
      (r) => r.userId.toString() === senderId.toString()
    );
    if (myRead) {
      myRead.messageId = newMsg._id;
    } else {
      thread.lastReadBy.push({ userId: senderId, messageId: newMsg._id });
    }

    await thread.save();
    res.status(201).json({ message: newMsg, threadId: thread._id });
  } catch (err) {
    console.error('sendMessage:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// PATCH /api/support/threads/:id/read
exports.markAsRead = async (req, res) => {
  try {
    const userId = req.user._id;
    const thread = await SupportThread.findById(req.params.id);
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

// PATCH /api/support/threads/:id/status
exports.updateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const valid = ['pending', 'in_progress', 'resolved'];
    if (!valid.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const thread = await SupportThread.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    if (!thread) return res.status(404).json({ message: 'Thread not found' });

    res.json({ success: true, status: thread.status });
  } catch (err) {
    console.error('updateStatus:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// PATCH /api/support/threads/:id/messages/:mId
exports.editMessage = async (req, res) => {
  try {
    const { id, mId } = req.params;
    const { message } = req.body;
    const userId = req.user._id;

    if (!message?.trim()) return res.status(400).json({ message: 'Message cannot be empty' });
    if (message.trim().length > 2000) return res.status(400).json({ message: 'Message too long' });

    const thread = await SupportThread.findById(id);
    if (!thread) return res.status(404).json({ message: 'Thread not found' });

    const msg = thread.messages.id(mId);
    if (!msg) return res.status(404).json({ message: 'Message not found' });
    if (msg.sender.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'You can only edit your own messages' });
    }

    msg.message = sanitize(message.trim());
    msg.edited  = true;
    await thread.save();

    res.json({ success: true, message: msg });
  } catch (err) {
    console.error('editMessage:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// DELETE /api/support/threads/:id/messages/:mId
exports.deleteMessage = async (req, res) => {
  try {
    const { id, mId } = req.params;
    const userId = req.user._id;

    const thread = await SupportThread.findById(id);
    if (!thread) return res.status(404).json({ message: 'Thread not found' });

    const msg = thread.messages.id(mId);
    if (!msg) return res.status(404).json({ message: 'Message not found' });
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

// DELETE /api/support/threads/:id/messages/:mId/me
exports.deleteMessageForMe = async (req, res) => {
  try {
    const { id, mId } = req.params;
    const userId = req.user._id;

    const thread = await SupportThread.findById(id);
    if (!thread) return res.status(404).json({ message: 'Thread not found' });

    const msg = thread.messages.id(mId);
    if (!msg) return res.status(404).json({ message: 'Message not found' });

    if (!msg.hiddenFrom) msg.hiddenFrom = [];
    const already = msg.hiddenFrom.some((hid) => hid.toString() === userId.toString());
    if (!already) msg.hiddenFrom.push(userId);

    await thread.save();
    res.json({ success: true });
  } catch (err) {
    console.error('deleteMessageForMe:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// DELETE /api/support/threads/:id
exports.deleteThread = async (req, res) => {
  try {
    const thread = await SupportThread.findById(req.params.id);
    if (!thread) return res.status(404).json({ message: 'Thread not found' });

    await thread.deleteOne();
    res.json({ success: true });
  } catch (err) {
    console.error('deleteThread:', err);
    res.status(500).json({ message: 'Server error' });
  }
};