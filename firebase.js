// const { initializeApp, cert } = require("firebase-admin/app");
// const { getMessaging } = require("firebase-admin/messaging");
// const path = require("path");

// const serviceAccount = require(path.join(__dirname, "bprofiles-54714-firebase-adminsdk-fbsvc-035dca421e.json"));

// const app = initializeApp({
//   credential: cert(serviceAccount),
// });

// const messaging = getMessaging(app);

// module.exports = { app, messaging };



const { initializeApp, cert, getApps } = require("firebase-admin/app");
const { getMessaging } = require("firebase-admin/messaging");

let serviceAccount;

// ✅ Use env var on Render, fallback to JSON locally
if (process.env.FIREBASE_CONFIG) {
  serviceAccount = JSON.parse(process.env.FIREBASE_CONFIG);
} else {
  serviceAccount = require("./bprofiles-54714-firebase-adminsdk-fbsvc-95fdab3f70.json");
}

// ✅ Safe initialization
let app;
if (!getApps().length) {
  app = initializeApp({
    credential: cert(serviceAccount),
  });
} else {
  app = getApps()[0];
}

// ✅ Export initialized messaging service
const messaging = getMessaging(app);

module.exports = { app, messaging };


