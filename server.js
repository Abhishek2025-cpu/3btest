const express = require('express');
const dotenv = require('dotenv');

const connectDB = require('./config/db');

const path = require('path');
const fs = require('fs');

const cors = require('cors');
dotenv.config();
const app = express();



// Middleware
app.use(cors());
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));


// Connect to MongoDB
connectDB();

// Routes
const productUploadRoutes = require('./routes/productUploadRoutes');
app.use('/api/products', productUploadRoutes);






// Default route
app.get('/', (req, res) => res.send('API is running...'));

// Start server
const PORT = process.env.PORT || 2000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
