// const Chat = require('../models/chat');

// const User = require('../models/User'); // make sure this exists
// const { uploadBufferToGCS } = require('../utils/gcloud');
// const mongoose = require('mongoose');

// const multer = require('multer');
// const storage = multer.memoryStorage();
// const upload = multer({ storage });


// exports.sendMessage = [
//   upload.single('file'),
//   async (req, res) => {
//     try {
//       const { senderId, receiverId, senderModel, receiverModel, message } = req.body;
//       const file = req.file;

//       if (!senderId || !receiverId || !senderModel || !receiverModel) {
//         return res.status(400).json({ success: false, message: "senderId, receiverId, senderModel, receiverModel are required" });
//       }

//       if (!['User', 'Admin'].includes(senderModel) || !['User', 'Admin'].includes(receiverModel)) {
//         return res.status(400).json({ success: false, message: "Invalid senderModel or receiverModel" });
//       }

//       if (!message && !file) {
//         return res.status(400).json({ success: false, message: "Either message or file is required" });
//       }

//       let mediaUrl = null;
//       if (file) {
//         try {
//           const { url } = await uploadBufferToGCS(file.buffer, file.originalname, 'chat-files');
//           mediaUrl = url;
//         } catch (uploadError) {
//           return res.status(500).json({ success: false, message: 'File upload failed', error: uploadError.message });
//         }
//       }

//       const chat = await Chat.create({
//         senderId,
//         senderModel,
//         receiverId,
//         receiverModel,
//         message: message || null,
//         mediaUrl
//       });

//       res.status(201).json({ success: true, data: chat });
//     } catch (err) {
//       res.status(500).json({ success: false, message: err.message });
//     }
//   }
// ];

// exports.getUserChats = async (req, res) => {
//   try {
//     const { userId } = req.params;
//     const chats = await Chat.find({
//       $or: [{ senderId: userId }, { receiverId: userId }]
//     }).sort({ timestamp: 1 });

//     const populatedChats = await Promise.all(chats.map(async chat => {
//       const SenderModel = mongoose.model(chat.senderModel);
//       const ReceiverModel = mongoose.model(chat.receiverModel);
//       const sender = await SenderModel.findById(chat.senderId).select('name');
//       const receiver = await ReceiverModel.findById(chat.receiverId).select('name');
//       return {
//         ...chat.toObject(),
//         sender,
//         receiver
//       };
//     }));

//     res.json({ success: true, data: populatedChats });
//   } catch (err) {
//     res.status(500).json({ success: false, message: err.message });
//   }
// };

// exports.getAllChatsForAdmin = async (req, res) => {
//   try {
//     const chats = await Chat.find({}).sort({ timestamp: -1 });

//     const populatedChats = await Promise.all(chats.map(async chat => {
//       const SenderModel = mongoose.model(chat.senderModel);
//       const ReceiverModel = mongoose.model(chat.receiverModel);
//       const sender = await SenderModel.findById(chat.senderId).select('name');
//       const receiver = await ReceiverModel.findById(chat.receiverId).select('name');
//       return {
//         ...chat.toObject(),
//         sender,
//         receiver
//       };
//     }));

//     res.json({ success: true, data: populatedChats });
//   } catch (err) {
//     res.status(500).json({ success: false, message: err.message });
//   }
// };

// exports.adminReply = [
//   upload.single('file'),
//   async (req, res) => {
//     try {
//       const { adminId, userId, message } = req.body;
//       const file = req.file;

//       if (!adminId || !userId) {
//         return res.status(400).json({ success: false, message: "adminId and userId are required" });
//       }

//       if (!message && !file) {
//         return res.status(400).json({ success: false, message: "Either message or file is required" });
//       }

//       let mediaUrl = null;
//       if (file) {
//         const { url } = await uploadBufferToGCS(file.buffer, file.originalname, 'chat-files');
//         mediaUrl = url;
//       }

