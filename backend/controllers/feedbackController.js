const Feedback = require('../models/Feedback');

// @desc    Submit new feedback with media
exports.submitFeedback = async (req, res) => {
  try {
    const { category, subject, teacherName, description, priority, location, dateTime } = req.body;

    if (!category || !subject || !description) {
      return res.status(400).json({
        success: false,
        message: 'Please provide category, subject, and description'
      });
    }

    const feedbackData = {
      student: req.user.id,
      category,
      subject,
      teacherName: teacherName || '',
      description,
      priority: priority || 'Medium',
      location: location || 'TMC Main Campus',
      dateTime: dateTime || ''
    };

    if (req.files && req.files.length > 0) {
      feedbackData.media = req.files.map(file => ({
        url: file.path,
        publicId: file.filename,
        type: file.mimetype.startsWith('video/') ? 'video' : 'image'
      }));
    }

    const feedback = await Feedback.create(feedbackData);

    await feedback.populate('student', 'name studentId email yearLevel section');
    await feedback.populate('category', 'name');

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
      error: error.message
    });
  }
};

// @desc    Get student's own feedback
exports.getMyFeedback = async (req, res) => {
  try {
    const { status, search } = req.query;

    let query = { student: req.user.id };

    if (status && status !== 'All') {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { subject: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { teacherName: { $regex: search, $options: 'i' } }
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
      error: error.message
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

    res.status(200).json({
      success: true,
      feedback
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching feedback',
      error: error.message
    });
  }
};

// @desc    Get all feedback (Admin & Staff)
exports.getAllFeedback = async (req, res) => {
  try {
    const { status, category, dateFrom, dateTo, search, priority } = req.query;

    let query = {};

    if (status && status !== 'All') {
      query.status = status;
    }

    if (category) {
      query.category = category;
    }

    if (priority && priority !== 'All') {
      query.priority = priority;
    }

    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo) query.createdAt.$lte = new Date(dateTo);
    }

    if (search) {
      query.$or = [
        { subject: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { teacherName: { $regex: search, $options: 'i' } }
      ];
    }

    const feedback = await Feedback.find(query)
      .populate('student', 'name studentId email yearLevel section')
      .populate('category', 'name icon')
      .populate('adminResponse.respondedBy', 'name role')
      .populate('lastUpdatedBy', 'name role')
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
      error: error.message
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

    const feedback = await Feedback.findById(req.params.id);

    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: 'Feedback not found'
      });
    }

    feedback.status = status;
    feedback.lastUpdatedBy = req.user.id;

    if (comment) {
      feedback.adminResponse = {
        comment,
        respondedBy: req.user.id,
        respondedAt: new Date()
      };
    }

    feedback.statusHistory.push({
      status,
      changedBy: req.user.id,
      changedAt: new Date(),
      comment: comment || ''
    });

    feedback.isRead = true;
    await feedback.save();

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
      error: error.message
    });
  }
};

// @desc    Delete feedback (Admin & Staff)
exports.deleteFeedback = async (req, res) => {
  try {
    const feedback = await Feedback.findById(req.params.id);

    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: 'Feedback not found'
      });
    }

    // Delete media from Cloudinary if present
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
      error: error.message
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

    const feedback = await Feedback.findById(req.params.id);

    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: 'Feedback not found'
      });
    }

    const isStudent = feedback.student.toString() === req.user.id;
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
      message: message.trim()
    });

    if ((req.user.role === 'admin' || req.user.role === 'staff') && !feedback.adminResponse?.comment) {
      feedback.adminResponse = {
        comment: message.trim(),
        respondedBy: req.user.id,
        respondedAt: new Date()
      };
    }

    await feedback.save();

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
      error: error.message
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
      console.log(`403 getMessages: studentId=${studentId} userId=${userId} role=${req.user.role}`);
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view messages'
      });
    }

    res.status(200).json({
      success: true,
      feedback: {
        _id: feedback._id,
        subject: feedback.subject,
        status: feedback.status,
        student: feedback.student,
        location: feedback.location,
        dateTime: feedback.dateTime,
        createdAt: feedback.createdAt,
        lastUpdatedBy: feedback.lastUpdatedBy
      },
      messages: feedback.messages
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching messages',
      error: error.message
    });
  }
};

// ✅ NEW: Submit rating for resolved feedback
// @desc    Submit rating for resolved feedback
// @route   PUT /api/feedback/:id/rate
// @access  Private (Students only)
exports.submitRating = async (req, res) => {
  try {
    const { satisfactionRating, satisfactionComment } = req.body;
    
    // Find feedback
    const feedback = await Feedback.findById(req.params.id);
    
    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: 'Feedback not found'
      });
    }
    
    // Check if user owns this feedback
    if (feedback.student.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only rate your own feedback'
      });
    }
    
    // Check if feedback is resolved
    if (feedback.status !== 'Resolved') {
      return res.status(400).json({
        success: false,
        message: 'You can only rate resolved feedback'
      });
    }
    
    // Check if already rated
    if (feedback.satisfactionRating) {
      return res.status(400).json({
        success: false,
        message: 'You have already rated this feedback'
      });
    }
    
    // Validate rating
    if (!satisfactionRating || satisfactionRating < 1 || satisfactionRating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5'
      });
    }
    
    // Save rating
    feedback.satisfactionRating = satisfactionRating;
    feedback.satisfactionComment = satisfactionComment || '';
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
      error: error.message
    });
  }
};

module.exports = exports;