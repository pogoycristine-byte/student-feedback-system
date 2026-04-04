const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ MongoDB Connected Successfully'))
.catch((err) => console.error('❌ MongoDB Connection Error:', err));

const authRoutes         = require('./routes/auth');
const feedbackRoutes     = require('./routes/feedback');
const categoryRoutes     = require('./routes/category');
const userRoutes         = require('./routes/user');
const analyticsRoutes    = require('./routes/analytics');
const announcementRoutes = require('./routes/announcements');
const messageRoutes      = require('./routes/messages'); // ✅ ADDED

app.use('/api/auth',          authRoutes);
app.use('/api/feedback',      feedbackRoutes);
app.use('/api/categories',    categoryRoutes);
app.use('/api/users',         userRoutes);
app.use('/api/analytics',     analyticsRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/messages',      messageRoutes); // ✅ ADDED

app.get('/', (req, res) => {
  res.json({ 
    success: true,
    message: 'Student Feedback System API is running!',
    version: '1.0.0'
  });
});

app.use((req, res) => {
  res.status(404).json({ 
    success: false, 
    message: 'Route not found' 
  });
});

// Multer/upload error handler
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

// General error handler
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err.stack);
  res.status(500).json({ 
    success: false, 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
});

module.exports = app;