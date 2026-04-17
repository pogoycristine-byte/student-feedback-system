const router = require('express').Router();
const ctrl   = require('../controllers/supportController');
const { protect, requireAdmin } = require('../middleware/auth');

// ── Student routes (any authenticated user) ───────────────────────────────
router.post('/threads/:id/messages',           protect, ctrl.sendMessage);
router.get('/threads/:id/messages',            protect, ctrl.getMessages);   // ← was admin-only
router.patch('/threads/:id/read',              protect, ctrl.markAsRead);    // ← was admin-only

// ── Admin-only routes ─────────────────────────────────────────────────────
router.get('/students',                        protect, requireAdmin, ctrl.getStudents);
router.get('/threads',                         protect, requireAdmin, ctrl.getThreads);
router.patch('/threads/:id/status',            protect, requireAdmin, ctrl.updateStatus);
router.patch('/threads/:id/messages/:mId',     protect, requireAdmin, ctrl.editMessage);
router.delete('/threads/:id/messages/:mId/me', protect, requireAdmin, ctrl.deleteMessageForMe);
router.delete('/threads/:id/messages/:mId',    protect, requireAdmin, ctrl.deleteMessage);
router.delete('/threads/:id',                  protect, requireAdmin, ctrl.deleteThread);

module.exports = router;