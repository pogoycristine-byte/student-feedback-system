const admin = require('./firebaseAdmin');

const sendPushNotification = async (fcmToken, title, body) => {
  if (!fcmToken) return;
  try {
    await admin.messaging().send({
      token: fcmToken,
      notification: { title, body },
      data: { title, body },
      android: { priority: 'high' },
    });
    console.log('✅ Push notification sent');
  } catch (error) {
    console.error('❌ Push notification error:', error.message);
  }
};

module.exports = sendPushNotification;