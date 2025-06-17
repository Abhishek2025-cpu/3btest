// uploadMiddleware.js
const multer = require('multer');
const path = require('path');

const storage = multer.memoryStorage(); // store in memory for streaming to GCS

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    if (!['.jpg', '.jpeg', '.png'].includes(ext.toLowerCase())) {
      return cb(new Error('Only images are allowed'));
    }
    cb(null, true);
  },
});

module.exports = upload;
