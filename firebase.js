// const { initializeApp, cert } = require("firebase-admin/app");
// const { getMessaging } = require("firebase-admin/messaging");
// const path = require("path");

// const serviceAccount = require(path.join(__dirname, "bprofiles-54714-firebase-adminsdk-fbsvc-035dca421e.json"));

// const app = initializeApp({
//   credential: cert(serviceAccount),
// });

// const messaging = getMessaging(app);

// module.exports = { app, messaging };

// firebase.js
// const { initializeApp, cert, getApps } = require("firebase-admin/app");
// const { getMessaging } = require("firebase-admin/messaging");

// let app, messaging;

// function initFirebase() {
//   if (messaging) return { app, messaging };

//   let serviceAccount;

//   if (process.env.FIREBASE_CONFIG) {
//     // On Render → set FIREBASE_CONFIG env var to full JSON string
//     serviceAccount = JSON.parse(process.env.FIREBASE_CONFIG);
//   } else {
//     // Local fallback → use JSON file
//     serviceAccount = require("./bprofiles-54714-firebase-adminsdk-fbsvc-5ae26f5109.json");
//   }

//   if (!getApps().length) {
//     app = initializeApp({
//       credential: cert(serviceAccount),
//     });
//   }

//   messaging = getMessaging();
//   return { app, messaging };
// }

// module.exports = { initFirebase };





// firebase.js
const { initializeApp, cert, getApps } = require("firebase-admin/app");
const { getMessaging } = require("firebase-admin/messaging");

let app, messaging;

function initFirebase() {
  if (messaging) return { app, messaging };

  let serviceAccount;

  if (process.env.FIREBASE_KEY) {
    // Cloud Run injects secret as env variable
    serviceAccount = JSON.parse(process.env.FIREBASE_KEY);
  } else {
    // fallback for local dev
    serviceAccount = require("./serviceAccountKey.json");
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




