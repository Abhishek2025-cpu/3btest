// File: socketServer.js
const { Server } = require('socket.io');
const Chat = require('./models/chat');

function initSocket(server) {
  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    console.log('🔌 User connected:', socket.id);

    // Join a user-specific room
    socket.on('join', (userId) => {
      socket.join(userId);
      console.log(`📦 User ${userId} joined room`);
    });

    // Handle sending messages
    socket.on('sendMessage', async ({ senderId, receiverId, message }) => {
      if (!senderId || !receiverId || !message) return;

      try {
        const chat = await Chat.create({ senderId, receiverId, message });

        // Send to receiver in their room
        io.to(receiverId).emit('receiveMessage', chat);
      } catch (err) {
        console.error('❌ Message save failed:', err.message);
      }
    });

    socket.on('disconnect', () => {
      console.log('❎ User disconnected:', socket.id);
    });
  });
}

module.exports = initSocket;







// File: socketServer.js
// const { Server } = require('socket.io');
// const Chat = require('./models/Chat');
// const uploadToGCS = require('./utils/gcsUploader');

// function initSocket(server) {
//   const io = new Server(server, {
//     cors: {
//       origin: '*',
//       methods: ['GET', 'POST']
//     }
//   });

//   io.on('connection', (socket) => {
//     console.log('🔌 User connected:', socket.id);

//     // Join a user-specific room
//     socket.on('join', (userId) => {
//       socket.join(userId);
//       console.log(`📦 User ${userId} joined room`);
//     });

//     // Handle sending messages with optional file
//     socket.on('sendMessage', async ({ senderId, receiverId, message, file }) => {
//       if (!senderId || !receiverId || (!message && !file)) return;

//       try {
//         let fileUrl = '';
//         let fileType = '';

//         // If file is base64, upload to GCS
//         if (file && file.data && file.name && file.mimetype) {
//           const buffer = Buffer.from(file.data, 'base64');

//           const fileObj = {
//             originalname: file.name,
//             mimetype: file.mimetype,
//             buffer: buffer
//           };

//           fileUrl = await uploadToGCS(fileObj);
//           fileType = file.mimetype.split('/')[0];
//         }

//         const chat = await Chat.create({ senderId, receiverId, message, fileUrl, fileType });

//         io.to(receiverId).emit('receiveMessage', chat);
//       } catch (err) {
//         console.error('❌ Message save failed:', err.message);
//       }
//     });

//     socket.on('disconnect', () => {
//       console.log('❎ User disconnected:', socket.id);
//     });
//   });
// }

// module.exports = initSocket;


// const { Storage } = require('@google-cloud/storage');
// const path = require('path');
// const { v4: uuidv4 } = require('uuid');

// const storage = new Storage({
//   keyFilename: path.join(__dirname, '../gcs-key.json'), // Replace with your GCS key path
// });

// const bucketName = 'your-gcs-bucket-name'; // Replace with your GCS bucket
// const bucket = storage.bucket(bucketName);

// const uploadToGCS = (file) => {
//   return new Promise((resolve, reject) => {
//     const newFileName = `${uuidv4()}-${file.originalname}`;
//     const blob = bucket.file(newFileName);
//     const blobStream = blob.createWriteStream({
//       resumable: false,
//       contentType: file.mimetype,
//     });

//     blobStream.on('error', (err) => reject(err));

//     blobStream.on('finish', () => {
//       const publicUrl = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;
//       resolve(publicUrl);
//     });

//     blobStream.end(file.buffer);
//   });
// };

// module.exports = uploadToGCS;


// const uploadToGCS = require('../utils/gcsUploader');

// exports.sendMessage = async (req, res) => {
//   try {
//     const { senderId, receiverId, message } = req.body;
//     let fileUrl = '';
//     let fileType = '';

//     if (req.file) {
//       fileUrl = await uploadToGCS(req.file);
//       fileType = req.file.mimetype.split('/')[0]; // e.g., 'image', 'video', etc.
//     }

//     if (!message && !fileUrl) {
//       return res.status(400).json({ success: false, message: "Either message or file is required." });
//     }

//     const chat = await Chat.create({
//       senderId,
//       receiverId,
//       message,
//       fileUrl,
//       fileType
//     });

//     res.status(201).json({ success: true, data: chat });
//   } catch (err) {
//     res.status(500).json({ success: false, message: err.message });
//   }
// };


// const multer = require('multer');

// const storage = multer.memoryStorage(); // because we stream to GCS
// const upload = multer({ storage });

// module.exports = upload;

// const upload = require('../middlewares/upload');

// router.post('/send', upload.single('file'), chatController.sendMessage);

