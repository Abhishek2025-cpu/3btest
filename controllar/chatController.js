const Chat = require('../models/chat');
const { uploadBufferToGCS } = require('../utils/gcsUploader'); // ensure correct path
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ storage });

// POST: Send a message or file
exports.sendMessage = [
  upload.single('file'),
  async (req, res) => {
    try {
      const { senderId, receiverId, message } = req.body;
      const file = req.file;

      if (!senderId || !receiverId) {
        return res.status(400).json({ success: false, message: "senderId and receiverId are required" });
      }

      if (!message && !file) {
        return res.status(400).json({ success: false, message: "Either message or file is required" });
      }

      let mediaUrl = null;
      if (file) {
        mediaUrl = await uploadBufferToGCS(file.buffer, file.originalname, 'chat-files');
      }

      const chat = await Chat.create({
        senderId,
        receiverId,
        message: message || null,
        mediaUrl
      });

      res.status(201).json({ success: true, data: chat });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
];

// GET: Get all chats for a specific user
exports.getUserChats = async (req, res) => {
  try {
    const { userId } = req.params;
    const chats = await Chat.find({
      $or: [{ senderId: userId }, { receiverId: userId }]
    }).sort({ timestamp: 1 });

    res.json({ success: true, data: chats });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET: Admin fetches all messages
exports.getAllChatsForAdmin = async (req, res) => {
  try {
    const chats = await Chat.find({}).sort({ timestamp: -1 });
    res.json({ success: true, data: chats });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST: Admin reply to user
exports.adminReply = [
  upload.single('file'),
  async (req, res) => {
    try {
      const { adminId, userId, message } = req.body;
      const file = req.file;

      if (!adminId || !userId) {
        return res.status(400).json({ success: false, message: "adminId and userId are required" });
      }

      if (!message && !file) {
        return res.status(400).json({ success: false, message: "Either message or file is required" });
      }

      let mediaUrl = null;
      if (file) {
        mediaUrl = await uploadBufferToGCS(file.buffer, file.originalname, 'chat-files');
      }

      const chat = await Chat.create({
        senderId: adminId,
        receiverId: userId,
        message: message || null,
        mediaUrl
      });

      res.status(201).json({ success: true, data: chat });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
];
