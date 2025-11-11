const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');

dotenv.config();
const app = express();

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '1500mb' }));
app.use(express.urlencoded({ limit: '1500mb', extended: true }));

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/products', require('./routes/productUploadRoutes'));
app.use('/api/feedback', require('./routes/feedbackRoutes'));
app.use('/api/orders', require('./routes/orderRoutes'));
app.use('/api/categories', require('./routes/categoryRoutes'));
app.use('/api', require('./routes/shippingAddressRoutes'));
app.use('/api/chat', require('./routes/chatRoutes'));
app.use('/api/staff', require('./routes/employeeRoutes'));
app.use('/api/items', require('./routes/item.routes'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/other-categories', require('./routes/otherCategoryRoutes'));
app.use('/api/other-products', require('./routes/otherProduct'));
app.use('/api/company', require('./routes/companyRoutes'));
app.use('/api', require('./routes/gstRoutes'));
app.use('/api/language', require('./routes/translationRoutes'));
app.use('/api/sub-admin', require('./routes/subAdminRoutes'));
app.use('/api/transfers', require('./routes/stockTransferRoutes'));
app.use('/api/returns', require('./routes/returnRoutes'));
app.use('/api/vehicles', require('./routes/vehicleRoutes'));
app.use('/api/shipments', require('./routes/shipment'));
app.use('/api/transport-partners', require('./routes/transportPartnerRoutes'));
app.use('/api/hsn', require('./routes/hsn'));
app.use('/api/fcm', require('./routes/fcmRoutes'));
app.use('/api', require('./routes/pushRoutes'));
app.use('/api', require('./routes/notificationRoutes'));
app.use('/api/billings', require('./routes/billingRoutes'));
app.use('/api/machines', require('./routes/machineRoutes'));
app.use('/api/operator', require('./routes/operatorRoutes'));
app.use('/api',require('./routes/testRoute'));
const notificationRoutes = require("./routes/TestnotificationRoutes");
app.use("/api/notifications", notificationRoutes);

// Default route
app.get('/', (req, res) => res.send('API is running...'));
app.post('/api/test', (req, res) => res.send('Hello from API'));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[REQUEST] ${req.method} ${req.url} - Body:`, req.body);
  next();
});

// Start server after DB connection

const PORT = process.env.PORT || 8080;

connectDB()
  .then(() => {
    console.log("✅ Database connected successfully");
 app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

  })
  .catch(err => {
    console.error("❌ DB connection failed:", err.message);
    process.exit(1);
  });


console.log("TRANSLATION_API_KEY:", process.env.TRANSLATION_API_KEY);