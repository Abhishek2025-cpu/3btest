// File: routes/chatRoutes.js
const express = require('express');
const router = express.Router();
const chatController = require('../controllar/chatController');

// REST API endpoints
router.post('/send', chatController.sendMessage); // Client/Admin sends a message
router.post('/reply', chatController.adminReply); // Admin replies to user (optional)
router.get('/user/:userId', chatController.getUserChats); // Fetch user chat history
router.get('/admin/all', chatController.getAllChatsForAdmin); // Admin fetches all messages

module.exports = router;
