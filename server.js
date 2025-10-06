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
  origin: '*', // Allow all origins
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ limit: '500mb', extended: true }));


// Connect to MongoDB
connectDB();
// Kill switch route BEFORE middleware



// Routes
const authRoutes  = require('./routes/authRoutes')
const productUploadRoutes = require('./routes/productUploadRoutes');
const shippingAddressRoutes = require('./routes/shippingAddressRoutes');
const feedbackRoutes = require('./routes/feedbackRoutes');
const adminRoutes = require('./routes/admin');
const translationRoutes = require('./routes/translationRoutes');
const returnRoutes = require('./routes/returnRoutes');
const vehicleRoutes = require('./routes/vehicleRoutes');
const orderRoutes = require('./routes/orderRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const chatRoutes = require('./routes/chatRoutes');
const employeeRoutes = require('./routes/employeeRoutes')
const itemsRoutes = require('./routes/item.routes')
const otherCategoryRoutes = require('./routes/otherCategoryRoutes'); 
const otherProductRoutes = require('./routes/otherProduct');
const companyRoutes = require('./routes/companyRoutes');
const gstRoutes = require('./routes/gstRoutes');
const subAdminRoutes = require('./routes/subAdminRoutes');
const stockTransferRoutes = require('./routes/stockTransferRoutes'); 
const ShipmentRoutes = require('./routes/shipment');
const transportPartnerRoutes = require('./routes/transportPartnerRoutes');
const hsnRoutes = require("./routes/hsn");
const fcmRoutes = require('./routes/fcmRoutes'); 
const notificationRoutes = require('./routes/notificationRoutes');
const pushRoutes = require('./routes/pushRoutes');
const BillingRoutes = require('./routes/billingRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/products', productUploadRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api', shippingAddressRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/staff', employeeRoutes);
app.use('/api/items', itemsRoutes);
app.use('/api/admin',adminRoutes);
app.use('/api/other-categories', otherCategoryRoutes);
app.use('/api/other-products', otherProductRoutes);
app.use('/api/company', companyRoutes);
app.use('/api', gstRoutes);    
app.use('/api/language', translationRoutes);
app.use('/api/sub-admin', subAdminRoutes);
app.use('/api/transfers', stockTransferRoutes);
app.use('/api/returns', returnRoutes);
app.use("/api/vehicles", vehicleRoutes);
app.use('/api/shipments', ShipmentRoutes);
app.use('/api/transport-partners', transportPartnerRoutes);
app.use("/api/hsn", hsnRoutes);
app.use('/api/fcm', fcmRoutes);
app.use('/api', pushRoutes);
app.use('/api', notificationRoutes);
app.use('/api/billings', BillingRoutes);






// Default route
app.get('/', (req, res) => res.send('API is running...'));

// Optional request logging middleware
app.use((req, res, next) => {
  console.log(`[REQUEST] ${req.method} ${req.url} - Body:`, req.body);
  next();
});

// Start server immediately
const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);

  // Connect to DB asynchronously after server starts
  connectDB()
    .then(() => console.log("✅ Database connected"))
    .catch(err => console.error("❌ DB connection failed:", err.message));
});

// Example: Access translation API key safely
console.log("TRANSLATION_API_KEY:", process.env.TRANSLATION_API_KEY);



