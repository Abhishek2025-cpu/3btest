const admin = require("firebase-admin");
const path = require("path");

try {
  let serviceAccount;

  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    console.log("📦 Loading Firebase service account from environment variable...");
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  } else {
    console.log("📦 Loading Firebase service account from local JSON file...");
    serviceAccount = require(path.join(__dirname, "serviceAccountKey.json"));
  }

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log("✅ Firebase Admin initialized successfully");
  }

  // DEBUG: check messaging object
  if (!admin.messaging || typeof admin.messaging().sendMulticast !== "function") {
    console.error("❌ admin.messaging().sendMulticast does NOT exist!");
  } else {
    console.log("✅ admin.messaging().sendMulticast() is available");
  }
} catch (error) {
  console.error("❌ Failed to initialize Firebase Admin:", error.message);
  process.exit(1);
}

module.exports = admin; // export the actual admin object
