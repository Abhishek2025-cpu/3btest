const multer = require('multer');
const path = require('path');

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'image/jpeg', 'image/png', 'image/jpg', 'image/webp'
  ];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedTypes.includes(file.mimetype) || ['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('❌ Only image files allowed'), false);
  }
};

const limits = { fileSize: 100 * 1024 * 1024 };

const uploader = multer({ storage, fileFilter, limits });

module.exports = {
  uploadProduct: uploader
};
