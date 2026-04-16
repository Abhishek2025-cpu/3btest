// // File: routes/chatRoutes.js
// const express = require('express');
// const router = express.Router();
// const chatController = require('../controllar/chatController');

// // REST API endpoints
// router.post('/send', chatController.sendMessage); // Client/Admin sends a message
// router.post('/reply', chatController.adminReply); // Admin replies to user (optional)
// router.get('/user/:userId', chatController.getUserChats); // Fetch user chat history
// router.get('/admin/all', chatController.getAllChatsForAdmin); // Admin fetches all messages

// module.exports = router;


const express = require('express');
const router = express.Router();

const chatController = require('../controllar/chatController');
const { checkPermission } = require('../middleware/checkPermission');

/**
 * 🔐 SEND MESSAGE (Client/Admin chat send)
 */
router.post(
  '/send',
  checkPermission('users.clients.chat'),
  chatController.sendMessage
);

/**
 * 🔐 ADMIN REPLY
 */
router.post(
  '/reply',
  checkPermission('users.clients.chat'),
  chatController.adminReply
);

/**
 * 🔐 GET USER CHAT HISTORY
 */
router.get(
  '/user/:userId',
  checkPermission('users.clients.chat'),
  chatController.getUserChats
);

/**
 * 🔐 GET ALL CHATS (ADMIN PANEL)
 */
router.get(
  '/admin/all',
  checkPermission('users.clients.chat'),
  chatController.getAllChatsForAdmin
);

module.exports = router;
