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
const { sendNotification } = require('../services/notificationService');
const upload = multer({ storage });


// -------------------- SEND MESSAGE --------------------
exports.sendMessage = [
  // Multer middleware runs first in this array
  upload.single('file'),
  async (req, res) => {
    console.log('✨ [sendMessage] - Function execution started.');
    console.log('✨ [sendMessage] - Request method:', req.method);
    console.log('✨ [sendMessage] - Request URL:', req.url);
    console.log('✨ [sendMessage] - Headers:', req.headers); // Check Authorization header here!

    try {
      console.log('✨ [sendMessage] - After multer: req.body:', req.body);
      console.log('✨ [sendMessage] - After multer: req.file:', req.file);

      const { senderId, receiverId, message } = req.body;
      const file = req.file;

      if (!senderId || !receiverId) {
        console.log('🛑 [sendMessage] - Validation failed: senderId or receiverId missing.');
        return res.status(400).json({ success: false, message: 'senderId and receiverId are required.' });
      }
      if (!message && !file) {
        console.log('🛑 [sendMessage] - Validation failed: Message or file required.');
        return res.status(400).json({ success: false, message: 'A message or a file is required.' });
      }

      console.log(`✨ [sendMessage] - Validated inputs: senderId=${senderId}, receiverId=${receiverId}, hasFile=${!!file}`);

      // Determine sender
      console.log(`🔍 [sendMessage] - Searching for sender: ${senderId}`);
      let sender = await User.findById(senderId) || await Admin.findById(senderId);
      if (!sender) {
        console.log('🛑 [sendMessage] - Sender not found.');
        return res.status(404).json({ success: false, message: 'Sender not found.' });
      }
      console.log(`✅ [sendMessage] - Sender found: ${sender._id} (${sender instanceof User ? 'User' : 'Admin'})`);


      // Determine receiver
      console.log(`🔍 [sendMessage] - Searching for receiver: ${receiverId}`);
      let receiver = await User.findById(receiverId) || await Admin.findById(receiverId);
      if (!receiver) {
        console.log('🛑 [sendMessage] - Receiver not found.');
        return res.status(404).json({ success: false, message: 'Receiver not found.' });
      }
      console.log(`✅ [sendMessage] - Receiver found: ${receiver._id} (${receiver instanceof User ? 'User' : 'Admin'})`);


      // File upload
      let fileUrl = null;
      if (file) {
        console.log(`⬆️ [sendMessage] - File detected: ${file.originalname}, size: ${file.size} bytes`);
        const uploadResult = await uploadBufferToGCS(file.buffer, file.originalname, 'chat-files', file.mimetype); // Pass mimetype
        if (!uploadResult?.url) {
          console.error('❌ [sendMessage] - File upload to GCS failed.');
          throw new Error('File upload failed.');
        }
        fileUrl = uploadResult.url;
        console.log(`✅ [sendMessage] - File uploaded to GCS: ${fileUrl}`);
      } else {
        console.log('➡️ [sendMessage] - No file to upload.');
      }

      // Save chat
      console.log('💾 [sendMessage] - Creating chat entry in DB.');
      const chat = await Chat.create({
        senderId,
        senderModel: sender instanceof User ? 'User' : 'Admin',
        receiverId,
        receiverModel: receiver instanceof User ? 'User' : 'Admin',
        message: message || null,
        mediaUrl: fileUrl
      });
      console.log(`✅ [sendMessage] - Chat saved: ${chat._id}`);


      // ✅ Trigger notification
      try {
        console.log('🔔 [sendMessage] - Attempting to send notification.');
        const senderName = sender.name || 'Someone';
        await sendNotification(
          receiver._id,
          receiver.fcmTokens || [],
          '📩 New Message Received',
          `${senderName}: ${message ? message.substring(0, 50) : 'Sent a file'}`,
          { chatId: chat._id.toString() }
        );
        console.log('✅ [sendMessage] - Notification sent successfully.');
      } catch (notifyErr) {
        console.error("⚠️ [sendMessage] - Failed to send chat notification:", notifyErr.message);
      }

      console.log('🎉 [sendMessage] - Message sent successfully, responding with 201.');
      res.status(201).json({ success: true, data: chat });
    } catch (err) {
      console.error('❌ [sendMessage] - Caught error in try-catch block:', err);
      // Ensure the error response matches the expected JWT error format if it's the actual cause
      if (err.message.includes('JWT')) { // This is a heuristic, the actual error might not come from here
          res.status(401).json({ success: false, message: 'invalid_grant: Invalid JWT Signature.' });
      } else {
          res.status(500).json({ success: false, message: err.message });
      }
    }
  }
];

