const Announcement = require('../models/Announcement');

// GET /api/announcements — all active (students + staff)
exports.getAnnouncements = async (req, res) => {
  try {
    const announcements = await Announcement.find({ isActive: true })
      .populate('createdBy', 'name role')
      .sort({ createdAt: -1 });
    res.json({ success: true, announcements });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// GET /api/announcements/all — all including inactive (admin only)
exports.getAllAnnouncements = async (req, res) => {
  try {
    const announcements = await Announcement.find()
      .populate('createdBy', 'name role')
      .sort({ createdAt: -1 });
    res.json({ success: true, announcements });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// POST /api/announcements — create (admin only)
exports.createAnnouncement = async (req, res) => {
  try {
    const { title, message } = req.body;
    if (!title || !message) {
      return res.status(400).json({ success: false, message: 'Title and message are required' });
    }
    const announcement = await Announcement.create({
      title: title.trim(),
      message: message.trim(),
      createdBy: req.user._id,
    });
    await announcement.populate('createdBy', 'name role');
    res.status(201).json({ success: true, announcement });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// PUT /api/announcements/:id — edit (admin only)
exports.updateAnnouncement = async (req, res) => {
  try {
    const { title, message, isActive } = req.body;
    const announcement = await Announcement.findByIdAndUpdate(
      req.params.id,
      { ...(title && { title: title.trim() }), ...(message && { message: message.trim() }), ...(isActive !== undefined && { isActive }) },
      { new: true }
    ).populate('createdBy', 'name role');
    if (!announcement) return res.status(404).json({ success: false, message: 'Announcement not found' });
    res.json({ success: true, announcement });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// DELETE /api/announcements/:id — delete (admin only)
exports.deleteAnnouncement = async (req, res) => {
  try {
    const announcement = await Announcement.findByIdAndDelete(req.params.id);
    if (!announcement) return res.status(404).json({ success: false, message: 'Announcement not found' });
    res.json({ success: true, message: 'Announcement deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};