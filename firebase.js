// utils/firebase.js
const { initializeApp, cert, getApps } = require("firebase-admin/app");
const { getMessaging } = require("firebase-admin/messaging");

let app, messaging;

function initFirebase() {
  if (messaging) return { app, messaging };

  let serviceAccount;

  if (process.env.FIREBASE_KEY) {
    // Cloud Run secret
    serviceAccount = JSON.parse(process.env.FIREBASE_KEY);
  } else {
    // local fallback
    serviceAccount = require("../serviceAccountKey.json");
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
