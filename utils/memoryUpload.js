const multer = require('multer');

// Configure multer to store files in memory as buffers
const storage = multer.memoryStorage();

const memoryUpload = multer({ storage });

module.exports = memoryUpload;