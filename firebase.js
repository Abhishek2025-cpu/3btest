const { initializeApp, applicationDefault, cert } = require("firebase-admin/app");
const { getMessaging } = require("firebase-admin/messaging");
const path = require("path");
const serviceAccount = require(path.join(__dirname, "bprofiles-54714-firebase-adminsdk-fbsvc-60025e545e.json"));

const app = initializeApp({
  credential: cert(serviceAccount)
});

const messaging = getMessaging(app);

module.exports = messaging;

