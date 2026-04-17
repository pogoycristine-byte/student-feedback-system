const admin = require('./firebaseAdmin');

const sendPushNotification = async (fcmToken, title, body) => {
  if (!fcmToken) return;
  try {
    await admin.messaging().send({
      token: fcmToken,
      notification: { title, body },
    });
    console.log('✅ Push notification sent');
  } catch (error) {
    console.error('❌ Push notification error:', error.message);
  }
};

module.exports = sendPushNotification;