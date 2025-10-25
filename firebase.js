
const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

if (!admin.apps.length) {
  const serviceAccount = process.env.FIREBASE_KEY
    ? JSON.parse(process.env.FIREBASE_KEY)
    : require(path.join(__dirname, "serviceAccountKey.json")); // <-- make sure this exists

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

module.exports = admin;
