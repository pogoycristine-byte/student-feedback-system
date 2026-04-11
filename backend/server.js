const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const rateLimit = require('express-rate-limit');
const cron = require('node-cron');

dotenv.config();

const app = express();

// ── Security Middleware (before everything) ──
app.use(helmet());

// ── CORS: allow specific trusted origins only ──
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:3000',
  'http://localhost:3001',
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

app.use(mongoSanitize());
app.use(xss());
app.use(hpp());

// ✅ MOVED: health check before rate limiter so Render's pings don't get 429'd and crash the server
app.get('/', (req, res) => {
  res.json({ 
    success: true,
    message: 'Student Feedback System API is running!',
    version: '1.0.0'
  });
});

// ── Rate Limiters ──
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, message: 'Too many requests, please try again later.' }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: 'Too many login attempts, please try again later.' }
});

app.use(globalLimiter);

// ── Body Parsers ──
app.use(express.json({ limit: '50kb' }));
app.use(express.urlencoded({ extended: true, limit: '50kb' }));

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
const notificationRoutes  = require('./routes/notifications');

app.use('/api/auth',          authLimiter, authRoutes);
app.use('/api/feedback',      feedbackRoutes);
app.use('/api/categories',    categoryRoutes);
app.use('/api/users',         userRoutes);
app.use('/api/analytics',     analyticsRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/messages',      messageRoutes);
app.use('/api/notifications', notificationRoutes);

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

// ── Overdue feedback checker ──
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

cron.schedule('*/10 * * * *', checkOverdueFeedback);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
});

module.exports = app;