//       const newChat = await Chat.create({
//         senderId: adminId,
//         senderModel: 'Admin',
//         receiverId: userId,
//         receiverModel: 'User',
//         message: message || null,
//         mediaUrl
//       });

//       const SenderModel = mongoose.model('Admin');
//       const ReceiverModel = mongoose.model('User');
//       const sender = await SenderModel.findById(adminId).select('name');
//       const receiver = await ReceiverModel.findById(userId).select('name');

//       res.status(201).json({
//         success: true,
//         data: {
//           ...newChat.toObject(),
//           sender,
//           receiver
//         }
//       });
//     } catch (err) {
//       res.status(500).json({ success: false, message: err.message });
//     }
//   }
// ];





const Chat = require('../models/chat');
const User = require('../models/User');
const Admin = require('../models/Admin');
const { uploadBufferToGCS } = require('../utils/gcloud');
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ storage });


exports.sendMessage = [
  upload.single('file'),
  async (req, res) => {
    try {
      const senderId = req.body.senderId?.trim();
      const receiverId = req.body.receiverId?.trim();
      const message = req.body.message;
      const file = req.file;

      console.log('BODY:', req.body);
      console.log('senderId:', senderId);
      console.log('receiverId:', receiverId);

      if (!senderId || !receiverId) {
        return res.status(400).json({ success: false, message: "senderId and receiverId are required" });
      }

      if (!message && !file) {
        return res.status(400).json({ success: false, message: "Either message or file is required" });
      }

      // Detect sender model
      let senderModel = null;
      if (await User.findById(senderId)) senderModel = 'User';
      else if (await Admin.findById(senderId)) senderModel = 'Admin';
      else return res.status(400).json({ success: false, message: "Invalid senderId" });

      // Detect receiver model
      let receiverModel = null;
      if (await User.findById(receiverId)) receiverModel = 'User';
      else if (await Admin.findById(receiverId)) receiverModel = 'Admin';
      else return res.status(400).json({ success: false, message: "Invalid receiverId" });

      let mediaUrl = null;
      if (file) {
        const { url } = await uploadBufferToGCS(file.buffer, file.originalname, 'chat-files');
        mediaUrl = url;
      }

      const chat = await Chat.create({
        senderId,
        senderModel,
        receiverId,
        receiverModel,
        message: message || null,
        mediaUrl
      });

      res.status(201).json({ success: true, data: chat });
    } catch (err) {
      console.error('Unexpected error:', err);
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

    const ADMIN_ID = "68411a77cdc05295de45af4e";

    // Get unique userIds (excluding ADMIN)
    const userIds = new Set();
    chats.forEach(chat => {
      const senderId = chat.senderId?._id?.toString();
      const receiverId = chat.receiverId?._id?.toString();
      if (senderId !== ADMIN_ID) userIds.add(senderId);
      if (receiverId !== ADMIN_ID) userIds.add(receiverId);
    });

    // Fetch users
    const users = await User.find({ _id: { $in: Array.from(userIds) } }, 'name');
    const userMap = {};
    users.forEach(u => {
      userMap[u._id.toString()] = u.name;
    });

    // Attach names explicitly (if not populated)
    const enrichedChats = chats.map(chat => {
      const senderId = chat.senderId?._id?.toString() || chat.senderId?.toString();
      const receiverId = chat.receiverId?._id?.toString() || chat.receiverId?.toString();

      const sender = {
        _id: senderId,
        name: chat.senderId?.name || userMap[senderId] || 'Unknown'
      };
      const receiver = {
        _id: receiverId,
        name: chat.receiverId?.name || userMap[receiverId] || 'Unknown'
      };

      return {
        ...chat._doc,
        senderId: sender,
        receiverId: receiver
      };
    });

    res.json({ success: true, data: enrichedChats });
  } catch (err) {
    console.error('Error fetching admin chats:', err);
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
