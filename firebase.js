const admin = require("firebase-admin");
const path = require("path");

try {
  // Load directly from JSON file
  const serviceAccount = require(path.join(__dirname, "serviceAccountKey.json"));

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

  console.log("✅ Firebase Admin initialized successfully (local)");
} catch (error) {
  console.error("❌ Failed to initialize Firebase Admin:", error.message);
}
