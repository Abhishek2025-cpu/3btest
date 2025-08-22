// /middleware/uploadMiddleware.js

const multer = require('multer');
const path = require('path');

const storage = multer.memoryStorage(); // store in memory for streaming to GCS

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

// --- Specific Middlewares ---

const uploadVerificationDoc = upload.single('verificationDocument');
const uploadProfilePic = upload.single('profilePicture');

// === NEW MIDDLEWARE FOR RETURN REQUESTS ===
// This middleware is configured to look for the 'boxImages' and 'damagedPieceImages' fields.
const uploadReturnRequestImages = upload.fields([
  { name: 'boxImages', maxCount: 5 },
  { name: 'damagedPieceImages', maxCount: 5 },
]);
// === END NEW MIDDLEWARE ===


// We now export an object containing all the middlewares.
module.exports = {
  upload, 
  uploadVerificationDoc,
  uploadProfilePic,
  // === ADD THE NEW MIDDLEWARE TO EXPORTS ===
  uploadReturnRequestImages, 
};