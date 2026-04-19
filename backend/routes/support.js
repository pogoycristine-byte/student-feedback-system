const router = require('express').Router();
const ctrl   = require('../controllers/supportController');
const { protect, requireAdmin, requireAdminOrStaff } = require('../middleware/auth');

// ── Student routes (any authenticated user) ───────────────────────────────
router.get('/threads/my',                      protect, ctrl.getMyThreads);        // ← MUST be first
router.post('/threads/:id/messages',           protect, ctrl.sendMessage);
router.get('/threads/:id/messages',            protect, ctrl.getMessages);
router.patch('/threads/:id/read',              protect, ctrl.markAsRead);

// ── Admin or Staff routes ─────────────────────────────────────────────────
router.get('/students',                        protect, requireAdminOrStaff, ctrl.getStudents);
router.get('/threads',                         protect, requireAdminOrStaff, ctrl.getThreads);

// ── Admin-only routes ─────────────────────────────────────────────────────
router.patch('/threads/:id/status',            protect, requireAdmin, ctrl.updateStatus);
router.patch('/threads/:id/messages/:mId',     protect, requireAdmin, ctrl.editMessage);
router.delete('/threads/:id/messages/:mId/me', protect, requireAdmin, ctrl.deleteMessageForMe);
router.delete('/threads/:id/messages/:mId',    protect, requireAdmin, ctrl.deleteMessage);
router.delete('/threads/:id',                  protect, requireAdmin, ctrl.deleteThread);

module.exports = router;