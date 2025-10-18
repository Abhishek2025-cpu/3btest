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

  // Read Firebase credentials from Cloud Run secret or local file
  if (process.env.FIREBASE_KEY) {
    try {
      serviceAccount = JSON.parse(process.env.FIREBASE_KEY);
    } catch (err) {
      console.error("Invalid JSON in FIREBASE_KEY secret:", err);
      throw err;
    }
  } else if (process.env.FIREBASE_CONFIG) {
    serviceAccount = JSON.parse(process.env.FIREBASE_CONFIG);
  } else {
    // fallback to local file (for local development)
    serviceAccount = require("./serviceAccountKey.json"); // use your local file
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




