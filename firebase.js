const admin = require('firebase-admin');

try {
  // Read JSON content from the environment variable
  const firebaseConfig = JSON.parse(process.env.FIREBASE_CONFIG);

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(firebaseConfig),
    });
    console.log('✅ Firebase Admin initialized using Secret Manager config');
  }
} catch (error) {
  console.error('❌ Failed to initialize Firebase Admin:', error.message);
}

module.exports = admin;
