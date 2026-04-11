const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const rateLimit = require('express-rate-limit');
const cron = require('node-cron');

dotenv.config();

const app = express();

// ── Security Middleware (before everything) ──
app.use(helmet());

app.use(cors({
  origin: process.env.FRONTEND_URL,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

app.use(mongoSanitize()); // blocks MongoDB injection
app.use(xss());           // blocks XSS attacks

// ── Rate Limiters ──
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { success: false, message: 'Too many requests, please try again later.' }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // stricter for login/auth
  message: { success: false, message: 'Too many login attempts, please try again later.' }
});

app.use(globalLimiter);

// ── Body Parsers ──
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Database ──
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ MongoDB Connected Successfully'))
.catch((err) => console.error('❌ MongoDB Connection Error:', err));

// ── Routes ──
const authRoutes          = require('./routes/auth');
const feedbackRoutes      = require('./routes/feedback');
const categoryRoutes      = require('./routes/category');
const userRoutes          = require('./routes/user');
const analyticsRoutes     = require('./routes/analytics');
const announcementRoutes  = require('./routes/announcements');
const messageRoutes       = require('./routes/messages');
const notificationRoutes  = require('./routes/notifications'); // ✅ NEW

app.use('/api/auth',          authLimiter, authRoutes);  // stricter limit on auth
app.use('/api/feedback',      feedbackRoutes);
app.use('/api/categories',    categoryRoutes);
app.use('/api/users',         userRoutes);
app.use('/api/analytics',     analyticsRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/messages',      messageRoutes);
app.use('/api/notifications', notificationRoutes); // ✅ NEW

app.get('/', (req, res) => {
  res.json({ 
    success: true,
    message: 'Student Feedback System API is running!',
    version: '1.0.0'
  });
});

// ── 404 Handler ──
app.use((req, res) => {
  res.status(404).json({ 
    success: false, 
    message: 'Route not found' 
  });
});

// ── Multer/upload error handler ──
app.use((err, req, res, next) => {
  console.error('❌ Upload/Multer error:', err.message);

  if (err.name === 'MulterError') {
    return res.status(400).json({
      success: false,
      message: `Upload error: ${err.message}`,
    });
  }

  if (err.message === 'Only images and videos are allowed') {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }

  next(err);
});

// ── General error handler ──
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err.stack);
  res.status(500).json({ 
    success: false, 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// ── Overdue feedback checker — replaced setInterval with node-cron ──
const Feedback = require('./models/Feedback');
const { createNotification } = require('./utils/notificationHelper');

const checkOverdueFeedback = async () => {
  try {
    const fiveDaysAgo = new Date();
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
    const overdue = await Feedback.find({
      status: { $in: ['Pending', 'Under Review'] },
      createdAt: { $lte: fiveDaysAgo },
    }).populate('student', 'name');

    for (const item of overdue) {
      await createNotification({
        type: 'overdue_feedback',
        title: '⚠️ Overdue Feedback',
        message: `"${item.subject}" from ${item.student?.name || 'a student'} is overdue and unresolved.`,
        feedbackId: item._id,
        studentName: item.student?.name || '',
        targetRoles: ['admin', 'staff'],
      });
    }
  } catch (err) {
    console.error('Overdue check error:', err.message);
  }
};

// ✅ Replaced setInterval with node-cron (more reliable)
cron.schedule('*/10 * * * *', checkOverdueFeedback);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
});

module.exports = app;