const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isAnonymous: {
    type: Boolean,
    default: false
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: [true, 'Category is required']
  },
  subject: {
    type: String,
    required: [true, 'Subject/Class is required'],
    trim: true
  },
  teacherName: {
    type: String,
    trim: true,
    default: ''
  },
  location: {
    type: String,
    enum: ['TMC Main Campus', 'TMC Expansion', 'TMC Extension'],
    required: [true, 'Location is required']
  },
  dateTime: {
    type: String,
    required: [true, 'Date and time of class is required']
  },
  description: {
    type: String,
    required: [true, 'Feedback description is required'],
    minlength: [10, 'Description must be at least 10 characters']
  },
  media: [
    {
      url: {
        type: String,
        required: true
      },
      publicId: {
        type: String
      },
      type: {
        type: String,
        enum: ['image', 'video'],
        default: 'image'
      }
    }
  ],
  status: {
    type: String,
    enum: ['Pending', 'Under Review', 'Resolved', 'Rejected'],
    default: 'Pending'
  },
  adminResponse: {
    comment: {
      type: String,
      default: ''
    },
    respondedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    respondedAt: {
      type: Date
    }
  },
  managedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  lastUpdatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  messages: [{
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    senderRole: {
      type: String,
      enum: ['student', 'admin', 'staff'],
      required: true
    },
    message: {
      type: String,
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  statusHistory: [{
    status: {
      type: String,
      enum: ['Pending', 'Under Review', 'Resolved', 'Rejected']
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    changedAt: {
      type: Date,
      default: Date.now
    },
    comment: String
  }],
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High'],
    default: 'Medium'
  },
  isRead: {
    type: Boolean,
    default: false
  },
  // ✅ NEW: Rating fields
  satisfactionRating: {
    type: Number,
    min: 1,
    max: 5,
    default: null
  },
  satisfactionComment: {
    type: String,
    default: ''
  },
  ratedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

feedbackSchema.pre('save', function(next) {
  if (!this.isNew && this.isModified('status')) {
    this.statusHistory.push({
      status: this.status,
      changedAt: new Date()
    });
  }
  next();
});

module.exports = mongoose.model('Feedback', feedbackSchema);