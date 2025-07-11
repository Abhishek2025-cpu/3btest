const Chat = require('../models/chat');
const { uploadBufferToGCS } = require('../utils/gcloud');
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ storage });

exports.sendMessage = [
  upload.single('file'),
  async (req, res) => {
    try {
      const { senderId, receiverId, message } = req.body;
      const file = req.file;

      console.log('--- Incoming Request ---');
      console.log('senderId:', senderId);
      console.log('receiverId:', receiverId);
      console.log('message:', message);
      console.log('file:', file ? {
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size
      } : 'No file received');

      if (!senderId || !receiverId) {
        return res.status(400).json({ success: false, message: "senderId and receiverId are required" });
      }

      if (!message && !file) {
        return res.status(400).json({ success: false, message: "Either message or file is required" });
      }

      let mediaUrl = null;
      if (file) {
        try {
          mediaUrl = await uploadBufferToGCS(file.buffer, file.originalname, 'chat-files');
          console.log('File uploaded to GCS at:', mediaUrl);
        } catch (uploadError) {
          console.error('GCS upload failed:', uploadError.message);
          return res.status(500).json({ success: false, message: 'File upload failed', error: uploadError.message });
        }
      }

      const chat = await Chat.create({
        senderId,
        receiverId,
        message: message || null,
        mediaUrl
      });

      res.status(201).json({ success: true, data: chat });
    } catch (err) {
      console.error('Unexpected error:', err.message);
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
    })
      .sort({ timestamp: 1 })
      .populate('senderId', 'name')    // fetch name only
      .populate('receiverId', 'name');

    res.json({ success: true, data: chats });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};


// GET: Admin fetches all messages
exports.getAllChatsForAdmin = async (req, res) => {
  try {
    const chats = await Chat.find({})
      .sort({ timestamp: -1 })
      .populate('senderId', 'name')
      .populate('receiverId', 'name');

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

      // NEW, CORRECTED CODE
const newChat = await Chat.create({
  senderId: adminId,
  receiverId: userId,
  message: message || null,
  mediaUrl
});

// Find the chat we just created and populate it before sending it back
const populatedChat = await Chat.findById(newChat._id)
  .populate('senderId', 'name')
  .populate('receiverId', 'name');

res.status(201).json({ success: true, data: populatedChat });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
];
