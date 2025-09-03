const admin = require("firebase-admin");
const serviceAccount = require("./firebase-service-account.json"); // download from Firebase console

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

module.exports = admin;
