const multer = require('multer');
const path = require('path');

const storage = multer.memoryStorage();
const limits = { fileSize: 100 * 1024 * 1024 };

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'image/jpeg', 'image/png', 'image/jpg', 'image/webp',
    'model/obj', 'application/octet-stream'
  ];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedTypes.includes(file.mimetype) || ext === '.obj') {
    cb(null, true);
  } else {
    cb(new Error('❌ Only image and .obj files are allowed!'), false);
  }
};

const uploader = multer({ storage, fileFilter, limits });

module.exports = {
  uploadCat: uploader,
  uploadPrifle: uploader,
  uploadProduct: uploader // ✅ export multer instance here
};







// uploadPrifle