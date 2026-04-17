const Feedback = require('../models/Feedback');
const { createNotification } = require('../utils/notificationHelper');

// ── Input sanitizer helper ──
const sanitizeString = (str) => {
  if (!str) return str;
  return str
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    // .replace(/\//g, '&#x2F;');
};

// ── Input length limits ──
const LIMITS = {
  subject: 200,
  description: 5000,
  teacherName: 100,
  location: 200,
  dateTime: 100,
  otherSpecification: 300,
  message: 2000,
};

// @desc    Submit new feedback with media
exports.submitFeedback = async (req, res) => {
  try {
    const { category, subject, teacherName, description, priority, location, dateTime, isAnonymous, otherSpecification } = req.body;

    if (!category || !subject || !description) {
      return res.status(400).json({
        success: false,
        message: 'Please provide category, subject, and description'
      });
    }

    if (subject.length > LIMITS.subject) {
      return res.status(400).json({ success: false, message: `Subject must be under ${LIMITS.subject} characters` });
    }
    if (description.length > LIMITS.description) {
      return res.status(400).json({ success: false, message: `Description must be under ${LIMITS.description} characters` });
    }
    if (teacherName && teacherName.length > LIMITS.teacherName) {
      return res.status(400).json({ success: false, message: `Teacher name must be under ${LIMITS.teacherName} characters` });
    }
    if (otherSpecification && otherSpecification.length > LIMITS.otherSpecification) {
      return res.status(400).json({ success: false, message: `Specification must be under ${LIMITS.otherSpecification} characters` });
    }

    const allowedPriorities = ['Low', 'Medium', 'High'];
    if (priority && !allowedPriorities.includes(priority)) {
      return res.status(400).json({ success: false, message: 'Invalid priority value' });
    }

    const feedbackData = {
      student: req.user.id,
      isAnonymous: isAnonymous || false,
      category,
      subject: sanitizeString(subject),
      teacherName: sanitizeString(teacherName) || '',
      description: sanitizeString(description),
      priority: priority || 'Medium',
      location: sanitizeString(location) || 'TMC Main Campus',
      dateTime: (dateTime) || '',
      otherSpecification: sanitizeString(otherSpecification) || null,
    };

    if (req.files && req.files.length > 0) {
      if (req.files.length > 5) {
        return res.status(400).json({ success: false, message: 'Maximum 5 files allowed' });
      }
      feedbackData.media = req.files.map(file => ({
        url: file.path,
        publicId: file.filename,
        type: file.mimetype.startsWith('video/') ? 'video' : 'image'
      }));
    }

    const feedback = await Feedback.create(feedbackData);

    await feedback.populate('student', 'name studentId email yearLevel section');
    await feedback.populate('category', 'name');

   await createNotification({
  type: 'status_changed',
  title: '🔄 Feedback Status Updated',
  message: `"${feedback.subject}" changed from ${oldStatus} → ${status}`,
  feedbackId: feedback._id,
  studentName: feedback.student?.name || '',
  targetRoles: ['admin', 'staff'],
  excludeUserId: req.user.id,
});

    res.status(201).json({
      success: true,
      message: 'Feedback submitted successfully',
      feedback
    });
  } catch (error) {
    console.error('Submit feedback error:', error);
    res.status(500).json({
      success: false,
      message: 'Error submitting feedback',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get student's own feedback
exports.getMyFeedback = async (req, res) => {
  try {
    const { status, search } = req.query;

    let query = { student: req.user.id };

    if (status && status !== 'All') {
      const allowedStatuses = ['Pending', 'Under Review', 'Resolved', 'Rejected'];
      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({ success: false, message: 'Invalid status value' });
      }
      query.status = status;
    }

    if (search) {
      if (search.length > 100) {
        return res.status(400).json({ success: false, message: 'Search term too long' });
      }
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { subject: { $regex: escapedSearch, $options: 'i' } },
        { description: { $regex: escapedSearch, $options: 'i' } },
        { teacherName: { $regex: escapedSearch, $options: 'i' } }
      ];
    }

    const feedback = await Feedback.find(query)
      .populate('category', 'name icon')
      .populate('adminResponse.respondedBy', 'name')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: feedback.length,
      feedback
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching feedback',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get single feedback by ID
exports.getFeedbackById = async (req, res) => {
  try {
    const feedback = await Feedback.findById(req.params.id)
      .populate('student', 'name studentId email phoneNumber yearLevel section')
      .populate('category', 'name icon description')
      .populate('adminResponse.respondedBy', 'name email role')
      .populate('statusHistory.changedBy', 'name role')
      .populate('lastUpdatedBy', 'name role');

    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: 'Feedback not found'
      });
    }

    if (req.user.role === 'student' && feedback.student._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this feedback'
      });
    }

    const feedbackObj = feedback.toObject();

    if (feedbackObj.isAnonymous && req.user.role !== 'admin' && req.user.role !== 'student') {
      feedbackObj.student = {
        name: 'Anonymous Student',
        studentId: null,
        email: null,
        phoneNumber: null,
        yearLevel: null,
        section: null
      };
    }

    res.status(200).json({
      success: true,
      feedback: feedbackObj
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching feedback',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get all feedback (Admin & Staff)
exports.getAllFeedback = async (req, res) => {
  try {
    const { status, category, dateFrom, dateTo, search, priority } = req.query;

    let query = {};

    if (status && status !== 'All') {
      const allowedStatuses = ['Pending', 'Under Review', 'Resolved', 'Rejected'];
      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({ success: false, message: 'Invalid status value' });
      }
      query.status = status;
    }

    if (category) {
      query.category = category;
    }

    if (priority && priority !== 'All') {
      const allowedPriorities = ['Low', 'Medium', 'High'];
      if (!allowedPriorities.includes(priority)) {
        return res.status(400).json({ success: false, message: 'Invalid priority value' });
      }
      query.priority = priority;
    }

    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) {
        const d = new Date(dateFrom);
        if (isNaN(d.getTime())) {
          return res.status(400).json({ success: false, message: 'Invalid dateFrom value' });
        }
        query.createdAt.$gte = d;
      }
      if (dateTo) {
        const d = new Date(dateTo);
        if (isNaN(d.getTime())) {
          return res.status(400).json({ success: false, message: 'Invalid dateTo value' });
        }
        query.createdAt.$lte = d;
      }
    }

    if (search) {
      if (search.length > 100) {
        return res.status(400).json({ success: false, message: 'Search term too long' });
      }
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { subject: { $regex: escapedSearch, $options: 'i' } },
        { description: { $regex: escapedSearch, $options: 'i' } },
        { teacherName: { $regex: escapedSearch, $options: 'i' } }
      ];
    }

    const feedback = await Feedback.find(query)
      .populate('student', 'name studentId email yearLevel section profilePicture')
      .populate('category', 'name icon')
      .populate('adminResponse.respondedBy', 'name role')
      .populate('lastUpdatedBy', 'name role')
      .populate('statusHistory.changedBy', 'name role') // ✅ ADDED: populate changedBy so activity log shows real names
      .sort({ createdAt: -1 });

    const processedFeedback = feedback.map(item => {
      const itemObj = item.toObject();

      if (itemObj.isAnonymous && req.user.role !== 'admin') {
        itemObj.student = {
          name: 'Anonymous Student',
          studentId: null,
          email: null,
          yearLevel: null,
          section: null,
          profilePicture: null,
        };
      }

      return itemObj;
    });

    res.status(200).json({
      success: true,
      count: processedFeedback.length,
      feedback: processedFeedback
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching feedback',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Update feedback status (Admin & Staff)
exports.updateFeedbackStatus = async (req, res) => {
  try {
    const { status, comment } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Please provide status'
      });
    }

    const allowedStatuses = ['Pending', 'Under Review', 'Resolved', 'Rejected'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status value' });
    }

    if (comment && comment.length > LIMITS.message) {
      return res.status(400).json({ success: false, message: `Comment must be under ${LIMITS.message} characters` });
    }

    const feedback = await Feedback.findById(req.params.id)
      .populate('student', 'name');

    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: 'Feedback not found'
      });
    }

    const oldStatus = feedback.status;

    feedback.status = status;
    feedback.lastUpdatedBy = req.user.id;

    if (comment) {
      feedback.adminResponse = {
        comment: sanitizeString(comment),
        respondedBy: req.user.id,
        respondedAt: new Date()
      };
    }

    feedback.statusHistory.push({
      status,
      changedBy: req.user.id,
      changedAt: new Date(),
      comment: sanitizeString(comment) || ''
    });

    feedback.isRead = true;
    await feedback.save();

    if (oldStatus !== status) {
      await createNotification({
        type: 'status_changed',
        title: '🔄 Feedback Status Updated',
        message: `"${feedback.subject}" changed from ${oldStatus} → ${status}`,
        feedbackId: feedback._id,
        studentName: feedback.student?.name || '',
        targetRoles: ['admin', 'staff'],
      });
    }

    await feedback.populate('student', 'name studentId email');
    await feedback.populate('category', 'name');
    await feedback.populate('adminResponse.respondedBy', 'name role');
    await feedback.populate('lastUpdatedBy', 'name role');
    await feedback.populate('statusHistory.changedBy', 'name role');

    res.status(200).json({
      success: true,
      message: 'Feedback status updated successfully',
      feedback
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating feedback status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Delete feedback (Admin only)
exports.deleteFeedback = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized. Admin only.'
      });
    }

    const feedback = await Feedback.findById(req.params.id);

    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: 'Feedback not found'
      });
    }

    if (feedback.media && feedback.media.length > 0) {
      try {
        const { cloudinary } = require('../middleware/cloudinary');
        for (const file of feedback.media) {
          if (file.publicId) {
            await cloudinary.uploader.destroy(file.publicId, {
              resource_type: file.type === 'video' ? 'video' : 'image'
            });
          }
        }
      } catch (cloudinaryError) {
        console.warn('Cloudinary cleanup failed (non-fatal):', cloudinaryError.message);
      }
    }

    await feedback.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Feedback deleted successfully'
    });
  } catch (error) {
    console.error('Delete feedback error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting feedback',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Send message in feedback
exports.sendMessage = async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Message cannot be empty'
      });
    }

    if (message.length > LIMITS.message) {
      return res.status(400).json({
        success: false,
        message: `Message must be under ${LIMITS.message} characters`
      });
    }

    const feedback = await Feedback.findById(req.params.id)
      .populate('student', 'name');

    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: 'Feedback not found'
      });
    }

    const isStudent = feedback.student._id.toString() === req.user.id;
    const isAdminOrStaff = req.user.role === 'admin' || req.user.role === 'staff';

    if (!isStudent && !isAdminOrStaff) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to send messages on this feedback'
      });
    }

    feedback.messages.push({
      sender: req.user.id,
      senderRole: req.user.role,
      message: sanitizeString(message.trim())
    });

    if ((req.user.role === 'admin' || req.user.role === 'staff') && !feedback.adminResponse?.comment) {
      feedback.adminResponse = {
        comment: sanitizeString(message.trim()),
        respondedBy: req.user.id,
        respondedAt: new Date()
      };
    }

    await feedback.save();

    if (req.user.role === 'student') {
      await createNotification({
        type: 'student_reply',
        title: '💬 Student Replied',
        message: `${feedback.student?.name || 'A student'} replied on: "${feedback.subject}"`,
        feedbackId: feedback._id,
        studentName: feedback.student?.name || '',
        targetRoles: ['admin', 'staff'],
      });
    }

    await feedback.populate('messages.sender', 'name role');

    res.status(200).json({
      success: true,
      message: 'Message sent successfully',
      newMessage: feedback.messages[feedback.messages.length - 1]
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending message',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get messages for feedback
exports.getMessages = async (req, res) => {
  try {
    const feedback = await Feedback.findById(req.params.id)
      .populate('messages.sender', 'name role')
      .populate('student', '_id name studentId')
      .populate('lastUpdatedBy', 'name role');

    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: 'Feedback not found'
      });
    }

    const studentId = feedback.student._id.toString();
    const userId = req.user._id ? req.user._id.toString() : req.user.id.toString();
    const isStudent = studentId === userId;
    const isAdminOrStaff = req.user.role === 'admin' || req.user.role === 'staff';

    if (!isStudent && !isAdminOrStaff) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view messages'
      });
    }

    const feedbackObj = feedback.toObject();

    if (feedbackObj.isAnonymous && req.user.role === 'staff') {
      feedbackObj.student = {
        _id: feedbackObj.student._id,
        name: 'Anonymous Student',
        studentId: null
      };
    }

    res.status(200).json({
      success: true,
      feedback: {
        _id: feedbackObj._id,
        subject: feedbackObj.subject,
        status: feedbackObj.status,
        student: feedbackObj.student,
        location: feedbackObj.location,
        dateTime: feedbackObj.dateTime,
        createdAt: feedbackObj.createdAt,
        lastUpdatedBy: feedbackObj.lastUpdatedBy
      },
      messages: feedbackObj.messages
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching messages',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Submit rating for resolved feedback
exports.submitRating = async (req, res) => {
  try {
    const { satisfactionRating, satisfactionComment } = req.body;

    const feedback = await Feedback.findById(req.params.id);

    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: 'Feedback not found'
      });
    }

    if (feedback.student.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only rate your own feedback'
      });
    }

    if (feedback.status !== 'Resolved') {
      return res.status(400).json({
        success: false,
        message: 'You can only rate resolved feedback'
      });
    }

    if (feedback.satisfactionRating) {
      return res.status(400).json({
        success: false,
        message: 'You have already rated this feedback'
      });
    }

    const rating = Number(satisfactionRating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be a whole number between 1 and 5'
      });
    }

    if (satisfactionComment && satisfactionComment.length > 500) {
      return res.status(400).json({
        success: false,
        message: 'Comment must be under 500 characters'
      });
    }

    feedback.satisfactionRating = rating;
    feedback.satisfactionComment = sanitizeString(satisfactionComment) || '';
    feedback.ratedAt = new Date();

    await feedback.save();

    res.json({
      success: true,
      message: 'Rating submitted successfully',
      feedback: {
        _id: feedback._id,
        satisfactionRating: feedback.satisfactionRating,
        satisfactionComment: feedback.satisfactionComment,
        ratedAt: feedback.ratedAt
      }
    });
  } catch (error) {
    console.error('Error submitting rating:', error);
    res.status(500).json({
      success: false,
      message: 'Error submitting rating',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = exports;