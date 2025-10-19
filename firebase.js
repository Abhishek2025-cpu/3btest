const { initializeApp, cert, getApps } = require("firebase-admin/app");
const { getMessaging } = require("firebase-admin/messaging");
const fs = require("fs");
const path = require("path");

let app, messaging;

function initFirebase() {
  if (messaging) return { app, messaging };

  let serviceAccount;

  if (process.env.FIREBASE_KEY) {
    // Cloud Run / Render secret
    serviceAccount = JSON.parse(process.env.FIREBASE_KEY);
  } else {
    // Local fallback only if file exists
    const localPath = path.join(__dirname, "../serviceAccountKey.json");
    if (fs.existsSync(localPath)) {
      serviceAccount = require(localPath);
    } else {
      throw new Error(
        "No Firebase service account found. Set FIREBASE_KEY env or provide local serviceAccountKey.json"
      );
    }
  }

  if (!getApps().length) {
    app = initializeApp({
      credential: cert(serviceAccount),
    });
  }

  messaging = getMessaging();
  return { app, messaging };
}

module.exports = { initFirebase };
