const { initializeApp, cert } = require("firebase-admin/app");
const { getMessaging } = require("firebase-admin/messaging");
const path = require("path");
const serviceAccount = require(path.join(__dirname, "servicekey.json"));

const app = initializeApp({
  credential: cert(serviceAccount),
});

const messaging = getMessaging(app);

module.exports = { app, messaging }; // ✅ export both