// -------------------- GET USER CHATS --------------------
exports.getUserChats = async (req, res) => {
  try {
    const { userId } = req.params;
    const chats = await Chat.find({
      $or: [{ senderId: userId }, { receiverId: userId }]
    })
      .sort({ timestamp: 1 })
      .populate('senderId', 'name')
      .populate('receiverId', 'name');

    res.json({ success: true, data: chats });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};


// GET: Admin fetches all messages


 
exports.getAllChatsForAdmin = async (req, res) => {
  try {
    const ADMIN_ID = "68411a77cdc05295de45af4e";

    // 1. Get all chat messages
    const chats = await Chat.find({}).sort({ timestamp: -1 });

    // 2. Extract all unique sender & receiver IDs (excluding duplicates)
    const userIds = new Set();

    chats.forEach(chat => {
      if (chat.senderId && chat.senderId.toString() !== ADMIN_ID) {
        userIds.add(chat.senderId.toString());
      }
      if (chat.receiverId && chat.receiverId.toString() !== ADMIN_ID) {
        userIds.add(chat.receiverId.toString());
      }
    });

    // 3. Fetch user name mappings
    const users = await User.find({ _id: { $in: Array.from(userIds) } }, '_id name');
    const userMap = {};
    users.forEach(user => {
      userMap[user._id.toString()] = user.name;
    });

    // 4. Enrich each chat message with sender and receiver names
    const enrichedChats = chats.map(chat => {
      const senderIdStr = chat.senderId.toString();
      const receiverIdStr = chat.receiverId.toString();

      return {
        ...chat._doc,
        sender: {
          _id: senderIdStr,
          name: senderIdStr === ADMIN_ID ? 'Admin' : userMap[senderIdStr] || 'Unknown',
        },
        receiver: {
          _id: receiverIdStr,
          name: receiverIdStr === ADMIN_ID ? 'Admin' : userMap[receiverIdStr] || 'Unknown',
        },
      };
    });

    res.json({ success: true, data: enrichedChats });
  } catch (err) {
    console.error("Error in getAllChatsForAdmin:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};



// POST: Admin reply to user
// In exports.adminReply

// In exports.adminReply
exports.adminReply = [
  upload.single('file'),
  async (req, res) => {
    try {
      const { adminId, userId, message } = req.body;
      const file = req.file;

      // ... (input validation) ...

      let fileUrl = null; // Changed from mediaDetails
      if (file) {
        const uploadResult = await uploadBufferToGCS(file.buffer, file.originalname, 'chat-files');
        
        if (!uploadResult || !uploadResult.url) {
            throw new Error('File upload failed to return a URL.');
        }

        // FIX: Assign only the URL string
        fileUrl = uploadResult.url; 
      }

      const newChat = await Chat.create({
        senderId: adminId,
        receiverId: userId,
        senderModel: 'Admin',
        receiverModel: 'User',
        message: message || null,
        mediaUrl: fileUrl // <-- Pass the URL string or null
      });
      
      // ... (populate and send response) ...
      res.status(201).json({ success: true, data: newChat });

    } catch (err) {
      console.error('Unexpected error in adminReply:', err);
      res.status(500).json({ success: false, message: err.message });
    }
  }
];
