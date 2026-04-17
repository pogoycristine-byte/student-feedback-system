const router = require('express').Router();
const ctrl   = require('../controllers/supportController');
const { protect, requireAdmin } = require('../middleware/auth');

router.get('/students',                        protect, requireAdmin, ctrl.getStudents);
router.get('/threads',                         protect, requireAdmin, ctrl.getThreads);
router.get('/threads/:id/messages',            protect, requireAdmin, ctrl.getMessages);
router.post('/threads/:id/messages',           protect, requireAdmin, ctrl.sendMessage);
router.patch('/threads/:id/read',              protect, requireAdmin, ctrl.markAsRead);
router.patch('/threads/:id/status',            protect, requireAdmin, ctrl.updateStatus);
router.patch('/threads/:id/messages/:mId',     protect, requireAdmin, ctrl.editMessage);
router.delete('/threads/:id/messages/:mId/me', protect, requireAdmin, ctrl.deleteMessageForMe);
router.delete('/threads/:id/messages/:mId',    protect, requireAdmin, ctrl.deleteMessage);
router.delete('/threads/:id',                  protect, requireAdmin, ctrl.deleteThread);

module.exports = router;