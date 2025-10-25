
const admin = require("./firebase"); // firebase.js

async function testNotification() {
  const fcmTokens = ["eInKZ1btSPGjbXdKxoM3pw:APA91bEcQ3OAP6SREEsY3tEmbsUNQTsaS5TU5yrsj_o_eHtIdDRKhjzATC89yafauZUJt1Up1qYiT0A78lJ6M8vg_KTkMz9EQMVNr8Hm1MuIppolrp85EV0"];
  
  const message = {
    tokens: fcmTokens,
    notification: { title: "Test", body: "Hello!" }
  };

  const response = await admin.messaging().sendMulticast(message);
  console.log("✅ Sent:", response.successCount, "success,", response.failureCount, "failed");
}

testNotification();
