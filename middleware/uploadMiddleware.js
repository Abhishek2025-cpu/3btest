// /middleware/uploadMiddleware.js

const multer = require('multer');
const path = require('path');

const storage = multer.memoryStorage(); // store in memory for streaming to GCS

// This is your existing generic multer configuration. It's the "base" for our specific middlewares.
const upload = multer({
  storage,
  limits: { fileSize: 200 * 1024 * 1024 }, // 200MB limit
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    if (!['.jpg', '.jpeg', '.png'].includes(ext.toLowerCase())) {
      return cb(new Error('Only images are allowed'));
    }
    cb(null, true);
  },
});

// --- NEW SPECIFIC MIDDLEWARES ---

// This middleware is configured to look specifically for a form field named 'verificationDocument'
const uploadVerificationDoc = upload.single('verificationDocument');

// This middleware is configured to look specifically for a form field named 'profilePicture'
const uploadProfilePic = upload.single('profilePicture');


// We now export an object containing all the middlewares.
// This is the most flexible approach.
module.exports = {
  upload, // The original generic instance, in case it's used elsewhere
  uploadVerificationDoc, // The new middleware for registration
  uploadProfilePic,      // The new middleware for profile updates
};