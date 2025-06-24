const express = require('express');
const dotenv = require('dotenv');

const connectDB = require('./config/db');

const path = require('path');
const fs = require('fs');

const cors = require('cors');
dotenv.config();
const app = express();



// Middleware
app.use(cors({
  origin: ['https://server1.pearl-developer.com'], // or '*' for all
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));


// Connect to MongoDB
connectDB();

// Routes
const authRoutes  = require('./routes/authRoutes')
const productUploadRoutes = require('./routes/productUploadRoutes');
const shippingAddressRoutes = require('./routes/shippingAddressRoutes');
const feedbackRoutes = require('./routes/feedbackRoutes');

const orderRoutes = require('./routes/orderRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const chatRoutes = require('./routes/chatRoutes');
const employeeRoutes = require('./routes/employeeRoutes')
app.use('/api/auth', authRoutes);
app.use('/api/products', productUploadRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api', shippingAddressRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/staff', employeeRoutes);






// Default route
app.get('/', (req, res) => res.send('API is running...'));

// Start server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

